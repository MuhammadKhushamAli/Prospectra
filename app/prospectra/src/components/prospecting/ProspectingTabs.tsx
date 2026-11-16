import { Pressable, StyleSheet, Text, View } from "react-native";
import { Building2, Mail } from "lucide-react-native";

import { tokens } from "../../constants/theme";
import type { ProspectingTab } from "../../types/prospecting";

interface ProspectingTabsProps {
  activeTab: ProspectingTab;
  onTabChange: (tab: ProspectingTab) => void;
  companiesCount: number;
  emailsCount: number;
  colors: any;
}

export function ProspectingTabs({
  activeTab,
  onTabChange,
  companiesCount,
  emailsCount,
  colors,
}: ProspectingTabsProps) {
  return (
    <View
      style={[
        styles.tabsBar,
        {
          backgroundColor: colors.surface,
          borderBottomColor: colors.border,
        },
      ]}
    >
      <Pressable
        accessibilityRole="tab"
        accessibilityState={{ selected: activeTab === "companies" }}
        onPress={() => onTabChange("companies")}
        style={[
          styles.tabButton,
          activeTab === "companies" && {
            borderBottomColor: colors.primary,
            borderBottomWidth: 2,
          },
        ]}
      >
        <Building2
          size={15}
          color={activeTab === "companies" ? colors.primary : colors.textSecondary}
          strokeWidth={1.75}
        />
        <Text
          style={[
            styles.tabText,
            {
              color:
                activeTab === "companies"
                  ? colors.text
                  : colors.textSecondary,
              fontFamily:
                activeTab === "companies" ? "DMSansSemiBold" : "DMSansMedium",
            },
          ]}
        >
          Companies
        </Text>
        <View
          style={[
            styles.tabBadge,
            {
              backgroundColor:
                activeTab === "companies"
                  ? colors.primarySoft
                  : colors.surfaceElevated,
            },
          ]}
        >
          <Text
            style={[
              styles.tabBadgeText,
              {
                color:
                  activeTab === "companies"
                    ? colors.primary
                    : colors.textSecondary,
              },
            ]}
          >
            {companiesCount}
          </Text>
        </View>
      </Pressable>

      <Pressable
        accessibilityRole="tab"
        accessibilityState={{ selected: activeTab === "emails" }}
        onPress={() => onTabChange("emails")}
        style={[
          styles.tabButton,
          activeTab === "emails" && {
            borderBottomColor: colors.primary,
            borderBottomWidth: 2,
          },
        ]}
      >
        <Mail
          size={15}
          color={activeTab === "emails" ? colors.primary : colors.textSecondary}
          strokeWidth={1.75}
        />
        <Text
          style={[
            styles.tabText,
            {
              color:
                activeTab === "emails"
                  ? colors.text
                  : colors.textSecondary,
              fontFamily:
                activeTab === "emails" ? "DMSansSemiBold" : "DMSansMedium",
            },
          ]}
        >
          Emails
        </Text>
        <View
          style={[
            styles.tabBadge,
            {
              backgroundColor:
                activeTab === "emails"
                  ? colors.primarySoft
                  : colors.surfaceElevated,
            },
          ]}
        >
          <Text
            style={[
              styles.tabBadgeText,
              {
                color:
                  activeTab === "emails"
                    ? colors.primary
                    : colors.textSecondary,
              },
            ]}
          >
            {emailsCount}
          </Text>
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  tabsBar: {
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
  },
  tabButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  tabText: {
    fontSize: tokens.fontSize.sm,
    lineHeight: 20,
  },
  tabBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: tokens.radius.full,
  },
  tabBadgeText: {
    fontFamily: "DMSansSemiBold",
    fontSize: tokens.fontSize.xs - 2,
    lineHeight: 14,
  },
});
