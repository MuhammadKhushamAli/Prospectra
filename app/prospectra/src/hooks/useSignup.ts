import { useCallback, useState } from "react";

import {
  signupWithSupabase,
  type AuthResponse,
  type SignupCredentials,
} from "../services/authService";

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
