import axios from "axios";
import type { ApiError } from "../types/api";

export type { ApiError };

export function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError<ApiError>(error))
    return (
      error.response?.data?.error_description ??
      error.response?.data?.msg ??
      error.response?.data?.message ??
      "Something went wrong. Try again."
    );
  return error instanceof Error
    ? error.message
    : "Something went wrong. Try again.";
}
