import type {
  LoginCredentials,
  SignupCredentials,
} from "../types/auth";
import { authValidationMessages } from "../constants/constants";

export const passwordRegex =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/;
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateLogin(credentials: LoginCredentials): string | null {
  if (!emailRegex.test(credentials.email.trim()))
    return authValidationMessages.invalidEmail;
  if (!passwordRegex.test(credentials.password))
    return authValidationMessages.invalidPassword;
  return null;
}

export function validateSignup(
  credentials: SignupCredentials,
  confirmPassword: string,
): string | null {
  if (!credentials.fullName.trim())
    return authValidationMessages.missingFullName;
  if (!emailRegex.test(credentials.email.trim()))
    return authValidationMessages.invalidEmail;
  if (!passwordRegex.test(credentials.password))
    return authValidationMessages.invalidPassword;
  if (credentials.password !== confirmPassword)
    return authValidationMessages.passwordMismatch;
  return null;
}
