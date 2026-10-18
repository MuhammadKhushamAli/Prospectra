import type { TextInputProps } from "react-native";

const buttonVariants = ["primary", "ghost"] as const;
type ButtonVariant = typeof buttonVariants[number];

const notificationVariants = ["error", "success"] as const;
type NotificationVariant = typeof notificationVariants[number];

interface ButtonProps {
  label: string;
  variant?: ButtonVariant;
  onPress?: () => void;
  disabled?: boolean;
}

interface TextFieldProps extends TextInputProps {
  label?: string;
  error?: string | null;
}

interface PasswordFieldProps extends TextInputProps {
  label?: string;
  error?: string | null;
}

interface NotificationBannerProps {
  variant?: NotificationVariant;
  message: string;
  onDismiss?: () => void;
}

export type {
  ButtonVariant,
  NotificationVariant,
  ButtonProps,
  TextFieldProps,
  PasswordFieldProps,
  NotificationBannerProps,
};

export {
  buttonVariants,
  notificationVariants,
};
