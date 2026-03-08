#!/usr/bin/env python3

import html
import json
import re
import shutil
import subprocess
import time
import tempfile
import unicodedata
from collections import Counter
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import date, datetime, timezone
from pathlib import Path
from urllib.parse import quote

ROOT = Path(__file__).resolve().parents[2]
OUTPUT_DIR = ROOT / "data" / "generated"
BOOTSTRAP_PATH = OUTPUT_DIR / "politiclear-cache.json"
DETAILS_PATH = OUTPUT_DIR / "politiclear-evidence.json"
PORTRAITS_DIR = OUTPUT_DIR / "portraits"

TODAY = date.today().isoformat()
NOW = datetime.now(timezone.utc).isoformat()
CURRENT_DAIL_NO = "34"
CURRENT_DAIL_START = "2024-11-29"
OIREACHTAS_API_BASE = "https://api.oireachtas.ie/v1"
OSI_CONSTITUENCY_GEOJSON_URL = (
    "https://data-osi.opendata.arcgis.com/api/download/v1/items/"
    "a37ad6a3a6ff47e4a5a0ff313b418448/geojson?layers=0"
)
GENERAL_ELECTION_RESULTS_PDF_URL = (
    "https://data.oireachtas.ie/ie/oireachtas/electoralProcess/electionResults/dail/2025/"
    "2025-04-02_34th-dail-general-election-results_en.pdf"
)
PROFILE_URL_TEMPLATE = "https://www.oireachtas.ie/en/members/member/{}"
IMAGE_URL_TEMPLATE = (
    "https://data.oireachtas.ie/ie/oireachtas/member/id/{}/image/large"
)

UNKNOWN_STANCE = "No verified source yet"
UNKNOWN_SUMMARY = (
    "Politiclear does not have a verified issue summary for this row yet."
)
PARTY_LINKED_STANCE = "Party-linked source attached"
DEFAULT_STALE_AFTER_DAYS = 2
LOOKUP_MODES = ["constituency", "town", "address", "eircode"]
PROFILE_KIND_CURRENT_REPRESENTATIVE = "currentRepresentative"
PROFILE_KIND_ELECTION_CANDIDATE = "electionCandidate"
PARTY_ABBREVIATION_LOOKUP = {
    "100%.R.": "100% Redress",
    "100%R": "100% Redress",
    "Ant": "Aontú",
    "C.P.O.I.": "Communist Party of Ireland",
    "CPOI": "Communist Party of Ireland",
    "F.F.": "Fianna Fáil",
    "FF": "Fianna Fáil",
    "F.G.": "Fine Gael",
    "FG": "Fine Gael",
    "Grn": "Green Party",
    "Grn.": "Green Party",
    "I.4.C.": "Independent for Change",
    "I4C": "Independent for Change",
    "I.F.": "Ireland First",
    "IF": "Ireland First",
    "I.F.P.": "Irish Freedom Party",
    "IFP": "Irish Freedom Party",
    "Ind.I.": "Independent Ireland",
    "Ind.I": "Independent Ireland",
    "Lab": "Labour Party",
    "Lab.": "Labour Party",
    "L.R.": "Liberty Republic",
    "LR": "Liberty Republic",
    "Non-P": "Independent",
    "Non-P.": "Independent",
    "P.A.W.": "Party of Animal Welfare",
    "PAW": "Party of Animal Welfare",
    "P.B.P.": "People Before Profit-Solidarity",
    "PBP": "People Before Profit-Solidarity",
    "R.M.L.": "Right to Change / Rural Ireland",
    "RML": "Right to Change / Rural Ireland",
    "R.T.C.": "Right to Change",
    "RTC": "Right to Change",
    "S.D.": "Social Democrats",
    "SD": "Social Democrats",
    "S.F.": "Sinn Féin",
    "SF": "Sinn Féin",
    "T.I.P.": "The Irish People",
    "TIP": "The Irish People",
    "T.N.P.": "The National Party",
    "TNP": "The National Party",
}
ISSUE_KEYWORDS = {
    "housing": [
        "housing",
        "urban development",
        "planning",
        "tenant",
        "rental",
        "rent",
        "homeless",
        "building projects",
        "vacant",
    ],
    "healthcare": [
        "health",
        "hospital",
        "hse",
        "medical",
        "patient",
        "ambulance",
        "disability",
        "mental health",
        "care",
    ],
    "cost-of-living": [
        "social welfare",
        "pension",
        "tax",
        "cost of living",
        "prices",
        "inflation",
        "wages",
        "household",
        "benefits",
        "energy costs",
        "state savings",
    ],
    "transport": [
        "transport",
        "traffic",
        "road",
        "rail",
        "bus",
        "aviation",
        "air safety",
        "electric vehicles",
        "cycling",
        "active travel",
    ],
    "climate": [
        "climate",
        "environment",
        "emissions",
        "renewable",
        "sustainability",
        "carbon",
        "flood",
        "biodiversity",
    ],
    "rural-services": [
        "rural",
        "fisheries",
        "agriculture",
        "farming",
        "regional",
        "post office",
        "broadband",
        "connectivity",
        "coastal",
    ],
    "education": [
        "school",
        "education",
        "student",
        "university",
        "college",
        "skills",
        "special educational needs",
        "school meals",
        "school facilities",
        "youth services",
    ],
    "governance": [
        "cabinet",
        "legislative",
        "legislation",
        "committee",
        "departmental policies",
        "departmental strategies",
        "departmental data",
        "administration",
        "public sector",
        "justice",
        "elections",
        "reform",
    ],
}
ISSUE_BRIEF_TOPICS = {
    "housing": "housing supply and affordability",
    "healthcare": "healthcare access and service delivery",
    "cost-of-living": "household costs and income pressure",
    "transport": "transport, roads, and local mobility",
    "climate": "climate and environmental commitments",
    "rural-services": "rural access and local services",
    "education": "schools, skills, and student supports",
    "governance": "transparency, accountability, and reform",
}


def curl_text(url, retries=3):
    last_error = None

    for attempt in range(retries):
        try:
            result = subprocess.run(
                [
                    "curl",
                    "-L",
                    "--silent",
                    "--show-error",
                    "--max-time",
                    "45",
                    "--retry",
                    "2",
                    "--retry-delay",
                    "1",
                    "--user-agent",
                    "PoliticlearIngest/2.0",
                    url,
                ],
                check=True,
                capture_output=True,
                text=True,
            )
            return result.stdout
        except subprocess.CalledProcessError as error:
            last_error = error
            if attempt < retries - 1:
                time.sleep(1 + attempt)

    raise RuntimeError(f"Failed to fetch {url}: {last_error}")


def curl_json(url, retries=3):
    return json.loads(curl_text(url, retries=retries))


def curl_file(url, destination, retries=3, referer=None, accept=None):
    last_error = None

    for attempt in range(retries):
        try:
            command = [
                "curl",
                "-L",
                "--silent",
                "--show-error",
                "--max-time",
                "120",
                "--retry",
                "2",
                "--retry-delay",
                "1",
                "--user-agent",
                "PoliticlearIngest/2.0",
            ]
            if referer:
                command.extend(["--referer", referer])
            if accept:
                command.extend(["-H", f"Accept: {accept}"])
            command.extend([url, "-o", str(destination)])
            subprocess.run(
                command,
                check=True,
                capture_output=True,
                text=True,
            )
            return
        except subprocess.CalledProcessError as error:
            last_error = error
            if attempt < retries - 1:
                time.sleep(1 + attempt)

    raise RuntimeError(f"Failed to fetch {url}: {last_error}")


def api_get(path, **params):
    query = "&".join(
        f"{quote(str(key))}={quote(str(value), safe='/:')}"
        for key, value in params.items()
        if value not in (None, "")
    )
    url = f"{OIREACHTAS_API_BASE}{path}"
    if query:
        url = f"{url}?{query}"
    return curl_json(url)


