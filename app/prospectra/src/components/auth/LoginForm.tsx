import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { tokens } from "../../constants/theme";
import { useTheme } from "../../hooks/useTheme";
import Button from "../ui/Button";
import PasswordField from "../ui/PasswordField";
import TextField from "../ui/TextField";
import type { LoginCredentials } from "../../services/authService";
import { authCopy } from "../../constants/constants";

interface LoginFormProps {
  onSubmit?: (credentials: LoginCredentials) => void;
  onForgotPassword?: () => void;
  isLoading?: boolean;
}

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
        value={email}
        onChangeText={setEmail}
      />
      <PasswordField label={authCopy.fields.password} placeholder={authCopy.placeholders.loginPassword} value={password} onChangeText={setPassword} />
      <Text
        onPress={onForgotPassword}
        style={[styles.forgot, { color: colors.primary }]}
      >
        {authCopy.actions.forgotPassword}
      </Text>
      <Button
        label={isLoading ? "Logging in..." : authCopy.actions.login}
        disabled={isLoading}
        onPress={() => onSubmit?.({ email, password })}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  form: { gap: tokens.spacing.md },
  forgot: {
    alignSelf: "flex-end",
    fontFamily: "DMSansMedium",
    fontSize: tokens.fontSize.sm,
    marginTop: tokens.spacing.sm,
  },
});
