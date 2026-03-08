import { Image } from "expo-image";
import { useEffect, useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { palette } from "../../theme/tokens";

function getFallbackLabel(candidate) {
  if (candidate?.imageFallbackLabel) {
    return candidate.imageFallbackLabel;
  }

  const nameParts = `${candidate?.name || ""}`
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);

  if (!nameParts.length) {
    return "?";
  }

  return nameParts.map((part) => part[0]).join("").toUpperCase();
}

export default function CandidateAvatar({
  candidate,
  size = 72,
  style,
  labelStyle,
}) {
  const [showFallback, setShowFallback] = useState(!candidate?.imageUrl);
  const fallbackLabel = useMemo(() => getFallbackLabel(candidate), [candidate]);

  useEffect(() => {
    setShowFallback(!candidate?.imageUrl);
  }, [candidate?.imageUrl]);

  return (
    <View
      style={[
        styles.frame,
        {
          borderRadius: size / 2,
          height: size,
          width: size,
        },
        style,
      ]}
    >
      {!showFallback && candidate?.imageUrl ? (
        <Image
          source={candidate.imageUrl}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          transition={180}
          onError={() => setShowFallback(true)}
        />
      ) : null}
      {showFallback ? (
        <View
          style={[
            styles.fallback,
            {
              borderRadius: size / 2,
            },
          ]}
        >
          <Text
            style={[
              styles.fallbackLabel,
              {
                fontSize: Math.max(14, Math.round(size * 0.34)),
              },
              labelStyle,
            ]}
          >
            {fallbackLabel}
          </Text>
        </View>
      ) : null}
      <View style={styles.ring} />
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    backgroundColor: palette.surfaceMuted,
    overflow: "hidden",
    position: "relative",
  },
  fallback: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    backgroundColor: palette.civicStrong,
    justifyContent: "center",
  },
  fallbackLabel: {
    color: "#ffffff",
    fontWeight: "800",
    letterSpacing: 0.6,
  },
  ring: {
    ...StyleSheet.absoluteFillObject,
    borderColor: "rgba(255,255,255,0.52)",
    borderWidth: 2,
  },
});
