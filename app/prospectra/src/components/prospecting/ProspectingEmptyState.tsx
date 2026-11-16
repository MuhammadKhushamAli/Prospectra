import { StyleSheet, Text, View } from "react-native";
import { Building2, Mail } from "lucide-react-native";

import { tokens } from "../../constants/theme";
import type { CompanyFilter, EmailFilter, ProspectingTab } from "../../types/prospecting";

interface ProspectingEmptyStateProps {
  tab: ProspectingTab;
  companyFilter?: CompanyFilter;
  emailFilter?: EmailFilter;
  colors: any;
}

export function ProspectingEmptyState({
  tab,
  companyFilter,
  emailFilter,
  colors,
}: ProspectingEmptyStateProps) {
  if (tab === "companies") {
    let title = "No pending companies";
    let desc = "Tap 'Find Companies' to discover new leads matching your profile.";
    if (companyFilter === "approved") {
      title = "No approved companies";
      desc = "Approve discovered companies from the Pending tab to generate outreach.";
    } else if (companyFilter === "rejected") {
      title = "No rejected companies";
      desc = "Companies you pass on will appear here.";
    }

    return (
      <View style={styles.emptyContainer}>
        <View
          style={[
            styles.emptyIconBadge,
            {
              backgroundColor: colors.surfaceElevated,
              borderColor: colors.border,
            },
          ]}
        >
          <Building2 size={32} color={colors.textSecondary} strokeWidth={1.5} />
        </View>
        <Text style={[styles.emptyTitle, { color: colors.text }]}>{title}</Text>
        <Text style={[styles.emptyDesc, { color: colors.textSecondary }]}>
          {desc}
        </Text>
      </View>
    );
  }

  let title = "No draft emails";
  let desc = "Accept candidate companies to automatically generate outreach drafts.";
  if (emailFilter === "sent") {
    title = "No sent outreach";
    desc = "Approve and send generated drafts to reach out to target prospects.";
  } else if (emailFilter === "sending") {
    title = "No sending emails";
    desc = "Emails currently being dispatched by the outreach worker will appear here.";
  }

  return (
    <View style={styles.emptyContainer}>
      <View
        style={[
          styles.emptyIconBadge,
          {
            backgroundColor: colors.surfaceElevated,
            borderColor: colors.border,
          },
        ]}
      >
        <Mail size={32} color={colors.textSecondary} strokeWidth={1.5} />
      </View>
      <Text style={[styles.emptyTitle, { color: colors.text }]}>{title}</Text>
      <Text style={[styles.emptyDesc, { color: colors.textSecondary }]}>
        {desc}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: tokens.spacing.xl,
    paddingVertical: tokens.spacing.xl * 2,
    gap: tokens.spacing.sm,
  },
  emptyIconBadge: {
    width: 64,
    height: 64,
    borderRadius: tokens.radius.full,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: tokens.spacing.xs,
  },
  emptyTitle: {
    fontFamily: "DMSansSemiBold",
    fontSize: tokens.fontSize.lg,
    lineHeight: 24,
    textAlign: "center",
  },
  emptyDesc: {
    fontFamily: "DMSans",
    fontSize: tokens.fontSize.sm,
    lineHeight: 20,
    textAlign: "center",
    maxWidth: 320,
  },
});
