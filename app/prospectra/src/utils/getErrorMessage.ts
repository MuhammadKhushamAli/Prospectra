import axios from "axios";

interface ApiError {
  error_description?: string;
  msg?: string;
  message?: string;
}

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
