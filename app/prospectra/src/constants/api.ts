const authApiPath = {
  login: "/auth/v1/token?grant_type=password",
  signup: "/auth/v1/signup",
} as const;

export { authApiPath };
