import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  useColorScheme,
  View,
} from "react-native";
import { Mail, Sparkles, UserPlus, X } from "lucide-react-native";

import { useTheme } from "@/hooks/useTheme";

interface InviteMemberModalProps {
  visible: boolean;
  onClose: () => void;
  onInvite: (email: string) => Promise<any>;
}

export const InviteMemberModal: React.FC<InviteMemberModalProps> = ({
  visible,
  onClose,
  onInvite,
}) => {
  const colors = useTheme();
  const isDark = useColorScheme() === "dark";
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const handleSend = async () => {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes("@")) {
      setLocalError("Please enter a valid teammate email address.");
      return;
    }

    setLocalError(null);
    setLoading(true);

    try {
      await onInvite(cleanEmail);
      setEmail("");
      onClose();
      Alert.alert(
        "Invitation Sent",
        `An invitation email has been sent to ${cleanEmail}. They can now sign up to join your team.`,
      );
    } catch (err: any) {
      setLocalError(err?.message || "Failed to send invitation.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <View
          style={[
            styles.modalCard,
            {
              backgroundColor: isDark ? "#14171C" : colors.background,
              borderColor: colors.border,
            },
          ]}
        >
          {/* Header */}
          <View style={styles.headerRow}>
            <View style={styles.titleRow}>
              <View
                style={[
                  styles.iconWrap,
                  { backgroundColor: "rgba(224, 138, 82, 0.15)" },
                ]}
              >
                <UserPlus size={18} color={colors.primary} />
              </View>
              <Text style={[styles.title, { color: colors.text }]}>Invite Teammate</Text>
            </View>

            <Pressable
              onPress={onClose}
              disabled={loading}
              style={({ pressed }) => [
                styles.closeBtn,
                { backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)" },
                pressed && { opacity: 0.7 },
              ]}
              accessibilityLabel="Close invite modal"
            >
              <X size={18} color={colors.text} />
            </Pressable>
          </View>

          {/* Explanation Banner */}
          <View
            style={[
              styles.infoBanner,
              {
                backgroundColor: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)",
                borderColor: colors.border,
              },
            ]}
          >
            <Sparkles size={16} color={colors.primary} style={{ marginTop: 2 }} />
            <Text style={[styles.infoBannerText, { color: colors.textSecondary }]}>
              Teammate email must belong to your organization's verified domain. On sign up,
              organization and domain verification will be skipped automatically.
            </Text>
          </View>

          {/* Email Input */}
          <View style={styles.inputSection}>
            <Text style={[styles.label, { color: colors.text }]}>Teammate Email Address</Text>
            <View
              style={[
                styles.inputWrapper,
                {
                  backgroundColor: isDark ? "rgba(255,255,255,0.04)" : colors.surface,
                  borderColor: localError ? "#EF4444" : colors.border,
                },
              ]}
            >
              <Mail size={16} color={colors.textSecondary} style={{ marginRight: 8 }} />
              <TextInput
                value={email}
                onChangeText={(val) => {
                  setEmail(val);
                  if (localError) setLocalError(null);
                }}
                placeholder="teammate@yourcompany.com"
                placeholderTextColor={colors.placeholder}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                style={[styles.input, { color: colors.text }]}
              />
            </View>
            {localError && <Text style={styles.errorText}>{localError}</Text>}
          </View>

          {/* Action Buttons */}
          <View style={styles.actionRow}>
            <Pressable
              onPress={onClose}
              disabled={loading}
              style={({ pressed }) => [
                styles.cancelBtn,
                { borderColor: colors.border },
                pressed && { opacity: 0.7 },
              ]}
            >
              <Text style={[styles.cancelBtnText, { color: colors.textSecondary }]}>
                Cancel
              </Text>
            </Pressable>

            <Pressable
              onPress={handleSend}
              disabled={loading}
              style={({ pressed }) => [
                styles.sendBtn,
                { backgroundColor: colors.primary },
                (loading || pressed) && { opacity: 0.8 },
              ]}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <UserPlus size={16} color="#FFFFFF" />
                  <Text style={styles.sendBtnText}>Send Invitation</Text>
                </>
              )}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.65)",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  modalCard: {
    width: "100%",
    maxWidth: 480,
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  infoBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 14,
    marginBottom: 16,
  },
  infoBannerText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
  },
  inputSection: {
    marginBottom: 20,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 6,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
  },
  input: {
    flex: 1,
    fontSize: 14,
    height: "100%",
  },
  errorText: {
    color: "#EF4444",
    fontSize: 12,
    marginTop: 4,
  },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 10,
  },
  cancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: "600",
  },
  sendBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
  },
  sendBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "600",
  },
});