def slugify(value):
    normalized = unicodedata.normalize("NFD", value or "")
    normalized = "".join(
        char for char in normalized if unicodedata.category(char) != "Mn"
    )
    normalized = normalized.lower()
    normalized = re.sub(r"[^a-z0-9]+", "-", normalized)
    return normalized.strip("-")


def constituency_boundary_name(value):
    cleaned = clean_text(value)
    return re.sub(r"\s+\(\d+\)\s*$", "", cleaned).strip()


def clean_text(value):
    if value is None:
        return ""
    return re.sub(r"\s+", " ", html.unescape(str(value))).strip()


def normalize_constituency_name(value):
    return slugify(constituency_boundary_name(value))


def strip_data_domain(value):
    cleaned = clean_text(value)
    return cleaned.replace("https://data.oireachtas.ie", "", 1)


def oireachtas_url(value):
    cleaned = clean_text(value)
    if not cleaned:
        return None
    if cleaned.startswith("http://") or cleaned.startswith("https://"):
        return cleaned
    return f"https://data.oireachtas.ie{cleaned}"


def make_source(label, url, note, source_type="official"):
    return {
        "label": label,
        "lastUpdated": TODAY,
        "note": note,
        "type": source_type,
        "url": url,
    }


def dedupe_sources(sources):
    deduped = {}
    for source in sources:
        if not source or not source.get("label") or not source.get("url"):
            continue
        deduped[f"{source['label']}::{source['url']}"] = source
    return list(deduped.values())


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
        return ((point[0] - start[0]) ** 2 + (point[1] - start[1]) ** 2) ** 0.5

    numerator = abs(
        (end[1] - start[1]) * point[0]
        - (end[0] - start[0]) * point[1]
        + end[0] * start[1]
        - end[1] * start[0]
    )
    denominator = ((end[1] - start[1]) ** 2 + (end[0] - start[0]) ** 2) ** 0.5
    return numerator / denominator


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

    closed_ring = [
        [int(round(point[0])), int(round(point[1]))] for point in simplified
    ]
    if closed_ring[0] != closed_ring[-1]:
        closed_ring.append(closed_ring[0])

    return closed_ring if len(closed_ring) >= 4 else []


def update_bbox(bbox, point):
    bbox["minX"] = min(bbox["minX"], point[0])
    bbox["minY"] = min(bbox["minY"], point[1])
    bbox["maxX"] = max(bbox["maxX"], point[0])
    bbox["maxY"] = max(bbox["maxY"], point[1])


def build_boundary_lookup():
    with tempfile.NamedTemporaryFile(suffix=".geojson", delete=False) as temp_file:
        temp_path = Path(temp_file.name)

    try:
        curl_file(OSI_CONSTITUENCY_GEOJSON_URL, temp_path)
        payload = json.loads(temp_path.read_text())
    finally:
        temp_path.unlink(missing_ok=True)
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

                for point in simplified_ring:
                    update_bbox(entry["bbox"], point)

                simplified_polygon.append(simplified_ring)

            if simplified_polygon:
                entry["coordinates"].append(simplified_polygon)

    finalized = {}

    for key, entry in grouped.items():
        bbox = entry["bbox"]

        if not entry["coordinates"] or bbox["minX"] == float("inf"):
            continue

        centroid = {
            "x": int(round((bbox["minX"] + bbox["maxX"]) / 2)),
            "y": int(round((bbox["minY"] + bbox["maxY"]) / 2)),
        }
        finalized[key] = {
            "bbox": {
                "maxX": int(round(bbox["maxX"])),
                "maxY": int(round(bbox["maxY"])),
                "minX": int(round(bbox["minX"])),
                "minY": int(round(bbox["minY"])),
            },
            "boundary": {
                "coordinates": entry["coordinates"],
                "crs": "EPSG:2157",
                "type": "MultiPolygon",
            },
            "centroid": centroid,
            "id": key,
            "mapLabelPoint": centroid,
            "name": entry["name"],
        }

    return finalized


def parse_wp_page(slug):
    data = curl_json(f"https://www.electoralcommission.ie/wp-json/wp/v2/pages?slug={slug}")

    if not data:
        return None

    page = data[0]
    return {
        "date": page.get("date", "")[:10],
        "link": page.get("link"),
        "modified": page.get("modified", "")[:10],
        "title": clean_text(page.get("title", {}).get("rendered", "")),
    }


def build_issue_catalog():
    return [
        {
            "id": "housing",
            "label": "Housing",
            "prompt": "What has this public figure said or done on housing supply and affordability?",
        },
        {
            "id": "healthcare",
            "label": "Healthcare",
            "prompt": "How does the public record frame healthcare access and service delivery?",
        },
        {
            "id": "cost-of-living",
            "label": "Cost of living",
            "prompt": "What signals exist on prices, household costs, and income pressure?",
        },
        {
            "id": "transport",
            "label": "Transport",
            "prompt": "How does this profile approach local mobility, roads, and public transport?",
        },
        {
            "id": "climate",
            "label": "Climate",
            "prompt": "What is on record about climate and environmental commitments?",
        },
        {
            "id": "rural-services",
            "label": "Rural services",
            "prompt": "What is the public record on rural access, connectivity, and local services?",
        },
        {
            "id": "education",
            "label": "Education",
            "prompt": "What has been highlighted on schools, skills, or student supports?",
        },
        {
            "id": "governance",
            "label": "Governance",
            "prompt": "What is on record around transparency, accountability, and parliamentary reform?",
        },
    ]


def build_official_resources():
    resource_specs = [
        (
            "what-constituency-am-i-in",
            "What constituency am I in?",
            "Official Electoral Commission constituency lookup.",
        ),
        (
            "who-are-my-tds",
            "Who are my TDs?",
            "Official Electoral Commission representative lookup.",
        ),
        (
            "register-to-vote",
            "Register to vote",
            "Registration guidance and next actions.",
        ),
        (
            "check-the-register",
            "Check the register",
            "Official register checker landing page.",
        ),
        (
            "voter-eligibility",
            "Voter eligibility",
            "Official nationality and election eligibility rules.",
        ),
        (
            "where-to-vote",
            "Where to vote",
            "Official polling-location guidance.",
        ),
    ]

    resources = []
    resource_lookup = {}

    for slug, fallback_title, note in resource_specs:
        page = parse_wp_page(slug)
        label = page["title"] if page else fallback_title
        url = page["link"] if page else f"https://www.electoralcommission.ie/{slug}/"
        last_updated = page["modified"] if page and page.get("modified") else TODAY
        source = make_source(label, url, note)
        source["lastUpdated"] = last_updated
        resources.append(source)
        resource_lookup[slug] = source

    voting_system_source = make_source(
        "Ireland's voting system",
        "https://www.electoralcommission.ie/irelands-voting-system/",
        "Official guide to PR-STV and ballot ranking.",
    )
    party_register_source = make_source(
        "Register of political parties",
        "https://www.electoralcommission.ie/publications/register-of-political-parties/",
        "Registered party list and official publication.",
    )
    oireachtas_open_data_source = make_source(
        "Houses of the Oireachtas open data",
        "https://www.oireachtas.ie/en/open-data/",
        "Official Oireachtas open data landing page.",
        "oireachtas",
    )
    osi_boundaries_source = make_source(
        "OSi constituency boundaries 2023",
        "https://data-osi.opendata.arcgis.com/datasets/osi::constituency-boundaries-ungeneralised-national-electoral-boundaries-2023",
        "Boundary dataset for secondary map exploration.",
    )
    cso_source = make_source(
        "CSO data portal",
        "https://data.cso.ie/",
        "Official statistical context for local demographics and regions.",
    )

    resources.extend(
        [
            voting_system_source,
            party_register_source,
            oireachtas_open_data_source,
            osi_boundaries_source,
            cso_source,
        ]
    )

    resource_lookup["voting-system"] = voting_system_source
    resource_lookup["party-register"] = party_register_source
    resource_lookup["oireachtas-open-data"] = oireachtas_open_data_source
    resource_lookup["osi-boundaries"] = osi_boundaries_source
    resource_lookup["cso"] = cso_source

    return dedupe_sources(resources), resource_lookup


