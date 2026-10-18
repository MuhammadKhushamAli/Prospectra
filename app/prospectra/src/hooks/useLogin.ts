import { useCallback, useState } from "react";

import { loginWithSupabase } from "../services/authService";
import type { AuthResponse, LoginCredentials } from "../types/auth";

export function useLogin() {
  const [isLoading, setIsLoading] = useState(false);
  const login = useCallback(
    async (credentials: LoginCredentials): Promise<AuthResponse> => {
      setIsLoading(true);
      try {
        return await loginWithSupabase(credentials);
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );
  return { login, isLoading };
}
