import { useCallback, useState } from "react";

import {
  getProfileFromSupabase,
  updateProfileWithSupabase,
} from "../services/profileService";
import type {
  UpdateProfileParams,
  UserProfileData,
} from "../types/profile";

export function useProfile() {
  const [isLoading, setIsLoading] = useState(false);

  const updateProfile = useCallback(
    async (params: UpdateProfileParams): Promise<UserProfileData> => {
      setIsLoading(true);
      try {
        return await updateProfileWithSupabase(params);
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  const getProfile = useCallback(async (): Promise<UserProfileData | null> => {
    setIsLoading(true);
    try {
      return await getProfileFromSupabase();
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { updateProfile, getProfile, isLoading };
}
