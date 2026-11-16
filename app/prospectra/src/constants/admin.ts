/**
 * UI labels, copy text, and status constants for Organization Administration.
 */
export const adminCopy = {
  header: {
    title: "Organization Admin",
    subtitle: "Manage teammates, send invitations, and review role change approvals.",
    badge: "Admin",
  },
  tabs: {
    members: "Team Members",
    invites: "Invitations",
    approvals: "Owner Approvals",
    myRequests: "My Requests",
  },
  roles: {
    founder: "Founder",
    member: "Member",
    owner: "Owner",
  },
  actions: {
    invite: "Invite Teammate",
    remove: "Remove Member",
    promote: "Make Founder",
    demote: "Demote to Member",
    viewCompanies: "View Companies",
    viewEmails: "View Emails",
    approve: "Approve",
    reject: "Reject",
    revoke: "Revoke Invite",
  },
  empty: {
    members: "No other members found in your workspace.",
    invites: "No pending invitations.",
    approvals: "No pending approvals requiring your decision.",
    myRequests: "You have not submitted any promotion requests.",
  },
} as const;