def party_site_for(party_name):
    lookup = {
        "Aontú": "https://aontu.ie/",
        "Communist Party of Ireland": "https://communistparty.ie/",
        "Fine Gael": "https://www.finegael.ie/",
        "Fianna Fáil": "https://www.fiannafail.ie/",
        "Green Party": "https://www.greenparty.ie/",
        "Independent Ireland": "https://independentireland.ie/",
        "Irish Freedom Party": "https://irishfreedom.ie/",
        "Labour Party": "https://labour.ie/",
        "People Before Profit-Solidarity": "https://www.pbp.ie/",
        "Social Democrats": "https://www.socialdemocrats.ie/",
        "Sinn Féin": "https://vote.sinnfein.ie/",
        "The Irish People": "https://theirishpeople.org/",
        "The National Party": "https://nationalparty.ie/",
    }
    return lookup.get(party_name)


def normalize_party_name(value):
    cleaned = clean_text(value)
    return PARTY_ABBREVIATION_LOOKUP.get(cleaned, cleaned)


def ballot_name_to_display_name(value):
    cleaned = clean_text(value).lstrip("*").strip()
    if "," not in cleaned:
        return cleaned
    surname, given_names = [part.strip() for part in cleaned.split(",", 1)]
    return clean_text(f"{given_names} {surname}")


def fetch_general_election_results_text():
    with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as temp_file:
        temp_path = Path(temp_file.name)

    try:
        curl_file(GENERAL_ELECTION_RESULTS_PDF_URL, temp_path)
        pdftotext_path = shutil.which("pdftotext")
        if not pdftotext_path:
            raise RuntimeError(
                "pdftotext is required for deterministic election-candidate parsing. "
                "Install Poppler (for example `brew install poppler` or "
                "`sudo apt-get install poppler-utils`) before running the ingest."
            )

        result = subprocess.run(
            [pdftotext_path, "-layout", str(temp_path), "-"],
            check=True,
            capture_output=True,
            text=True,
        )
        return result.stdout
    finally:
        temp_path.unlink(missing_ok=True)


def build_candidate_profile_source(constituency_name, ballot_name):
    candidate_slug = slugify(ballot_name) or "candidate"
    return make_source(
        f"{ballot_name_to_display_name(ballot_name)} ballot record",
        f"{GENERAL_ELECTION_RESULTS_PDF_URL}#candidate={candidate_slug}",
        (
            f"Official 2024 general election ballot record for {constituency_name} "
            "from the Houses of the Oireachtas results publication."
        ),
    )


def build_party_links_for_name(party_name, party_register_source):
    links = [party_register_source]
    party_site = party_site_for(party_name)

    if party_site:
        links.insert(
            0,
            make_source(
                party_name,
                party_site,
                "Official party site.",
                "party",
            ),
        )

    return dedupe_sources(links)


def parse_election_candidates(constituencies, official_lookup):
    pdf_text = fetch_general_election_results_text()
    raw_lines = pdf_text.splitlines()
    cleaned_lines = [clean_text(line) for line in raw_lines]
    table_indices = [
        index for index, line in enumerate(cleaned_lines) if line.startswith("Table 1:")
    ]
    cutoff_index = table_indices[-1] if table_indices else len(cleaned_lines)
    raw_lines = raw_lines[:cutoff_index]
    cleaned_lines = cleaned_lines[:cutoff_index]
    constituency_lookup = {
        normalize_constituency_name(constituency["name"]): constituency
        for constituency in constituencies
    }
    election_candidates = []
    seen_ids = set()
    current_constituency = None
    pending_gender = None

    for raw_line, cleaned_line in zip(raw_lines, cleaned_lines):
        matched_constituency = constituency_lookup.get(
            normalize_constituency_name(cleaned_line)
        )
        if matched_constituency:
            current_constituency = matched_constituency
            pending_gender = None
            continue

        if not current_constituency:
            continue

        if cleaned_line in {"F", "M"}:
            pending_gender = cleaned_line
            continue

        match = re.match(
            r"^\s*(\*)?\s*(.+?)\s+\(([^)]+)\)\s+(?:([MF])\s+)?([\d,]+)\b",
            raw_line,
        )
        if not match:
            continue

        ballot_name = clean_text(match.group(2))
        candidate = {
            "ballotName": ballot_name,
            "constituencyId": current_constituency["id"],
            "constituencyName": current_constituency["name"],
            "firstPreferenceVotes": int(match.group(5).replace(",", "")),
            "gender": clean_text(match.group(4) or pending_gender),
            "isOutgoingMember": bool(match.group(1)),
            "party": normalize_party_name(match.group(3)),
            "partyCode": clean_text(match.group(3)),
            "profileSource": build_candidate_profile_source(
                current_constituency["name"],
                ballot_name,
            ),
        }
        pending_gender = None
        candidate["name"] = ballot_name_to_display_name(candidate["ballotName"])
        candidate["id"] = (
            f"{slugify(candidate['name'])}-"
            f"{candidate['constituencyId']}-"
            "election-candidate"
        )

        if candidate["id"] in seen_ids:
            continue

        election_candidates.append(candidate)
        seen_ids.add(candidate["id"])

    return election_candidates


def fetch_current_dail_members():
    payload = api_get(
        "/members",
        chamber="dail",
        house_no=CURRENT_DAIL_NO,
        limit=250,
        date_start=CURRENT_DAIL_START,
        date_end=TODAY,
    )

    members = []

    for result in payload.get("results", []):
        member = result.get("member", {})
        current_membership = next(
            (
                membership["membership"]
                for membership in member.get("memberships", [])
                if membership.get("membership", {})
                .get("house", {})
                .get("houseCode")
                == "dail"
                and str(
                    membership.get("membership", {})
                    .get("house", {})
                    .get("houseNo")
                )
                == CURRENT_DAIL_NO
            ),
            None,
        )

        if not current_membership:
            continue

        represent = (
            (current_membership.get("represents") or [{}])[0].get("represent", {})
        )
        party = ((current_membership.get("parties") or [{}])[0].get("party", {}))
        member_code = clean_text(member.get("memberCode"))
        member_uri = oireachtas_url(member.get("uri"))

        members.append(
            {
                "committeesRaw": current_membership.get("committees", []),
                "constituencyCode": clean_text(represent.get("representCode")),
                "constituencyName": clean_text(represent.get("showAs")),
                "constituencyUri": oireachtas_url(represent.get("uri")),
                "currentMembershipRaw": current_membership,
                "firstName": clean_text(member.get("firstName")),
                "fullName": clean_text(member.get("fullName")),
                "houseCode": current_membership.get("house", {}).get("houseCode"),
                "houseNo": str(current_membership.get("house", {}).get("houseNo")),
                "imageUrl": IMAGE_URL_TEMPLATE.format(quote(member_code, safe="")),
                "memberApiPath": strip_data_domain(member.get("uri")),
                "memberCode": member_code,
                "memberUri": member_uri,
                "name": clean_text(member.get("showAs") or member.get("fullName")),
                "officesRaw": current_membership.get("offices", []),
                "party": clean_text(party.get("showAs")) or "Independent",
                "partyCode": clean_text(party.get("partyCode")) or "Independent",
                "partyUri": oireachtas_url(party.get("uri")),
                "profileUrl": PROFILE_URL_TEMPLATE.format(quote(member_code, safe="")),
                "profileSource": make_source(
                    "Oireachtas member profile",
                    PROFILE_URL_TEMPLATE.format(quote(member_code, safe="")),
                    "Official current TD profile.",
                    "oireachtas",
                ),
            }
        )

    members.sort(key=lambda item: (item["constituencyName"], item["name"]))
    return members


