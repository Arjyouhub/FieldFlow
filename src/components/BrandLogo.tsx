import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Colors } from "../constants/theme";
import { fontScale } from "../utils/responsive";

interface BrandLogoProps {
  size?: "sm" | "md" | "lg" | "xl";
  showTagline?: boolean;
  themeMode?: "light" | "dark";
}

export const BrandLogo: React.FC<BrandLogoProps> = ({
  size = "md",
  showTagline = false,
  themeMode = "light",
}) => {
  const isDark = themeMode === "dark";

  const iconSizes = {
    sm: 28,
    md: 38,
    lg: 48,
    xl: 64,
  };

  const textSizes = {
    sm: fontScale(18),
    md: fontScale(24),
    lg: fontScale(30),
    xl: fontScale(38),
  };

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        {/* Modern Leaf Icon */}
        <View
          style={[
            styles.leafIconWrapper,
            {
              width: iconSizes[size],
              height: iconSizes[size],
              borderRadius: iconSizes[size] * 0.35,
            },
          ]}
        >
          <Text style={[styles.leafEmoji, { fontSize: iconSizes[size] * 0.6 }]}>🌿</Text>
        </View>
        <Text
          style={[
            styles.brandTitle,
            {
              fontSize: textSizes[size],
              color: isDark ? "#FFFFFF" : Colors.light.primaryDark,
            },
          ]}
        >
          Field<Text style={{ color: Colors.light.primary }}>Flow</Text>
        </Text>
      </View>
      {showTagline && (
        <Text
          style={[
            styles.tagline,
            { color: isDark ? "#A7F3D0" : Colors.light.textSecondary },
          ]}
        >
          Collect · Track · Grow
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  leafIconWrapper: {
    backgroundColor: Colors.light.primaryLight,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: Colors.light.primaryBorder,
  },
  leafEmoji: {
    textAlign: "center",
  },
  brandTitle: {
    fontWeight: "900",
    letterSpacing: -0.5,
  },
  tagline: {
    fontSize: fontScale(12),
    fontWeight: "600",
    letterSpacing: 1.5,
    marginTop: 6,
    textTransform: "uppercase",
  },
});
