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
    backToLogin: "Back to login",
  },
  success: "Domain verified successfully.",
} as const;

const domainValidationMessages = {
  missingDomain: "Enter your domain name.",
  invalidDomain: "Enter a valid domain name (e.g. yourcompany.com).",
  freeEmailProvider: "Free email providers (e.g. Gmail, Yahoo, Outlook) are not allowed. Please enter your business domain.",
} as const;

type AuthMode = (typeof authMode)[keyof typeof authMode];
type ButtonVariant = (typeof buttonVariant)[keyof typeof buttonVariant];
type NotificationVariant =
  (typeof notificationVariant)[keyof typeof notificationVariant];

export {
  appName,
  authCopy,
  authMode,
  authValidationMessages,
  buttonVariant,
  domainValidationMessages,
  domainVerificationCopy,
  notificationVariant,
};
export type { AuthMode, ButtonVariant, NotificationVariant };
