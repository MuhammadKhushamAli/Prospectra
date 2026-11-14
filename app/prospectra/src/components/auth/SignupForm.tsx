import { useState } from "react";
import { StyleSheet, View } from "react-native";

import { tokens } from "../../constants/theme";
import Button from "../ui/Button";
import PasswordField from "../ui/PasswordField";
import TextField from "../ui/TextField";
import type { SignupFormProps } from "../../types/auth";
import { authCopy, authValidationMessages } from "../../constants/constants";
import { isFreeEmailProvider } from "../../validation/domainValidation";

export type { SignupFormProps };

export default function SignupForm({ onSubmit }: SignupFormProps) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const emailError =
    email.trim().includes("@") && isFreeEmailProvider(email)
      ? authValidationMessages.freeEmailNotAllowed
      : null;

  return (
    <View style={styles.form}>
      <TextField
        label={authCopy.fields.fullName}
        placeholder={authCopy.placeholders.fullName}
        autoCapitalize="words"
        value={fullName}
        onChangeText={setFullName}
      />
      <TextField
        label={authCopy.fields.email}
        placeholder={authCopy.placeholders.email}
        keyboardType="email-address"
        autoCapitalize="none"
        value={email}
        onChangeText={setEmail}
        error={emailError}
      />
      <PasswordField
        label={authCopy.fields.password}
        placeholder={authCopy.placeholders.signupPassword}
        value={password}
        onChangeText={setPassword}
      />
      <PasswordField
        label={authCopy.fields.confirmPassword}
        placeholder={authCopy.placeholders.confirmPassword}
        value={confirmPassword}
        onChangeText={setConfirmPassword}
      />
      <View style={styles.submitWrap}>
        <Button
          label={authCopy.actions.signup}
          onPress={() =>
            onSubmit?.({ fullName, email, password }, confirmPassword)
          }
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  form: {
    gap: tokens.spacing.md,
  },
  submitWrap: {
    marginTop: tokens.spacing.xs,
  },
});
