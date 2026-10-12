import { StyleSheet, Text, View } from "react-native";

import { tokens } from "../../constants/theme";
import { useTheme } from "../../hooks/useTheme";
import Button from "../ui/Button";
import PasswordField from "../ui/PasswordField";
import TextField from "../ui/TextField";

interface LoginFormProps { onSubmit?: () => void; onForgotPassword?: () => void; }

export default function LoginForm({ onSubmit, onForgotPassword }: LoginFormProps) {
  const colors = useTheme();
  return <View style={styles.form}><TextField label="Email" placeholder="you@company.com" keyboardType="email-address" autoCapitalize="none" /><PasswordField label="Password" placeholder="Enter your password" /><Text onPress={onForgotPassword} style={[styles.forgot, { color: colors.primary }]}>Forgot password?</Text><Button label="Log in" onPress={onSubmit} /></View>;
}

const styles = StyleSheet.create({ form: { gap: tokens.spacing.md }, forgot: { alignSelf: "flex-end", fontFamily: "DMSansMedium", fontSize: tokens.fontSize.sm, marginTop: tokens.spacing.sm } });
