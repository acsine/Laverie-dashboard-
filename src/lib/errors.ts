export type AppError = {
  code: string;
  message: string;
};

export function appError(code: string, message: string): AppError {
  return { code, message };
}

export function isAppError(value: unknown): value is AppError {
  return (
    typeof value === "object" &&
    value !== null &&
    "code" in value &&
    "message" in value &&
    typeof (value as AppError).code === "string"
  );
}
