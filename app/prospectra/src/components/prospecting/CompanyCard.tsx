import { Pressable, StyleSheet, Text, View } from "react-native";
import {
  Briefcase,
  Building2,
  ChevronRight,
  Globe,
  Lightbulb,
} from "lucide-react-native";

import { tokens } from "../../constants/theme";
import {
  getCompanyStatusBorder,
  getCompanyStatusColor,
  getCompanyStatusLabel,
  getCompanyStatusSoftBg,
} from "../../helpers/prospecting/prospectingStatusHelpers";
import type { CompanyProspect } from "../../types/prospecting/company";

interface CompanyCardProps {
  company: CompanyProspect;
  onPress: (company: CompanyProspect) => void;
  colors: any;
}

export function CompanyCard({ company, onPress, colors }: CompanyCardProps) {
  const statusColor = getCompanyStatusColor(company.status, colors);
  const statusSoft = getCompanyStatusSoftBg(company.status, colors);
  const statusBorder = getCompanyStatusBorder(company.status, colors);
  const statusLabel = getCompanyStatusLabel(company.status);
  const authScore = company.auth_score ?? company.company_auth?.score;

  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => onPress(company)}
      style={({ pressed }) => [
        styles.prospectCard,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          opacity: pressed ? 0.88 : 1,
        },
      ]}
    >
      <View style={styles.cardHeaderRow}>
        <View
          style={[
            styles.avatarIcon,
            {
              backgroundColor: colors.surfaceElevated,
              borderColor: colors.border,
            },
          ]}
        >
          <Building2
            size={16}
            color={colors.textSecondary}
            strokeWidth={1.75}
          />
        </View>

        <View style={styles.cardHeaderInfo}>
          <Text
            style={[styles.cardTitle, { color: colors.text }]}
            numberOfLines={1}
          >
            {company.name}
          </Text>
          {company.domain ? (
            <View style={styles.domainRow}>
              <Globe
                size={11}
                color={colors.textSecondary}
                strokeWidth={1.75}
              />
              <Text
                style={[
                  styles.cardSubtext,
                  { color: colors.textSecondary },
                ]}
                numberOfLines={1}
              >
                {company.domain}
              </Text>
            </View>
          ) : null}
        </View>

        <View style={styles.cardRightGroup}>
          <View
            style={[
              styles.compactStatusChip,
              {
                backgroundColor: statusSoft,
                borderColor: statusBorder,
              },
            ]}
          >
            <View
              style={[
                styles.compactStatusDot,
                { backgroundColor: statusColor },
              ]}
            />
            <Text style={[styles.compactStatusText, { color: statusColor }]}>
              {statusLabel}
            </Text>
          </View>
        </View>
      </View>

      {/* Need Hypothesis preview banner */}
      {company.need_hypothesis ? (
        <View
          style={[
            styles.cardNeedBanner,
            {
              backgroundColor: colors.surfaceElevated,
              borderColor: colors.border,
            },
          ]}
        >
          <Lightbulb
            size={13}
            color={colors.primary}
            strokeWidth={1.75}
            style={{ marginTop: 2 }}
          />
          <Text
            style={[styles.cardNeedText, { color: colors.text }]}
            numberOfLines={2}
          >
            {company.need_hypothesis}
          </Text>
        </View>
      ) : null}

      {/* Needed skills tags */}
      {company.needed_skills && company.needed_skills.length > 0 ? (
        <View style={styles.cardSkillsWrap}>
          {company.needed_skills.slice(0, 3).map((skill, idx) => (
            <View
              key={idx}
              style={[
                styles.cardSkillTag,
                {
                  backgroundColor: colors.surfaceElevated,
                  borderColor: colors.border,
                },
              ]}
            >
              <Text style={[styles.cardSkillTagText, { color: colors.text }]}>
                {skill}
              </Text>
            </View>
          ))}
          {company.needed_skills.length > 3 ? (
            <View
              style={[
                styles.cardSkillTag,
                {
                  backgroundColor: colors.surfaceElevated,
                  borderColor: colors.border,
                },
              ]}
            >
              <Text
                style={[
                  styles.cardSkillTagText,
                  { color: colors.textSecondary },
                ]}
              >
                +{company.needed_skills.length - 3}
              </Text>
            </View>
          ) : null}
        </View>
      ) : null}

      <View
        style={[
          styles.cardMetaRow,
          { borderTopColor: colors.border },
        ]}
      >
        <View style={styles.metaPillGroup}>
          {company.industry ? (
            <View style={styles.metaInlineItem}>
              <Briefcase
                size={11}
                color={colors.textSecondary}
                strokeWidth={1.75}
              />
              <Text
                style={[styles.cardMetaText, { color: colors.textSecondary }]}
                numberOfLines={1}
              >
                {company.industry}
              </Text>
            </View>
          ) : null}
          {company.size ? (
            <Text
              style={[styles.cardMetaText, { color: colors.textSecondary }]}
              numberOfLines={1}
            >
              • {company.size}
            </Text>
          ) : null}
        </View>

        <View style={styles.cardMetaRightGroup}>
          {authScore !== undefined ? (
            <View
              style={[
                styles.miniMatchBadge,
                {
                  backgroundColor:
                    authScore >= 70 ? colors.successSoft : colors.warningSoft,
                  borderColor:
                    authScore >= 70
                      ? colors.successBorder
                      : colors.warningBorder,
                },
              ]}
            >
              <Text
                style={[
                  styles.miniMatchText,
                  { color: authScore >= 70 ? colors.success : colors.warning },
                ]}
              >
                {authScore}% Fit
              </Text>
            </View>
          ) : null}

          <View
            style={[
              styles.cardShowDetailBtn,
              {
                backgroundColor: colors.surfaceElevated,
                borderColor: colors.border,
              },
            ]}
          >
            <Text style={[styles.cardShowDetailText, { color: colors.text }]}>
              Inspect
            </Text>
            <ChevronRight
              size={12}
              color={colors.textSecondary}
              strokeWidth={1.75}
            />
          </View>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  prospectCard: {
    borderRadius: tokens.radius.card,
    borderWidth: 1,
    padding: tokens.spacing.md,
    gap: tokens.spacing.sm + 2,
    marginBottom: tokens.spacing.md,
    ...tokens.shadow.sm,
  },
  cardHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.spacing.sm,
  },
  avatarIcon: {
    width: 36,
    height: 36,
    borderRadius: tokens.radius.sm,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  cardHeaderInfo: {
    flex: 1,
    gap: 2,
  },
  cardTitle: {
    fontFamily: "DMSansSemiBold",
    fontSize: tokens.fontSize.md,
    lineHeight: 22,
  },
  domainRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  cardSubtext: {
    fontFamily: "DMSans",
    fontSize: tokens.fontSize.xs,
    lineHeight: 16,
  },
  cardRightGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.spacing.xs,
  },
  compactStatusChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: tokens.radius.full,
    borderWidth: 1,
  },
  compactStatusDot: {
    width: 6,
    height: 6,
    borderRadius: tokens.radius.full,
  },
  compactStatusText: {
    fontFamily: "DMSansMedium",
    fontSize: tokens.fontSize.xs - 1,
    lineHeight: 14,
  },
  cardNeedBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    padding: tokens.spacing.sm,
    borderRadius: tokens.radius.sm,
    borderWidth: 1,
  },
  cardNeedText: {
    flex: 1,
    fontFamily: "DMSans",
    fontSize: tokens.fontSize.xs,
    lineHeight: 18,
  },
  cardSkillsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  cardSkillTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: tokens.radius.sm,
    borderWidth: 1,
  },
  cardSkillTagText: {
    fontFamily: "DMSansMedium",
    fontSize: tokens.fontSize.xs - 1,
    lineHeight: 14,
  },
  cardMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: tokens.spacing.sm,
    borderTopWidth: 1,
  },
  metaPillGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flex: 1,
  },
  metaInlineItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  cardMetaText: {
    fontFamily: "DMSans",
    fontSize: tokens.fontSize.xs,
    lineHeight: 16,
  },
  cardMetaRightGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.spacing.xs,
  },
  miniMatchBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: tokens.radius.full,
    borderWidth: 1,
  },
  miniMatchText: {
    fontFamily: "DMSansSemiBold",
    fontSize: tokens.fontSize.xs - 1,
    lineHeight: 14,
  },
  cardShowDetailBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: tokens.radius.sm,
    borderWidth: 1,
  },
  cardShowDetailText: {
    fontFamily: "DMSansMedium",
    fontSize: tokens.fontSize.xs - 1,
    lineHeight: 14,
  },
});