def build_parties(members, party_register_source, extra_party_names=None):
    counts = Counter(member["party"] for member in members)

    for party_name in extra_party_names or []:
        counts.setdefault(party_name, 0)

    parties = []

    for party_name, member_count in sorted(counts.items(), key=lambda item: item[0]):
        party_id = slugify(party_name) or "independent"
        parties.append(
            {
                "id": party_id,
                "memberCount": member_count,
                "name": party_name,
                "officialLinks": build_party_links_for_name(
                    party_name,
                    party_register_source,
                ),
                "shortLabel": party_name,
            }
        )

    return parties


def build_constituencies(members, official_lookup, boundary_lookup):
    seat_counts = Counter(member["constituencyName"] for member in members)
    local_issue_lookup = {
        "Dublin Bay South": ["Housing delivery", "Bus and active travel", "Healthcare access"],
        "Donegal": ["Regional healthcare", "Fisheries", "Cross-border connectivity"],
        "Galway West": [
            "Housing affordability",
            "Regional transport",
            "University and skills pipeline",
        ],
        "Kerry": ["Rural roads", "Tourism and jobs", "Coastal resilience"],
    }

    constituencies = []

    for name in sorted(seat_counts.keys()):
        constituency_id = slugify(name)
        boundary = boundary_lookup.get(normalize_constituency_name(name))
        official_links = dedupe_sources(
            [
                official_lookup["what-constituency-am-i-in"],
                official_lookup["who-are-my-tds"],
                official_lookup["osi-boundaries"],
            ]
        )

        constituencies.append(
            {
                "bbox": boundary.get("bbox") if boundary else None,
                "boundary": boundary.get("boundary") if boundary else None,
                "centroid": boundary.get("centroid") if boundary else None,
                "id": constituency_id,
                "name": name,
                "mapLabelPoint": boundary.get("mapLabelPoint") if boundary else None,
                "officialLinks": official_links,
                "searchTerms": [name, name.replace("-", " ")],
                "seats": seat_counts.get(name, 0),
                "summary": (
                    f"{name} constituency profile synced from official Oireachtas and "
                    "Electoral Commission sources."
                ),
                "localIssues": local_issue_lookup.get(
                    name,
                    ["Public services", "Housing", "Local representation"],
                ),
                "updatedAt": TODAY,
            }
        )

    return constituencies


def build_unknown_issue_rows(issue_catalog, member_name, source):
    return [
        {
            "coverageStatus": "unknown",
            "evidenceLabel": UNKNOWN_STANCE,
            "issueId": issue["id"],
            "label": issue["label"],
            "source": source,
            "stance": UNKNOWN_STANCE,
            "summary": (
                f"{member_name} does not yet have a verified "
                f"{issue['label'].lower()} brief in Politiclear."
            ),
        }
        for issue in issue_catalog
    ]


def build_party_linked_issue_rows(issue_catalog, candidate_name, party_name, source):
    return [
        {
            "coverageStatus": "partyLinked",
            "evidenceLabel": source["label"],
            "issueId": issue["id"],
            "label": issue["label"],
            "source": source,
            "stance": PARTY_LINKED_STANCE,
            "summary": (
                f"Politiclear is carrying a party-level brief on "
                f"{ISSUE_BRIEF_TOPICS.get(issue['id'], issue['label'].lower())} "
                f"for {candidate_name} via official {party_name} material until a "
                "candidate-specific source is attached."
            ),
        }
        for issue in issue_catalog
    ]


def build_issue_records(detail):
    records = []

    for question in detail.get("recentQuestions", []):
        records.append(
            {
                "kind": "question",
                "meta": f"{question.get('to', '')} {question.get('answerState', '')}",
                "source": question.get("source"),
                "title": question.get("title") or "Parliamentary question",
            }
        )

    for debate in detail.get("recentDebates", []):
        records.append(
            {
                "kind": "debate",
                "meta": debate.get("debateType", ""),
                "source": debate.get("source"),
                "title": debate.get("title") or "Debate",
            }
        )

    for vote in detail.get("recentVotes", []):
        records.append(
            {
                "kind": "vote",
                "meta": vote.get("resultLabel", ""),
                "source": vote.get("source"),
                "title": vote.get("title") or "Vote",
            }
        )

    for committee in detail.get("committees", []):
        records.append(
            {
                "kind": "committee",
                "meta": f"{committee.get('role', '')} {committee.get('status', '')}",
                "source": committee.get("source"),
                "title": committee.get("name") or "Committee role",
            }
        )

    for office in detail.get("offices", []):
        records.append(
            {
                "kind": "office",
                "meta": office.get("dateRange", ""),
                "source": office.get("source"),
                "title": office.get("title") or "Office held",
            }
        )

    return records


def score_issue_record(issue_id, record):
    haystack = clean_text(
        f"{record.get('title', '')} {record.get('meta', '')}"
    ).lower()
    score = 0

    for keyword in ISSUE_KEYWORDS.get(issue_id, []):
        if keyword in haystack:
            score += max(1, len(keyword.split()))

    if score > 0 and record.get("kind") == "question":
        score += 1
    if score > 0 and record.get("kind") == "debate":
        score += 1

    return score


def build_issue_stance(issue_label, record):
    title = clean_text(record.get("title") or issue_label)

    if record.get("kind") == "question":
        return f"Raised {title.lower()} through a parliamentary question."
    if record.get("kind") == "debate":
        return f"Has a recent debate record tied to {title.lower()}."
    if record.get("kind") == "vote":
        return f"Has a recent recorded vote linked to {title.lower()}."
    if record.get("kind") == "committee":
        return f"Holds a committee role touching {issue_label.lower()} oversight."
    if record.get("kind") == "office":
        return f"Holds or held an office touching {title.lower()}."

    return UNKNOWN_STANCE


def build_issue_summary(record):
    title = clean_text(record.get("title") or "the public record")
    kind = record.get("kind")

    if kind == "question":
        return f"Politiclear found a recent parliamentary question on {title.lower()}."
    if kind == "debate":
        return f"Politiclear found a recent debate entry on {title.lower()}."
    if kind == "vote":
        return f"Politiclear found a recent vote entry connected to {title.lower()}."
    if kind == "committee":
        return f"Politiclear found an official committee role connected to {title.lower()}."
    if kind == "office":
        return f"Politiclear found an office record connected to {title.lower()}."

    return UNKNOWN_SUMMARY


def build_issue_rows(issue_catalog, member_name, detail):
    issue_rows = []
    records = build_issue_records(detail)

    for issue in issue_catalog:
        matches = [
            (score_issue_record(issue["id"], record), record)
            for record in records
        ]
        matches = [match for match in matches if match[0] > 0 and match[1].get("source")]
        matches.sort(key=lambda item: item[0], reverse=True)

        if not matches:
            issue_rows.append(
                {
                    "coverageStatus": "unknown",
                    "evidenceLabel": UNKNOWN_STANCE,
                    "issueId": issue["id"],
                    "label": issue["label"],
                    "source": None,
                    "stance": UNKNOWN_STANCE,
                    "summary": (
                        f"{member_name} does not yet have a verified "
                        f"{issue['label'].lower()} brief in Politiclear."
                    ),
                }
            )
            continue

        _, record = matches[0]
        issue_rows.append(
            {
                "coverageStatus": "issueLinked",
                "evidenceLabel": record["source"]["label"],
                "issueId": issue["id"],
                "label": issue["label"],
                "source": record["source"],
                "stance": build_issue_stance(issue["label"], record),
                "summary": build_issue_summary(record),
            }
        )

    return issue_rows


def build_issue_coverage(issue_rows):
    coverage = {}

    for row in issue_rows:
        coverage[row["issueId"]] = row.get("coverageStatus") == "issueLinked"

    return coverage


