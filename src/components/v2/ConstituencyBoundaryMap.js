import { useMemo, useState } from "react";
import { Platform, Pressable, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import Svg, { Circle, G, Path } from "react-native-svg";
import { palette, radii, spacing, typography } from "../../theme/tokens";

function getOverallBounds(constituencies) {
  return constituencies.reduce(
    (bounds, constituency) => {
      const bbox = constituency.bbox;
      if (!bbox) {
        return bounds;
      }

      return {
        maxX: Math.max(bounds.maxX, bbox.maxX),
        maxY: Math.max(bounds.maxY, bbox.maxY),
        minX: Math.min(bounds.minX, bbox.minX),
        minY: Math.min(bounds.minY, bbox.minY),
      };
    },
    {
      maxX: Number.NEGATIVE_INFINITY,
      maxY: Number.NEGATIVE_INFINITY,
      minX: Number.POSITIVE_INFINITY,
      minY: Number.POSITIVE_INFINITY,
    }
  );
}

function pointToCanvas(point, bounds, width, height, padding) {
  const innerWidth = width - padding * 2;
  const innerHeight = height - padding * 2;
  const scale = Math.min(
    innerWidth / Math.max(bounds.maxX - bounds.minX, 1),
    innerHeight / Math.max(bounds.maxY - bounds.minY, 1)
  );
  const offsetX =
    padding + (innerWidth - (bounds.maxX - bounds.minX) * scale) / 2;
  const offsetY =
    padding + (innerHeight - (bounds.maxY - bounds.minY) * scale) / 2;

  return {
    x: offsetX + (point[0] - bounds.minX) * scale,
    y: height - offsetY - (point[1] - bounds.minY) * scale,
  };
}

function buildPath(boundary, bounds, width, height, padding) {
  if (!boundary?.coordinates?.length) {
    return "";
  }

  const pathParts = [];

  boundary.coordinates.forEach((polygon) => {
    polygon.forEach((ring) => {
      if (!ring?.length) {
        return;
      }

      ring.forEach((point, index) => {
        const canvasPoint = pointToCanvas(point, bounds, width, height, padding);
        pathParts.push(`${index === 0 ? "M" : "L"}${canvasPoint.x.toFixed(2)} ${canvasPoint.y.toFixed(2)}`);
      });
      pathParts.push("Z");
    });
  });

  return pathParts.join(" ");
}

export default function ConstituencyBoundaryMap({
  constituencies,
  selectedConstituencyId,
  onSelectConstituency,
  height = 420,
}) {
  const { width: windowWidth } = useWindowDimensions();
  const [hoveredId, setHoveredId] = useState(null);
  const mappedConstituencies = useMemo(
    () => (constituencies || []).filter((item) => item.boundary && item.bbox),
    [constituencies]
  );

  const mapWidth = Math.min(Math.max(windowWidth - spacing.xl, 280), 860);
  const bounds = useMemo(
    () => getOverallBounds(mappedConstituencies),
    [mappedConstituencies]
  );

  const paths = useMemo(
    () =>
      mappedConstituencies.map((constituency) => ({
        constituency,
        path: buildPath(constituency.boundary, bounds, mapWidth, height, 18),
      })),
    [bounds, height, mapWidth, mappedConstituencies]
  );

  const activeConstituency = mappedConstituencies.find(
    (item) => item.id === hoveredId || item.id === selectedConstituencyId
  );

  if (!mappedConstituencies.length) {
    return (
      <View style={[styles.shell, styles.emptyShell]}>
        <View style={styles.emptyHeader}>
          <Text style={styles.emptyTitle}>Visual constituency atlas</Text>
          <Text style={styles.emptyText}>
            Official boundaries are still syncing, so Politiclear is keeping the map area interactive with a visual constituency picker instead of hiding it.
          </Text>
        </View>
        <View style={styles.atlasGrid}>
          {(constituencies || []).map((constituency) => {
            const isSelected = constituency.id === selectedConstituencyId;
            return (
              <Pressable
                key={constituency.id}
                onPress={() => onSelectConstituency?.(constituency.id)}
                style={({ pressed }) => [
                  styles.atlasCard,
                  isSelected && styles.atlasCardActive,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={styles.atlasName}>{constituency.name}</Text>
                <Text style={styles.atlasMeta}>{constituency.seats} seats</Text>
                <Text style={styles.atlasSummary} numberOfLines={2}>
                  {constituency.localIssues?.join(" · ") || constituency.summary}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.shell}>
      <View style={styles.mapHeader}>
        <Text style={styles.mapTitle}>Official constituency boundary map</Text>
        <Text style={styles.mapBody}>
          Hover or tap a boundary to select a constituency. Search-first still stays available above the map.
        </Text>
      </View>
      <View style={styles.mapFrame}>
        <Svg width={mapWidth} height={height} viewBox={`0 0 ${mapWidth} ${height}`}>
          {paths.map(({ constituency, path }) => {
            const isSelected = constituency.id === selectedConstituencyId;
            const isHovered = constituency.id === hoveredId;
            const interactionProps =
              Platform.OS === "web"
                ? {
                    onClick: () => onSelectConstituency?.(constituency.id),
                    onMouseEnter: () => setHoveredId(constituency.id),
                    onMouseLeave: () => setHoveredId(null),
                  }
                : {
                    onPress: () => onSelectConstituency?.(constituency.id),
                  };
            const labelPoint = constituency.mapLabelPoint;
            const labelCanvasPoint = labelPoint
              ? pointToCanvas(
                  [labelPoint.x, labelPoint.y],
                  bounds,
                  mapWidth,
                  height,
                  18
                )
              : null;

            return (
              <G key={constituency.id}>
                <Path
                  d={path}
                  fill={isSelected ? palette.civic : isHovered ? palette.accentSoft : palette.mapBase}
                  fillRule="evenodd"
                  stroke={isSelected ? palette.civicStrong : palette.mapStroke}
                  strokeWidth={isSelected ? 2 : 1}
                  {...interactionProps}
                />
                {isSelected && labelCanvasPoint ? (
                  <Circle
                    cx={labelCanvasPoint.x}
                    cy={labelCanvasPoint.y}
                    fill={palette.gold}
                    r={5}
                  />
                ) : null}
              </G>
            );
          })}
        </Svg>
      </View>
      <View style={styles.selectionBanner}>
        <Text style={styles.selectionEyebrow}>
          {hoveredId ? "Hovered constituency" : "Selected constituency"}
        </Text>
        <Text style={styles.selectionTitle}>
          {activeConstituency?.name || "Choose a constituency"}
        </Text>
        <Text style={styles.selectionBody}>
          {activeConstituency
            ? `${activeConstituency.seats} seats · Updated ${activeConstituency.updatedAt}`
            : "Use the map or the search input to move the local dashboard."}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    backgroundColor: palette.surfaceRaised,
    borderColor: palette.border,
    borderRadius: radii.xl,
    borderWidth: 1,
    overflow: "hidden",
  },
  emptyShell: {
    padding: spacing.lg,
  },
  emptyHeader: {
    marginBottom: spacing.md,
  },
  emptyTitle: {
    color: palette.ink,
    fontSize: typography.h3,
    fontWeight: "700",
    marginBottom: spacing.xs,
  },
  emptyText: {
    color: palette.inkMuted,
    fontSize: typography.bodySmall,
    lineHeight: 20,
  },
  atlasGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  atlasCard: {
    backgroundColor: palette.surface,
    borderColor: palette.border,
    borderRadius: radii.lg,
    borderWidth: 1,
    minHeight: 120,
    padding: spacing.md,
    width: "48.5%",
  },
  atlasCardActive: {
    backgroundColor: palette.civicSoft,
    borderColor: palette.civic,
  },
  atlasName: {
    color: palette.ink,
    fontSize: typography.body,
    fontWeight: "800",
    marginBottom: 4,
  },
  atlasMeta: {
    color: palette.civicStrong,
    fontSize: typography.caption,
    fontWeight: "700",
    marginBottom: spacing.xs,
    textTransform: "uppercase",
  },
  atlasSummary: {
    color: palette.inkMuted,
    fontSize: typography.caption,
    lineHeight: 18,
  },
  mapHeader: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  mapTitle: {
    color: palette.ink,
    fontSize: typography.h3,
    fontWeight: "800",
    marginBottom: spacing.xs,
  },
  mapBody: {
    color: palette.inkMuted,
    fontSize: typography.bodySmall,
    lineHeight: 20,
  },
  mapFrame: {
    alignItems: "center",
    backgroundColor: palette.surface,
    borderColor: palette.border,
    borderRadius: radii.lg,
    borderWidth: 1,
    margin: spacing.lg,
    paddingVertical: spacing.sm,
  },
  selectionBanner: {
    backgroundColor: palette.civicStrong,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  selectionEyebrow: {
    color: "rgba(255,255,255,0.72)",
    fontSize: typography.caption,
    fontWeight: "700",
    letterSpacing: 0.6,
    marginBottom: 4,
    textTransform: "uppercase",
  },
  selectionTitle: {
    color: "#ffffff",
    fontSize: typography.h2,
    fontWeight: "800",
    marginBottom: 4,
  },
  selectionBody: {
    color: "rgba(255,255,255,0.82)",
    fontSize: typography.bodySmall,
    lineHeight: 20,
  },
});
