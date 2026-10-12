import { useCallback, useState } from "react";

import {
  loginWithSupabase,
  type AuthResponse,
  type LoginCredentials,
} from "../services/authService";

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