def build_candidate_summary(member, detail, issue_catalog, party_lookup):
    party_links = party_lookup.get(member["party"], {}).get("officialLinks", [])
    official_links = dedupe_sources([member["profileSource"], *party_links[:1]])
    evidence_counts = detail.get("evidenceCounts", {})
    key_issues = detail.get("keyIssues") or build_unknown_issue_rows(
        issue_catalog,
        member["name"],
        member["profileSource"],
    )
    issue_evidence_count = detail.get("issueEvidenceCount", 0)
    issue_coverage_by_id = detail.get("issueCoverageById", {})
    sources = dedupe_sources(
        [member["profileSource"], *party_links, *[issue.get("source") for issue in key_issues]]
    )

    committees_count = evidence_counts.get("committees", 0)
    questions_count = evidence_counts.get("questions", 0)
    debates_count = evidence_counts.get("debates", 0)
    votes_count = evidence_counts.get("votes", 0)

    return {
        "activity": [
            {
                "summary": (
                    "Use the official member profile as the primary public record while "
                    "Politiclear layers in committee, question, debate, and vote evidence."
                ),
                "source": member["profileSource"],
                "title": "Official membership record",
            }
        ],
        "constituencyId": slugify(member["constituencyName"]),
        "constituencyName": member["constituencyName"],
        "coverageNote": detail.get("coverageNote")
        or (
            f"Issue-linked evidence currently covers {issue_evidence_count} of "
            f"{len(issue_catalog)} tracked issues."
        ),
        "evidenceCounts": evidence_counts,
        "evidenceStatus": detail.get("evidenceStatus", "summaryOnly"),
        "id": slugify(member["memberCode"]),
        "imageUrl": member["imageUrl"],
        "portraitPath": member.get("portraitPath"),
        "isIncumbent": True,
        "issueCoverageById": issue_coverage_by_id,
        "issueEvidenceCount": issue_evidence_count,
        "keyIssues": key_issues,
        "lastUpdated": TODAY,
        "memberCode": member["memberCode"],
        "memberUri": member["memberUri"],
        "name": member["name"],
        "officialLinks": official_links,
        "overview": (
            f"Current TD for {member['constituencyName']}. Politiclear has linked "
            f"{committees_count} committee records, {questions_count} recent questions, "
            f"{debates_count} recent debate records, and {votes_count} recent votes. "
            f"Issue-linked evidence is visible for {issue_evidence_count} tracked issues."
        ),
        "party": member["party"],
        "partyId": slugify(member["party"]) or "independent",
        "partyLinks": party_links,
        "profileKind": PROFILE_KIND_CURRENT_REPRESENTATIVE,
        "profileUrl": member["profileUrl"],
        "sourceCount": detail.get("sourceCount", len(sources)),
        "sourceNote": (
            "Issue rows stay visible even when they are still unknown. Follow the source links "
            "before treating any summary as complete."
        ),
        "sourceType": "oireachtas",
        "sources": sources,
        "statusLabel": "Current TD",
        "summary": (
            f"{member['party']} profile for {member['constituencyName']}. "
            f"Issue-linked evidence currently covers {issue_evidence_count} of "
            f"{len(issue_catalog)} tracked issues, alongside {questions_count} questions, "
            f"{debates_count} debates, and {votes_count} votes."
        ),
    }


def build_election_candidate_summary(
    candidate,
    issue_catalog,
    party_lookup,
    current_members_by_merge_key,
):
    merge_key = (
        f"{slugify(candidate['name'])}::{slugify(candidate['constituencyName'])}"
    )
    matched_member = current_members_by_merge_key.get(merge_key)
    party_links = party_lookup.get(candidate["party"], {}).get(
        "officialLinks",
        build_party_links_for_name(candidate["party"], party_lookup["__partyRegister__"]),
    )
    official_links = dedupe_sources(
        [
            candidate["profileSource"],
            *(party_links[:1] if party_links else []),
            matched_member["profileSource"] if matched_member else None,
        ]
    )
    party_issue_source = party_links[0] if party_links else None
    issue_rows = (
        build_party_linked_issue_rows(
            issue_catalog,
            candidate["name"],
            candidate["party"],
            party_issue_source,
        )
        if party_issue_source
        else build_unknown_issue_rows(
            issue_catalog,
            candidate["name"],
            candidate["profileSource"],
        )
    )
    party_issue_count = sum(
        1 for issue in issue_rows if issue.get("coverageStatus") == "partyLinked"
    )
    summary_prefix = (
        "Now serving as a current TD after the 2024 general election."
        if matched_member
        else "This profile currently carries an official ballot record only."
    )
    elected_label = "Elected to the 34th Dáil" if matched_member else "Not elected"

    return {
        "activity": [
            {
                "summary": (
                    f"{summary_prefix} Use the official election results publication as the "
                    "primary source for the full candidate list."
                ),
                "source": candidate["profileSource"],
                "title": "Official ballot record",
            }
        ],
        "constituencyId": candidate["constituencyId"],
        "constituencyName": candidate["constituencyName"],
        "coverageNote": (
            (
                f"Politiclear currently has party-linked briefs for {party_issue_count} of "
                f"{len(issue_catalog)} tracked issues, plus the official 2024 ballot record."
            )
            if party_issue_count
            else (
                "Politiclear currently has the official 2024 ballot record for this profile, "
                "but not a full source-linked parliamentary evidence layer."
            )
        ),
        "electedLabel": elected_label,
        "evidenceCounts": {
            "committees": 0,
            "offices": 0,
            "questions": 0,
            "debates": 0,
            "votes": 0,
        },
        "evidenceCoverage": (
            f"Party-linked coverage on {party_issue_count} topics"
            if party_issue_count
            else "Official ballot record only"
        ),
        "evidenceStatus": "summaryOnly",
        "firstPreferenceVotes": candidate["firstPreferenceVotes"],
        "gender": candidate["gender"],
        "id": candidate["id"],
        "imageUrl": matched_member["imageUrl"] if matched_member else None,
        "imageFallbackLabel": candidate["partyCode"] or candidate["name"][:2],
        "isIncumbent": bool(matched_member),
        "isOutgoingMember": candidate["isOutgoingMember"],
        "issueCoverageById": {issue["id"]: False for issue in issue_catalog},
        "issueEvidenceCount": 0,
        "keyIssues": issue_rows,
        "lastUpdated": TODAY,
        "memberCode": matched_member["memberCode"] if matched_member else None,
        "memberUri": matched_member["memberUri"] if matched_member else None,
        "name": candidate["name"],
        "officialLinks": official_links,
        "overview": (
            f"2024 general election candidate in {candidate['constituencyName']}. "
            f"First-preference vote total: {candidate['firstPreferenceVotes']:,}. "
            f"{summary_prefix}"
        ),
        "party": candidate["party"],
        "partyId": slugify(candidate["party"]) or "independent",
        "partyLinks": party_links,
        "partyCode": candidate["partyCode"],
        "profileKind": PROFILE_KIND_ELECTION_CANDIDATE,
        "profileUrl": matched_member["profileUrl"] if matched_member else None,
        "sourceCount": len(dedupe_sources([candidate["profileSource"], *party_links])),
        "sourceNote": (
            (
                "This candidate card is anchored to the official general election results "
                "publication and official party material."
            )
            if party_issue_count
            else (
                "This candidate card is anchored to the official general election results "
                "publication and party register links."
            )
        ),
        "sourceType": "official",
        "sources": dedupe_sources([candidate["profileSource"], *party_links]),
        "statusLabel": "2024 ballot candidate",
        "summary": (
            f"{candidate['party']} candidate for {candidate['constituencyName']} in the "
            f"2024 general election. First-preference vote total: "
            f"{candidate['firstPreferenceVotes']:,}. {elected_label}."
        ),
    }


