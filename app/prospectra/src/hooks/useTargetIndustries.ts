import { useCallback, useState } from "react";

import {
  getTargetIndustries,
  saveTargetIndustries as saveTargetIndustriesService,
} from "../services/targetIndustryService";

export function useTargetIndustries() {
  const [isLoading, setIsLoading] = useState(false);

  const saveTargetIndustries = useCallback(
    async (industries: string[]): Promise<string[]> => {
      setIsLoading(true);
      try {
        return await saveTargetIndustriesService(industries);
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  const fetchTargetIndustries = useCallback(async (): Promise<string[]> => {
    setIsLoading(true);
    try {
      return await getTargetIndustries();
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    saveTargetIndustries,
    fetchTargetIndustries,
    isLoading,
  };
}
