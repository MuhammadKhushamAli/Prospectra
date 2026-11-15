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
  freeEmailNotAllowed:
    "Free email providers (e.g. Gmail, Yahoo, Outlook) are not allowed on sign up. Please use your organization domain email.",
  invalidPassword:
    "Password must be at least 8 characters with uppercase, lowercase, number, and special character.",
  missingFullName: "Enter your full name.",
  passwordMismatch: "Passwords do not match.",
} as const;

const domainVerificationCopy = {
  badge: "Domain Auth",
  title: "Verify your domain",
  subtitle: "Authenticate your organization domain to unlock email verification and outreach.",
  fields: {
    domain: "Domain name",
    mailboxEmail: "Main mailbox email",
  },
  placeholders: {
    domain: "e.g. yourcompany.com",
    mailboxEmail: "e.g. main-inbox@gmail.com or you@company.com",
  },
  actions: {
    verify: "Verify domain",
    verifying: "Verifying domain...",
    checkStatus: "Verify status",
    checkingStatus: "Checking status...",
    continueToEmail: "Continue to Email Verification",
    backToLogin: "Back to login",
  },
  success: "Domain verified successfully. Continuing to email verification...",
} as const;

const emailVerificationCopy = {
  badge: "Email Auth",
  title: "Verify your email",
  subtitle: "Select your email provider and confirm your SMTP details to enable sending.",
  fields: {
    senderEmail: "Verified account email",
    emailProvider: "Email Service Provider (ESP)",
    customEmailProvider: "Other Email Provider Name",
    smtpServer: "SMTP Server Host",
    smtpPort: "SMTP Port",
    dkimSelector: "DKIM Selector (optional)",
    smtpUsername: "Main Mailbox Email (SMTP Username)",
    smtpPassword: "SMTP App Password",
  },
  placeholders: {
    customEmailProvider: "e.g. Fastmail, PrivateEmail, GoDaddy",
    smtpServer: "e.g. smtp.hostinger.com",
    smtpPort: "e.g. 465 or 587",
    dkimSelector: "e.g. google, selector1, default",
    smtpUsername: "e.g. main-inbox@gmail.com or you@company.com",
    smtpPassword: "Enter your SMTP app password for sending",
  },
  actions: {
    verifyEmail: "Verify Email & Save SMTP",
    verifyingEmail: "Verifying DNS, AuthRes & SMTP...",
    continueToDashboard: "Continue to Dashboard",
    backToLogin: "Back to login",
  },
  emailVerifiedSuccess: "Email and SMTP configuration verified and saved successfully!",
} as const;

const domainValidationMessages = {
  missingDomain: "Enter your domain name.",
  invalidDomain: "Enter a valid domain name (e.g. yourcompany.com).",
  freeEmailProvider: "Free email providers (e.g. Gmail, Yahoo, Outlook) are not allowed. Please enter your business domain.",
  domainEmailMismatch: "The domain entered must match the domain of the email address you signed in with.",
  missingMailboxEmail: "Enter your main mailbox email address.",
  invalidMailboxEmail: "Enter a valid main mailbox email address.",
  missingProvider: "Select your email provider before verifying your email.",
  missingCustomProvider: "Enter your custom email provider name.",
  missingSmtpServer: "Enter the SMTP server hostname.",
  invalidSmtpPort: "Enter a valid SMTP port between 1 and 65535.",
  missingSmtpPassword: "Enter your SMTP app password.",
} as const;