def parse_committees(member):
    records = []

    for committee in member.get("committeesRaw", []):
        names = committee.get("committeeName") or []
        english_name = next(
            (clean_text(item.get("nameEn")) for item in reversed(names) if item.get("nameEn")),
            "Committee membership",
        )
        role = clean_text((committee.get("role") or {}).get("title")) or "Member"
        source = make_source(
            english_name,
            oireachtas_url(committee.get("uri")),
            "Official committee membership record.",
            "oireachtas",
        )
        records.append(
            {
                "houseCode": committee.get("houseCode") or member.get("houseCode"),
                "name": english_name,
                "role": role,
                "source": source,
                "status": clean_text(committee.get("mainStatus") or committee.get("status"))
                or "Unknown",
            }
        )

    return records


def parse_offices(member):
    records = []

    for office_entry in member.get("officesRaw", []):
        office = office_entry.get("office", {})
        title = clean_text((office.get("officeName") or {}).get("showAs")) or "Office"
        date_range = office.get("dateRange") or {}
        start = clean_text(date_range.get("start"))
        end = clean_text(date_range.get("end"))
        date_range_label = start or "Unknown start"

        if end:
            date_range_label = f"{date_range_label} to {end}"
        elif start:
            date_range_label = f"{date_range_label} to present"

        records.append(
            {
                "dateRange": date_range_label,
                "source": member["profileSource"],
                "title": title,
            }
        )

    return records


def parse_questions(member):
    payload = api_get(
        "/questions",
        date_start=CURRENT_DAIL_START,
        date_end=TODAY,
        limit=8,
        member_id=member["memberApiPath"],
        show_answers="true",
    )

    records = []

    for result in payload.get("results", []):
        question = result.get("question", {})
        debate_section = question.get("debateSection") or {}
        title = clean_text(debate_section.get("showAs") or question.get("showAs")) or "Parliamentary question"
        question_number = question.get("questionNumber")
        source_url = (
            (debate_section.get("formats") or {}).get("xml", {}).get("uri")
            or oireachtas_url(question.get("uri"))
            or member["profileUrl"]
        )
        records.append(
            {
                "answerState": "Answered" if clean_text(question.get("answerText")) else "Question lodged",
                "date": clean_text(question.get("date")) or TODAY,
                "questionNumber": question_number,
                "source": make_source(
                    f"Parliamentary question {question_number}" if question_number else "Parliamentary question",
                    source_url,
                    "Official Oireachtas parliamentary question record.",
                    "oireachtas",
                ),
                "title": title,
                "to": clean_text((question.get("to") or {}).get("showAs")) or "Unknown",
            }
        )

    return records


def parse_debates(member):
    payload = api_get(
        "/debates",
        chamber="dail",
        date_start=CURRENT_DAIL_START,
        date_end=TODAY,
        limit=5,
        member_id=member["memberApiPath"],
    )

    records = []

    for result in payload.get("results", []):
        debate_record = result.get("debateRecord", {})
        sections = debate_record.get("debateSections") or []
        debate_section = (sections[0] or {}).get("debateSection", {}) if sections else {}
        title = clean_text(debate_section.get("showAs")) or clean_text(debate_record.get("uri")) or "Debate"
        section_formats = debate_section.get("formats") or {}
        record_formats = debate_record.get("formats") or {}
        source_url = (
            (section_formats.get("xml") or {}).get("uri")
            or (record_formats.get("pdf") or {}).get("uri")
            or (record_formats.get("xml") or {}).get("uri")
            or oireachtas_url(debate_record.get("uri"))
            or member["profileUrl"]
        )
        records.append(
            {
                "date": clean_text(debate_record.get("date")) or TODAY,
                "debateType": clean_text(
                    debate_section.get("debateType") or debate_record.get("debateType")
                )
                or "debate",
                "source": make_source(
                    title,
                    source_url,
                    "Official Oireachtas debate record.",
                    "oireachtas",
                ),
                "title": title,
            }
        )

    return records


def parse_votes(member):
    payload = api_get(
        "/votes",
        chamber="dail",
        date_start=CURRENT_DAIL_START,
        date_end=TODAY,
        limit=5,
        member_id=member["memberApiPath"],
    )

    records = []

    for result in payload.get("results", []):
        division = result.get("division", {})
        subject = clean_text((division.get("subject") or {}).get("showAs"))
        debate = clean_text((division.get("debate") or {}).get("showAs"))
        title = subject or debate or clean_text(division.get("voteId")) or "Vote"
        source_url = (
            ((division.get("debate") or {}).get("formats") or {}).get("xml", {}).get("uri")
            or oireachtas_url(division.get("uri"))
            or member["profileUrl"]
        )
        vote_label = clean_text((division.get("memberTally") or {}).get("showAs")) or "Recorded"
        outcome = clean_text(division.get("outcome")) or "Outcome unavailable"

        records.append(
            {
                "date": clean_text(division.get("date")) or TODAY,
                "resultLabel": f"{vote_label} · {outcome}",
                "source": make_source(
                    title,
                    source_url,
                    "Official Oireachtas vote record.",
                    "oireachtas",
                ),
                "title": title,
            }
        )

    return records


def build_candidate_detail(member, parties_by_name, issue_catalog):
    committees = parse_committees(member)
    offices = parse_offices(member)
    recent_questions = parse_questions(member)
    recent_debates = parse_debates(member)
    recent_votes = parse_votes(member)
    party_links = parties_by_name.get(member["party"], {}).get("officialLinks", [])
    sources = dedupe_sources(
        [
            member["profileSource"],
            *party_links,
            *[entry.get("source") for entry in committees],
            *[entry.get("source") for entry in offices],
            *[entry.get("source") for entry in recent_questions],
            *[entry.get("source") for entry in recent_debates],
            *[entry.get("source") for entry in recent_votes],
        ]
    )
    evidence_counts = {
        "committees": len(committees),
        "offices": len(offices),
        "questions": len(recent_questions),
        "debates": len(recent_debates),
        "votes": len(recent_votes),
    }

    detail = {
        "committees": committees,
        "coverageNote": None,
        "evidenceCounts": evidence_counts,
        "evidenceStatus": (
            "evidenceBacked"
            if any(evidence_counts.values())
            else "summaryOnly"
        ),
        "id": slugify(member["memberCode"]),
        "imageUrl": member["imageUrl"],
        "lastUpdated": TODAY,
        "memberCode": member["memberCode"],
        "memberUri": member["memberUri"],
        "offices": offices,
        "partyLinks": party_links,
        "profileKind": PROFILE_KIND_CURRENT_REPRESENTATIVE,
        "profileUrl": member["profileUrl"],
        "portraitPath": member.get("portraitPath"),
        "recentDebates": recent_debates,
        "recentQuestions": recent_questions,
        "recentVotes": recent_votes,
        "sourceCount": len(sources),
        "sourceType": "oireachtas",
        "sources": sources,
    }

    issue_rows = build_issue_rows(issue_catalog, member["name"], detail)
    issue_coverage_by_id = build_issue_coverage(issue_rows)
    issue_evidence_count = sum(1 for covered in issue_coverage_by_id.values() if covered)
    detail["keyIssues"] = issue_rows
    detail["issueCoverageById"] = issue_coverage_by_id
    detail["issueEvidenceCount"] = issue_evidence_count
    detail["coverageNote"] = (
        f"Issue-linked evidence currently covers {issue_evidence_count} of "
        f"{len(issue_rows)} tracked issues."
    )

    return detail["id"], detail


