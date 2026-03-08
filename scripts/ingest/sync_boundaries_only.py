#!/usr/bin/env python3

import json
import math
import re
import tempfile
import unicodedata
from pathlib import Path
from urllib.request import urlopen

ROOT = Path(__file__).resolve().parents[2]
BOOTSTRAP_PATH = ROOT / "data" / "generated" / "politiclear-cache.json"
OSI_CONSTITUENCY_GEOJSON_URL = (
    "https://data-osi.opendata.arcgis.com/api/download/v1/items/"
    "a37ad6a3a6ff47e4a5a0ff313b418448/geojson?layers=0"
)


def slugify(value):
    normalized = (
        unicodedata.normalize("NFD", str(value or ""))
        .encode("ascii", "ignore")
        .decode("ascii")
        .lower()
    )
    return re.sub(r"[^a-z0-9]+", "-", normalized).strip("-")


def clean_text(value):
    return re.sub(r"\s+", " ", str(value or "")).strip()


def constituency_boundary_name(value):
    return re.sub(r"\s+\(\d+\)\s*$", "", clean_text(value)).strip()


def normalize_constituency_name(value):
    return slugify(constituency_boundary_name(value))


def geometry_to_multipolygon(geometry):
    geometry_type = clean_text((geometry or {}).get("type"))
    coordinates = (geometry or {}).get("coordinates") or []
    if geometry_type == "Polygon":
      return [coordinates]
    if geometry_type == "MultiPolygon":
      return coordinates
    return []


def perpendicular_distance(point, start, end):
    if start == end:
        return math.dist(point, start)
    numerator = abs(
        (end[1] - start[1]) * point[0]
        - (end[0] - start[0]) * point[1]
        + end[0] * start[1]
        - end[1] * start[0]
    )
    denominator = math.sqrt((end[1] - start[1]) ** 2 + (end[0] - start[0]) ** 2)
    return numerator / denominator if denominator else 0


def simplify_points(points, tolerance):
    if len(points) <= 2:
        return points
    max_distance = 0
    split_index = 0
    for index in range(1, len(points) - 1):
        distance = perpendicular_distance(points[index], points[0], points[-1])
        if distance > max_distance:
            max_distance = distance
            split_index = index
    if max_distance <= tolerance:
        return [points[0], points[-1]]
    left = simplify_points(points[: split_index + 1], tolerance)
    right = simplify_points(points[split_index:], tolerance)
    return left[:-1] + right


def simplify_ring(ring, tolerance=850):
    if len(ring) < 4:
        return []
    open_points = [point[:2] for point in ring[:-1]]
    simplified = simplify_points(open_points, tolerance)
    if len(simplified) < 3:
        simplified = open_points[: min(len(open_points), 3)]
    closed_ring = [[int(round(point[0])), int(round(point[1]))] for point in simplified]
    if closed_ring[0] != closed_ring[-1]:
        closed_ring.append(closed_ring[0])
    return closed_ring if len(closed_ring) >= 4 else []


def update_bbox(bbox, point):
    bbox["minX"] = min(bbox["minX"], point[0])
    bbox["minY"] = min(bbox["minY"], point[1])
    bbox["maxX"] = max(bbox["maxX"], point[0])
    bbox["maxY"] = max(bbox["maxY"], point[1])


def build_boundary_lookup():
    payload = json.loads(urlopen(OSI_CONSTITUENCY_GEOJSON_URL).read().decode("utf-8"))
    grouped = {}

    for feature in payload.get("features", []):
        properties = feature.get("properties") or {}
        name = constituency_boundary_name(properties.get("ENG_NAME_VALUE"))
        boundary_id = clean_text(properties.get("BDY_ID"))
        if not name or not boundary_id:
            continue

        key = normalize_constituency_name(name)
        entry = grouped.setdefault(
            key,
            {
                "boundaryId": boundary_id,
                "bbox": {
                    "maxX": float("-inf"),
                    "maxY": float("-inf"),
                    "minX": float("inf"),
                    "minY": float("inf"),
                },
                "coordinates": [],
                "id": key,
                "name": name,
            },
        )

        for polygon in geometry_to_multipolygon(feature.get("geometry")):
            simplified_polygon = []
            for ring in polygon:
                simplified_ring = simplify_ring(ring)
                if not simplified_ring:
                    continue
                simplified_polygon.append(simplified_ring)
                for point in simplified_ring[:-1]:
                    update_bbox(entry["bbox"], point)
            if simplified_polygon:
                entry["coordinates"].append(simplified_polygon)

    lookup = {}
    for key, entry in grouped.items():
        bbox = entry["bbox"]
        if not entry["coordinates"] or bbox["minX"] == float("inf"):
            continue
        centroid = {
            "x": int(round((bbox["minX"] + bbox["maxX"]) / 2)),
            "y": int(round((bbox["minY"] + bbox["maxY"]) / 2)),
        }
        lookup[key] = {
            "bbox": bbox,
            "boundary": {"coordinates": entry["coordinates"], "type": "MultiPolygon"},
            "centroid": centroid,
            "id": entry["id"],
            "mapLabelPoint": centroid,
            "name": entry["name"],
        }

    return lookup


def main():
    bootstrap = json.loads(BOOTSTRAP_PATH.read_text())
    boundary_lookup = build_boundary_lookup()

    updated = 0
    for constituency in bootstrap.get("constituencies", []):
        boundary = boundary_lookup.get(normalize_constituency_name(constituency.get("name")))
        if not boundary:
            continue
        constituency["bbox"] = boundary["bbox"]
        constituency["boundary"] = boundary["boundary"]
        constituency["centroid"] = boundary["centroid"]
        constituency["mapLabelPoint"] = boundary["mapLabelPoint"]
        updated += 1

    BOOTSTRAP_PATH.write_text(json.dumps(bootstrap, indent=2))
    print(json.dumps({"updatedConstituencies": updated, "path": str(BOOTSTRAP_PATH)}, indent=2))


if __name__ == "__main__":
    main()
