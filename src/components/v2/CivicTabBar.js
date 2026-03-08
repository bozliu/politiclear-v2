import { Pressable, StyleSheet, Text, View } from "react-native";
import { palette, radii, spacing, typography } from "../../theme/tokens";

export default function CivicTabBar({ state, descriptors, navigation }) {
  return (
    <View style={styles.container}>
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];
        const label =
          options.tabBarLabel ?? options.title ?? route.name;
        const isFocused = state.index === index;

        return (
          <Pressable
            accessibilityRole="tab"
            accessibilityState={{ selected: isFocused }}
            accessibilityLabel={`${label} tab`}
            key={route.key}
            onPress={() => navigation.navigate(route.name)}
            style={({ pressed }) => [
              styles.item,
              isFocused && styles.itemFocused,
              pressed && styles.itemPressed,
            ]}
          >
            <Text style={[styles.label, isFocused && styles.labelFocused]}>
              {label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: palette.surfaceRaised,
    borderTopColor: palette.border,
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.lg,
    shadowColor: palette.shadow,
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 1,
    shadowRadius: 16,
  },
  item: {
    alignItems: "center",
    borderRadius: radii.pill,
    flex: 1,
    marginHorizontal: 2,
    paddingHorizontal: 4,
    paddingVertical: spacing.sm,
  },
  itemFocused: {
    backgroundColor: palette.civicStrong,
  },
  itemPressed: {
    opacity: 0.75,
  },
  label: {
    color: palette.inkMuted,
    fontSize: typography.caption,
    fontWeight: "700",
    textAlign: "center",
  },
  labelFocused: {
    color: "#ffffff",
  },
});