def build_candidate_details(members, parties, issue_catalog):
    parties_by_name = {party["name"]: party for party in parties}
    details = {}

    with ThreadPoolExecutor(max_workers=8) as executor:
        future_map = {
            executor.submit(build_candidate_detail, member, parties_by_name, issue_catalog): member
            for member in members
        }

        for future in as_completed(future_map):
            member = future_map[future]
            try:
                candidate_id, detail = future.result()
                details[candidate_id] = detail
            except Exception as error:
                fallback_sources = dedupe_sources(
                    [
                        member["profileSource"],
                        *(parties_by_name.get(member["party"], {}).get("officialLinks", [])),
                    ]
                )
                details[slugify(member["memberCode"])] = {
                    "committees": parse_committees(member),
                    "coverageNote": (
                        f"Issue-linked evidence currently covers 0 of "
                        f"{len(issue_catalog)} tracked issues."
                    ),
                    "evidenceCounts": {
                        "committees": len(parse_committees(member)),
                        "offices": len(parse_offices(member)),
                        "questions": 0,
                        "debates": 0,
                        "votes": 0,
                    },
                    "evidenceStatus": "summaryOnly",
                    "id": slugify(member["memberCode"]),
                    "imageUrl": member["imageUrl"],
                    "lastUpdated": TODAY,
                    "memberCode": member["memberCode"],
                    "memberUri": member["memberUri"],
                    "offices": parse_offices(member),
                    "partyLinks": parties_by_name.get(member["party"], {}).get("officialLinks", []),
                    "profileKind": PROFILE_KIND_CURRENT_REPRESENTATIVE,
                    "profileUrl": member["profileUrl"],
                    "portraitPath": member.get("portraitPath"),
                    "recentDebates": [],
                    "recentQuestions": [],
                    "recentVotes": [],
                    "issueCoverageById": {
                        issue["id"]: False for issue in issue_catalog
                    },
                    "issueEvidenceCount": 0,
                    "keyIssues": build_unknown_issue_rows(
                        issue_catalog,
                        member["name"],
                        member["profileSource"],
                    ),
                    "sourceCount": len(fallback_sources),
                    "sourceType": "oirechtas",
                    "sources": fallback_sources,
                    "warning": f"Evidence fetch partial failure: {error}",
                }

    return details


def download_member_portrait(member):
    candidate_id = slugify(member["memberCode"])
    if not candidate_id or not member.get("imageUrl"):
        return None

    portrait_path = PORTRAITS_DIR / f"{candidate_id}.jpg"
    portrait_relative_path = f"portraits/{candidate_id}.jpg"

    if portrait_path.exists() and portrait_path.stat().st_size > 1024:
        return portrait_relative_path

    try:
        curl_file(
            member["imageUrl"],
            portrait_path,
            retries=2,
            referer=member.get("profileUrl"),
            accept="image/*",
        )
        if portrait_path.exists() and portrait_path.stat().st_size > 1024:
            return portrait_relative_path
    except Exception:
        portrait_path.unlink(missing_ok=True)

    return None


def cache_member_portraits(members):
    PORTRAITS_DIR.mkdir(parents=True, exist_ok=True)

    with ThreadPoolExecutor(max_workers=10) as executor:
        future_map = {
            executor.submit(download_member_portrait, member): member
            for member in members
        }

        for future in as_completed(future_map):
            member = future_map[future]
            try:
                member["portraitPath"] = future.result()
            except Exception:
                member["portraitPath"] = None


def build_learning_bundle(official_lookup, issue_catalog, parties):
    eligibility_flow = {
        "startQuestionId": "age",
        "questions": {
            "age": {
                "id": "age",
                "title": "Are you aged 18 or over?",
                "answers": [
                    {"label": "Yes", "nextQuestionId": "irish-citizen"},
                    {"label": "No", "resultId": "under-18"},
                ],
            },
            "irish-citizen": {
                "id": "irish-citizen",
                "title": "Are you an Irish citizen?",
                "answers": [
                    {"label": "Yes", "resultId": "irish-citizen"},
                    {"label": "No", "nextQuestionId": "british-citizen"},
                ],
            },
            "british-citizen": {
                "id": "british-citizen",
                "title": "Are you a British citizen?",
                "answers": [
                    {"label": "Yes", "resultId": "british-citizen"},
                    {"label": "No", "nextQuestionId": "eu-citizen"},
                ],
            },
            "eu-citizen": {
                "id": "eu-citizen",
                "title": "Are you a citizen of another EU member state?",
                "answers": [
                    {"label": "Yes", "resultId": "eu-citizen"},
                    {"label": "No", "resultId": "other-citizen"},
                ],
            },
        },
        "results": {
            "under-18": {
                "id": "under-18",
                "title": "Not yet eligible",
                "summary": "You must be 18 or over to vote in Irish elections and referendums.",
                "elections": ["Not eligible yet"],
                "sources": [
                    official_lookup["voter-eligibility"],
                    official_lookup["register-to-vote"],
                ],
            },
            "irish-citizen": {
                "id": "irish-citizen",
                "title": "Irish citizen",
                "summary": "Irish citizens can vote in general, local, European, presidential elections, and referendums, subject to registration.",
                "elections": [
                    "General elections",
                    "Local elections",
                    "European elections",
                    "Presidential elections",
                    "Referendums",
                ],
                "sources": [
                    official_lookup["voter-eligibility"],
                    official_lookup["register-to-vote"],
                ],
            },
            "british-citizen": {
                "id": "british-citizen",
                "title": "British citizen",
                "summary": "British citizens can vote in general and local elections in Ireland, subject to registration.",
                "elections": ["General elections", "Local elections"],
                "sources": [
                    official_lookup["voter-eligibility"],
                    official_lookup["register-to-vote"],
                ],
            },
            "eu-citizen": {
                "id": "eu-citizen",
                "title": "EU citizen",
                "summary": "EU citizens other than Irish citizens can vote in European and local elections in Ireland, subject to registration.",
                "elections": ["European elections", "Local elections"],
                "sources": [
                    official_lookup["voter-eligibility"],
                    official_lookup["register-to-vote"],
                ],
            },
            "other-citizen": {
                "id": "other-citizen",
                "title": "Other citizen",
                "summary": "Citizens outside Ireland, the United Kingdom, and the EU can generally vote in local elections only, subject to registration.",
                "elections": ["Local elections"],
                "sources": [
                    official_lookup["voter-eligibility"],
                    official_lookup["register-to-vote"],
                ],
            },
        },
    }

    learning_paths = [
        {
            "id": "first-vote",
            "title": "First time voting",
            "summary": "Start with your constituency, then confirm registration, then learn how to rank candidates.",
            "steps": [
                "Find your constituency",
                "Check the register",
                "Read the PR-STV guide",
            ],
        },
        {
            "id": "understand-pr-stv",
            "title": "Understand PR-STV",
            "summary": "Learn why you rank candidates 1, 2, 3 and how transfers work without wasting your vote.",
            "steps": [
                "Rank candidates in order of preference",
                "Do not repeat the same number",
                "Transfers matter if your first preference is elected or eliminated",
            ],
        },
        {
            "id": "compare-before-you-vote",
            "title": "Compare before you vote",
            "summary": "Use source-linked issue rows to compare local candidates without relying on one headline or one clip.",
            "steps": [
                "Pick two to four local profiles",
                "Review issue rows and sources",
                "Open the original official links before deciding",
            ],
        },
    ]

    stv_guide = [
        {
            "id": "ranking",
            "title": "Rank candidates in order",
            "body": "Mark 1 for your first preference, then 2, 3, 4 and so on for later preferences.",
        },
        {
            "id": "do-not-repeat",
            "title": "Do not repeat numbers",
            "body": "Repeating the same number creates ballot risk and can invalidate later preferences.",
        },
        {
            "id": "keep-going",
            "title": "More preferences can still help",
            "body": "Transfers matter when your earlier preference is elected with a surplus or eliminated.",
        },
    ]

    checklist_sections = [
        {
            "id": "registration",
            "title": "Registration",
            "description": "Make sure you are on the register before comparing candidates in depth.",
            "items": [
                {
                    "id": "check-register",
                    "label": "Check the register",
                    "note": "Start with the official register checker.",
                    "link": official_lookup["check-the-register"],
                },
                {
                    "id": "register-to-vote",
                    "label": "Register or update your details",
                    "note": "Official steps for new registration or an address change.",
                    "link": official_lookup["register-to-vote"],
                },
            ],
        },
        {
            "id": "ballot-ready",
            "title": "Ballot ready",
            "description": "Use official information to avoid ballot confusion, especially if this is your first PR-STV election.",
            "items": [
                {
                    "id": "understand-pr-stv",
                    "label": "Read the PR-STV guide",
                    "note": "Official explanation of ranking candidates in order of preference.",
                    "link": official_lookup["voting-system"],
                },
                {
                    "id": "find-constituency",
                    "label": "Confirm your constituency",
                    "note": "Double-check that you are comparing the right local profiles.",
                    "link": official_lookup["what-constituency-am-i-in"],
                },
            ],
        },
        {
            "id": "polling-day",
            "title": "Polling day",
            "description": "Keep the practical tasks visible so the app helps you act, not just read.",
            "items": [
                {
                    "id": "where-to-vote",
                    "label": "Where do I vote?",
                    "note": "Official polling-location guide.",
                    "link": official_lookup["where-to-vote"],
                },
                {
                    "id": "who-are-my-tds",
                    "label": "Review local representatives",
                    "note": "Use the official directory to cross-check names and spellings.",
                    "link": official_lookup["who-are-my-tds"],
                },
            ],
        },
    ]

    return {
        "checklistSections": checklist_sections,
        "eligibilityFlow": eligibility_flow,
        "issueCatalog": issue_catalog,
        "learningPaths": learning_paths,
        "parties": parties,
        "stvGuide": stv_guide,
    }


