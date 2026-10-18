import { useCallback, useState } from "react";

import { signupWithSupabase } from "../services/authService";
import type { AuthResponse, SignupCredentials } from "../types/auth";

export function useSignup() {
  const [isLoading, setIsLoading] = useState(false);
  const signup = useCallback(
    async (credentials: SignupCredentials): Promise<AuthResponse> => {
      setIsLoading(true);
      try {
        return await signupWithSupabase(credentials);
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );
  return { signup, isLoading };
}
