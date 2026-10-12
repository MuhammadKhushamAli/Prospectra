import { StyleSheet, View } from "react-native";

import { tokens } from "../../constants/theme";
import Button from "../ui/Button";
import PasswordField from "../ui/PasswordField";
import TextField from "../ui/TextField";

interface SignupFormProps { onSubmit?: () => void; }

export default function SignupForm({ onSubmit }: SignupFormProps) {
  return <View style={styles.form}><TextField label="Full name" placeholder="Your name" autoCapitalize="words" /><TextField label="Email" placeholder="you@company.com" keyboardType="email-address" autoCapitalize="none" /><PasswordField label="Password" placeholder="Create a password" /><PasswordField label="Confirm password" placeholder="Repeat your password" /><Button label="Create account" onPress={onSubmit} /></View>;
}

const styles = StyleSheet.create({ form: { gap: tokens.spacing.md } });