def build_news(constituencies, official_lookup):
    news_feed = []

    for constituency in constituencies:
        news_feed.append(
            {
                "id": f"{constituency['id']}-constituency-lookup",
                "constituencyId": constituency["id"],
                "publishedAt": official_lookup["what-constituency-am-i-in"]["lastUpdated"],
                "sourceLabel": "Electoral Commission",
                "sourceType": "official",
                "summary": "Use the official constituency tool to confirm you are comparing the right local ballot.",
                "tags": ["Constituency", "Official"],
                "title": f"Confirm the official {constituency['name']} constituency details",
                "url": official_lookup["what-constituency-am-i-in"]["url"],
                "whyItMatters": "This prevents candidate comparison from drifting away from the actual ballot you will see.",
                "lastUpdated": TODAY,
            }
        )
        news_feed.append(
            {
                "id": f"{constituency['id']}-register-check",
                "constituencyId": constituency["id"],
                "publishedAt": official_lookup["check-the-register"]["lastUpdated"],
                "sourceLabel": "Electoral Commission",
                "sourceType": "official",
                "summary": "Check the register and registration guidance before election day.",
                "tags": ["Registration", "Official"],
                "title": f"Registration and polling-day steps for {constituency['name']}",
                "url": official_lookup["check-the-register"]["url"],
                "whyItMatters": "A polished candidate shortlist is not enough if your registration details are wrong.",
                "lastUpdated": TODAY,
            }
        )

    return news_feed


def build_datasets():
    official_resources, official_lookup = build_official_resources()
    issue_catalog = build_issue_catalog()
    members = fetch_current_dail_members()
    cache_member_portraits(members)
    boundary_lookup = build_boundary_lookup()
    constituencies = build_constituencies(members, official_lookup, boundary_lookup)
    election_candidates_raw = parse_election_candidates(constituencies, official_lookup)
    parties = build_parties(
        members,
        official_lookup["party-register"],
        extra_party_names={candidate["party"] for candidate in election_candidates_raw},
    )
    candidate_details = build_candidate_details(members, parties, issue_catalog)
    learning_bundle = build_learning_bundle(official_lookup, issue_catalog, parties)
    news_feed = build_news(constituencies, official_lookup)
    parties_by_name = {party["name"]: party for party in parties}
    parties_by_name["__partyRegister__"] = official_lookup["party-register"]
    current_members_by_merge_key = {
        f"{slugify(member['name'])}::{slugify(member['constituencyName'])}": member
        for member in members
    }
    candidates = [
        build_candidate_summary(
            member,
            candidate_details[slugify(member["memberCode"])],
            issue_catalog,
            parties_by_name,
        )
        for member in members
    ]
    election_candidates = [
        build_election_candidate_summary(
            candidate,
            issue_catalog,
            parties_by_name,
            current_members_by_merge_key,
        )
        for candidate in election_candidates_raw
    ]

    bootstrap_dataset = {
        "meta": {
            "contentPolicyVersion": "2026-03-public-launch-rc1",
            "fallbackMode": "bundled-official-snapshot",
            "generatedAt": NOW,
            "label": "Official sync",
            "lastUpdated": TODAY,
            "methodologyVersion": "2026-03-public-launch-rc1",
            "mode": "api",
            "notes": [
                "Current TD directory and evidence synced from official Oireachtas APIs for the 34th Dáil.",
                "Issue rows remain explicit when Politiclear has not yet attached a verified issue-specific source.",
            ],
            "releaseStage": "live",
            "seatCount": len(candidates),
            "staleAfterDays": DEFAULT_STALE_AFTER_DAYS,
            "syncStatus": "synced",
        },
        "boundarySource": official_lookup["osi-boundaries"],
        "candidates": candidates,
        "checklistSections": learning_bundle["checklistSections"],
        "constituencies": constituencies,
        "coverage": {
            "currentRepresentatives": len(candidates),
            "electionCandidates": len(election_candidates),
            "issueLinkedProfiles": sum(
                1 for candidate in candidates if candidate.get("issueEvidenceCount", 0) > 0
            ),
        },
        "currentRepresentatives": candidates,
        "defaultConstituencyId": "dublin-bay-south"
        if any(item["id"] == "dublin-bay-south" for item in constituencies)
        else constituencies[0]["id"],
        "electionCandidates": election_candidates,
        "eligibilityFlow": learning_bundle["eligibilityFlow"],
        "issueCatalog": issue_catalog,
        "lookupModes": LOOKUP_MODES,
        "learningPaths": learning_bundle["learningPaths"],
        "newsFeed": news_feed,
        "officialResources": official_resources,
        "parties": parties,
        "stvGuide": learning_bundle["stvGuide"],
    }

    evidence_dataset = {
        "candidateDetails": candidate_details,
        "meta": {
            "contentPolicyVersion": "2026-03-public-launch-rc1",
            "fallbackMode": "bundled-official-snapshot",
            "generatedAt": NOW,
            "label": "Official sync evidence",
            "lastUpdated": TODAY,
            "methodologyVersion": "2026-03-public-launch-rc1",
            "mode": "api",
            "notes": [
                "Detailed candidate evidence is sourced from official Oireachtas members, questions, debates, and votes APIs.",
            ],
            "releaseStage": "live",
            "staleAfterDays": DEFAULT_STALE_AFTER_DAYS,
            "syncStatus": "synced",
        },
    }

    return bootstrap_dataset, evidence_dataset


def main():
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    PORTRAITS_DIR.mkdir(parents=True, exist_ok=True)
    bootstrap_dataset, evidence_dataset = build_datasets()

    BOOTSTRAP_PATH.write_text(
        json.dumps(bootstrap_dataset, indent=2, ensure_ascii=False) + "\n"
    )
    DETAILS_PATH.write_text(
        json.dumps(evidence_dataset, indent=2, ensure_ascii=False) + "\n"
    )

    evidence_backed = sum(
        1
        for detail in evidence_dataset["candidateDetails"].values()
        if detail.get("evidenceStatus") == "evidenceBacked"
    )

    print(
        json.dumps(
            {
                "bootstrapOutput": str(BOOTSTRAP_PATH),
                "candidateCount": len(bootstrap_dataset["candidates"]),
                "constituencyCount": len(bootstrap_dataset["constituencies"]),
                "detailOutput": str(DETAILS_PATH),
                "evidenceBackedCandidateCount": evidence_backed,
                "electionCandidateCount": len(bootstrap_dataset["electionCandidates"]),
                "generatedAt": bootstrap_dataset["meta"]["generatedAt"],
                "portraitCount": len(list(PORTRAITS_DIR.glob("*.jpg"))),
            },
            ensure_ascii=False,
        )
    )


if __name__ == "__main__":
    main()
