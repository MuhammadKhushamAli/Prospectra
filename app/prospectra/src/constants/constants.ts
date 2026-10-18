const appName = "Prospectra";

const authMode = { login: "login", signup: "signup" } as const;
const buttonVariant = { primary: "primary", ghost: "ghost" } as const;
const notificationVariant = { error: "error", success: "success" } as const;
const authCopy = {
  login: {
    title: "Welcome back",
    subtitle: "Log in to continue to Prospectra.",
    footerPrompt: "Don't have an account? ",
    footerAction: "Sign up",
    success: "Signed in successfully.",
  },
  signup: {
    title: "Create your account",
    subtitle: "Start finding and contacting clients.",
    footerPrompt: "Already have an account? ",
    footerAction: "Log in",
    success: "Account created successfully.",
  },
  tabs: { login: "Log in", signup: "Sign up" },
  fields: {
    fullName: "Full name",
    email: "Email",
    password: "Password",
    confirmPassword: "Confirm password",
  },
  placeholders: {
    fullName: "Your name",
    email: "you@company.com",
    loginPassword: "Enter your password",
    signupPassword: "Create a password",
    confirmPassword: "Repeat your password",
  },
  actions: {
    forgotPassword: "Forgot password?",
    login: "Log in",
    signup: "Create account",
    continueWithGoogle: "Continue with Google",
  },
  passwordVisibility: { show: "Show password", hide: "Hide password" },
  divider: "or",
} as const;

const authValidationMessages = {
  invalidEmail: "Enter a valid email address.",
  invalidPassword:
    "Password must be at least 8 characters with uppercase, lowercase, number, and special character.",
  missingFullName: "Enter your full name.",
  passwordMismatch: "Passwords do not match.",
} as const;

const domainVerificationCopy = {
  title: "Verify your domain",
  subtitle: "Connect and authenticate your business domain.",
  fields: {
    domain: "Domain name",
  },
  placeholders: {
    domain: "e.g. yourcompany.com",
  },
  actions: {
    verify: "Verify domain",
    verifying: "Verifying domain...",
    checkStatus: "Verify status",
    checkingStatus: "Checking status...",
    continueToDashboard: "Continue to Dashboard",
    backToLogin: "Back to login",
  },
  success: "Domain verified successfully.",
} as const;

const domainValidationMessages = {
  missingDomain: "Enter your domain name.",
  invalidDomain: "Enter a valid domain name (e.g. yourcompany.com).",
  freeEmailProvider: "Free email providers (e.g. Gmail, Yahoo, Outlook) are not allowed. Please enter your business domain.",
} as const;

const organizationRegistrationCopy = {
  title: "Register organization",
  subtitle: "Set up your workspace to manage clients and team.",
  fields: {
    name: "Organization name",
  },
  placeholders: {
    name: "e.g. Acme Technologies",
  },
  actions: {
    submit: "Continue to domain setup",
    submitting: "Registering organization...",
    backToLogin: "Back to login",
  },
  success: "Organization registered successfully.",
} as const;

const organizationValidationMessages = {
  missingName: "Enter your organization name.",
  nameTooShort: "Organization name must be at least 2 characters.",
  nameTooLong: "Organization name must be less than 100 characters.",
} as const;

const profileSetupCopy = {
  title: "Complete your profile",
  subtitle: "Set up your professional headline to personalize your outreach profile.",
  fields: {
    headline: "Professional headline",
  },
  placeholders: {
    headline: "e.g. Lead Consultant & Founder",
  },
  actions: {
    submit: "Continue to organization setup",
    submitting: "Saving profile...",
    backToLogin: "Back to login",
  },
  success: "Profile saved successfully.",
} as const;

const profileValidationMessages = {
  missingHeadline: "Enter your professional headline.",
  headlineTooShort: "Headline must be at least 2 characters.",
  headlineTooLong: "Headline must be less than 120 characters.",
} as const;

const homeCopy = {
  title: "Workspace Dashboard",
  subtitle: "Your organization and verified domain are active.",
  user: "Account",
  organization: "Organization",
  domain: "Verified Domain",
  verifiedBadge: "VERIFIED",
  statusActive: "Active",
  readyTitle: "Ready to Prospect",
  readyDescription: "Your domain is authenticated and ready for cold outreach campaigns.",
  actions: {
    signOut: "Sign out",
    manageDomain: "Manage Domain",
  },
} as const;

import type { AuthMode } from "../types/auth";
import type { ButtonVariant, NotificationVariant } from "../types/ui";

export {
  appName,
  authCopy,
  authMode,
  authValidationMessages,
  buttonVariant,
  domainValidationMessages,
  domainVerificationCopy,
  homeCopy,
  notificationVariant,
  organizationRegistrationCopy,
  organizationValidationMessages,
  profileSetupCopy,
  profileValidationMessages,
};
export type { AuthMode, ButtonVariant, NotificationVariant };
