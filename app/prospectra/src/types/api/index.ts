interface ApiError {
  error_description?: string;
  msg?: string;
  message?: string;
  response?: {
    data?: {
      detail?: string;
      message?: string;
      error_description?: string;
      msg?: string;
    };
  };
}

export type { ApiError };
