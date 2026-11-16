import { Pressable, StyleSheet, Text, View } from "react-native";

import { tokens } from "../../constants/theme";
import type { EmailFilter } from "../../types/prospecting";

interface EmailFilterBarProps {
  currentFilter: EmailFilter;
  onFilterChange: (filter: EmailFilter) => void;
  draftCount: number;
  sendingCount: number;
  sentCount: number;
  rejectedCount: number;
  colors: any;
}

export function EmailFilterBar({
  currentFilter,
  onFilterChange,
  draftCount,
  sendingCount,
  sentCount,
  colors,
}: Omit<EmailFilterBarProps, "rejectedCount">) {
  const filters: { key: EmailFilter; label: string; count: number }[] = [
    { key: "pending", label: "Drafts", count: draftCount },
    { key: "sending", label: "Sending", count: sendingCount },
    { key: "sent", label: "Sent / Replied", count: sentCount },
  ];

  return (
    <View style={styles.filterRow}>
      {filters.map((f) => {
        const isSelected = currentFilter === f.key;
        return (
          <Pressable
            key={f.key}
            onPress={() => onFilterChange(f.key)}
            style={[
              styles.filterChip,
              {
                backgroundColor: isSelected
                  ? colors.primarySoft
                  : colors.surface,
                borderColor: isSelected
                  ? colors.primaryBorder || colors.primary
                  : colors.border,
              },
            ]}
          >
            <Text
              style={[
                styles.filterChipText,
                {
                  color: isSelected ? colors.primary : colors.textSecondary,
                  fontFamily: isSelected ? "DMSansSemiBold" : "DMSansMedium",
                },
              ]}
            >
              {f.label} ({f.count})
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  filterRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: tokens.spacing.md,
    paddingVertical: tokens.spacing.sm,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: tokens.radius.full,
    borderWidth: 1,
  },
  filterChipText: {
    fontSize: tokens.fontSize.xs,
    lineHeight: 16,
  },
});
