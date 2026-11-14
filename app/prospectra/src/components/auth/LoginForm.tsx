import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { tokens } from "../../constants/theme";
import { useTheme } from "../../hooks/useTheme";
import Button from "../ui/Button";
import PasswordField from "../ui/PasswordField";
import TextField from "../ui/TextField";
import type { LoginFormProps } from "../../types/auth";
import { authCopy } from "../../constants/constants";

export type { LoginFormProps };

export default function LoginForm({
  onSubmit,
  onForgotPassword,
  isLoading = false,
}: LoginFormProps) {
  const colors = useTheme();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  return (
    <View style={styles.form}>
      <TextField
        label={authCopy.fields.email}
        placeholder={authCopy.placeholders.email}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="off"
        textContentType="none"
        importantForAutofill="no"
        value={email}
        onChangeText={setEmail}
      />
      <PasswordField
        label={authCopy.fields.password}
        placeholder={authCopy.placeholders.loginPassword}
        autoComplete="off"
        textContentType="none"
        importantForAutofill="no"
        value={password}
        onChangeText={setPassword}
      />
      <Pressable
        accessibilityRole="button"
        onPress={onForgotPassword}
        style={({ pressed }) => [
          styles.forgotWrap,
          { opacity: pressed ? 0.7 : 1 },
        ]}
      >
        <Text style={[styles.forgot, { color: colors.textSecondary }]}>
          {authCopy.actions.forgotPassword}
        </Text>
      </Pressable>
      <View style={styles.submitWrap}>
        <Button
          label={isLoading ? "Logging in..." : authCopy.actions.login}
          disabled={isLoading}
          onPress={() => onSubmit?.({ email, password })}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  form: {
    gap: tokens.spacing.md,
  },
  forgotWrap: {
    alignSelf: "flex-end",
  },
  forgot: {
    fontFamily: "DMSansMedium",
    fontSize: tokens.fontSize.xs,
    lineHeight: 16,
  },
  submitWrap: {
    marginTop: tokens.spacing.xs,
  },
});