const organizationRegistrationCopy = {
  title: "Register organization",
  subtitle: "Set up your workspace and discovery threshold to manage clients and outreach.",
  fields: {
    name: "Organization name",
    threshold: "Company finder threshold",
  },
  placeholders: {
    name: "e.g. Acme Technologies",
    threshold: "e.g. 500",
  },
  helpers: {
    threshold: "Target queue size of pending prospective companies to discover continuously.",
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
  missingThreshold: "Enter a company finder threshold.",
  invalidThreshold: "Company finder threshold must be a whole number between 1 and 100,000.",
} as const;

const profileSetupCopy = {
  title: "Complete your profile",
  subtitle: "Set up your headline, social profiles, and skills to unlock outreach and workspace operations.",
  fields: {
    fullName: "Full name",
    headline: "Professional headline",
    githubUrl: "GitHub Profile",
    linkedinUrl: "LinkedIn Profile",
  },
  placeholders: {
    fullName: "e.g. Alex Mercer",
    headline: "e.g. Lead Consultant & Founder",
    githubUrl: "https://github.com/username",
    linkedinUrl: "https://linkedin.com/in/username",
  },
  githubConnect: {
    button: "Connect GitHub",
    connecting: "Connecting to GitHub...",
    connected: "GitHub Connected",
    orManual: "or enter GitHub profile URL manually",
    modalTitle: "Connect GitHub",
    modalSubtitle: "Enter your GitHub username to automatically fetch and verify your profile URL.",
    modalInputPlaceholder: "e.g. torvalds",
    modalSubmit: "Fetch & Connect",
    modalCancel: "Cancel",
  },
  actions: {
    submit: "Continue to projects",
    submitting: "Saving profile...",
    backToDashboard: "Back to Dashboard",
    backToLogin: "Sign out",
  },
  success: "Profile saved successfully.",
} as const;

const profileValidationMessages = {
  missingFullName: "Full name is required.",
  fullNameTooShort: "Full name must be at least 2 characters.",
  missingHeadline: "Enter your professional headline.",
  headlineTooShort: "Headline must be at least 2 characters.",
  headlineTooLong: "Headline must be less than 120 characters.",
  missingGithubUrl: "GitHub profile URL is required.",
  invalidGithubUrl: "Enter a valid GitHub profile URL (e.g. https://github.com/username).",
  missingLinkedinUrl: "LinkedIn profile URL is required.",
  invalidLinkedinUrl: "Enter a valid LinkedIn profile URL (e.g. https://linkedin.com/in/username).",
} as const;

const skillsCopy = {
  sectionTitle: "Skills & Expertise",
  sectionSubtitle: "Add skills to power intelligent client-matching and personalized outreach.",
  inputLabel: "Add a skill",
  placeholder: "e.g. Cold Email, Lead Generation",
  addButton: "Add Skill",
  suggestionsTitle: "Quick Suggestions",
  emptySkillsText: "No skills added yet. Enter a skill name, or tap quick suggestions below.",
  skillsCount: "skills added",
} as const;

const skillsValidationMessages = {
  emptySkill: "Enter a skill name.",
  skillTooShort: "Skill name must be at least 2 characters.",
  skillTooLong: "Skill name must be less than 50 characters.",
  duplicateSkill: "This skill has already been added.",
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
  profileIncompleteTitle: "Profile Setup Required",
  profileIncompleteDesc: "Complete your professional headline and skills to unlock lead prospecting, company search, and automated outreach operations.",
  completeProfileButton: "Complete Profile",
  profileCompleteBadge: "Active",
  editProfile: "Edit Profile",
  operationsLockedAlert: "Operation Locked: You must complete your profile before initiating prospecting or workspace operations.",
  lockedBadge: "Locked",
  actions: {
    signOut: "Sign out",
    manageDomain: "Manage Domain",
    startProspecting: "Start Prospecting",
    findCompanies: "Find Companies",
    lockedAction: "Locked (Profile Required)",
  },
} as const;

const targetIndustriesCopy = {
  title: "Target Industries",
  subtitle: "Select the industries and market sectors you want to target for prospect discovery and outreach.",
  popularTitle: "Select Target Industries",
  customLabel: "Add Custom Industry",
  customPlaceholder: "e.g. Clean Energy, B2B Logistics",
  addButton: "Add Industry",
  selectedTitle: "Selected Industries",
  selectedCount: "industries selected",
  emptySelected: "No industries selected yet. Tap from the options below or add custom sectors.",
  actions: {
    submit: "Complete Profile & Finish",
    submitting: "Saving target industries...",
    backToProfile: "Back to profile details",
    backToDashboard: "Back to Dashboard",
  },
  success: "Target industries saved! Your profile setup is now complete.",
  validation: {
    minOneRequired: "Please select at least one target industry to complete your profile.",
    duplicate: "This industry has already been added.",
    tooShort: "Industry name must be at least 2 characters.",
    tooLong: "Industry name must be less than 60 characters.",
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
  emailVerificationCopy,
  homeCopy,
  notificationVariant,
  organizationRegistrationCopy,
  organizationValidationMessages,
  profileSetupCopy,
  profileValidationMessages,
  skillsCopy,
  skillsValidationMessages,
  targetIndustriesCopy,
};
export type { AuthMode, ButtonVariant, NotificationVariant };
