const backendApiPath = {
  verifyDomain: "/api/v1/verify-domain",
  domainStatus: "/api/v1/domain-status",
  searchCompany: "/api/v1/search-company",
  writeEmail: "/api/v1/write-email",
  jobWebhookStream: "/api/v1/ws/webhooks",
} as const;

export { backendApiPath };
