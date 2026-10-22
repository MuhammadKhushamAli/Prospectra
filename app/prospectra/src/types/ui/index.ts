import type { TextInputProps } from "react-native";
import { buttonVariants, notificationVariants } from "../../constants/ui";

type ButtonVariant = (typeof buttonVariants)[number];
type NotificationVariant = (typeof notificationVariants)[number];

interface ButtonProps {
  label: string;
  variant?: ButtonVariant;
  onPress?: () => void;
  disabled?: boolean;
}

interface TextFieldProps extends TextInputProps {
  label?: string;
  rightSlot?: React.ReactNode;
  error?: string | null;
}

interface PasswordFieldProps extends TextInputProps {
  label?: string;
  rightSlot?: React.ReactNode;
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

// Re-export runtime constants for backward compatibility
export { buttonVariants, notificationVariants };
