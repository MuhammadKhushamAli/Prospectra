import type { Session, User } from "@supabase/supabase-js";

const authModes = ["login", "signup"] as const;
type tAuthMode = typeof authModes[number];
type AuthMode = tAuthMode;

interface LoginCredentials {
  email: string;
  password: string;
}

interface SignupCredentials {
  fullName: string;
  email: string;
  password: string;
}

interface AuthResponse {
  session: Session | null;
  user: User;
}

interface LoginFormProps {
  onSubmit?: (credentials: LoginCredentials) => void;
  onForgotPassword?: () => void;
  isLoading?: boolean;
}

interface SignupFormProps {
  onSubmit?: (credentials: SignupCredentials, confirmPassword: string) => void;
  isLoading?: boolean;
}

interface AuthHeaderProps {
  mode: AuthMode;
}

interface AuthFooterLinkProps {
  mode: AuthMode;
  onPress?: () => void;
}

interface AuthModeSwitchProps {
  mode: AuthMode;
  onChange: (next: AuthMode) => void;
  reducedMotion?: boolean;
}

export type {
  tAuthMode,
  AuthMode,
  LoginCredentials,
  SignupCredentials,
  AuthResponse,
  LoginFormProps,
  SignupFormProps,
  AuthHeaderProps,
  AuthFooterLinkProps,
  AuthModeSwitchProps,
};

export {
  authModes,
};
