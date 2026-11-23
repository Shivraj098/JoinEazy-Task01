/** Error returned by the API, using the { error: { code, message, details } } envelope. */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details: unknown;

  constructor(status: number, code: string, message: string, details: unknown = null) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

interface ErrorEnvelope {
  error: { code: string; message: string; details?: unknown };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isErrorEnvelope(value: unknown): value is ErrorEnvelope {
  if (!isRecord(value) || !isRecord(value.error)) return false;
  return typeof value.error.code === "string" && typeof value.error.message === "string";
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`/api${path}`, {
      method,
      credentials: "same-origin",
      headers: body === undefined ? undefined : { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(0, "NETWORK_ERROR", "Could not reach the server. Check your connection.");
  }

  if (response.status === 204) return undefined as T;

  const payload: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    if (isErrorEnvelope(payload)) {
      const { code, message, details } = payload.error;
      throw new ApiError(response.status, code, message, details ?? null);
    }
    throw new ApiError(response.status, "UNKNOWN_ERROR", "Something went wrong.");
  }

  if (!isRecord(payload) || !("data" in payload)) {
    throw new ApiError(response.status, "INVALID_RESPONSE", "Unexpected response from the server.");
  }
  return payload.data as T;
}

export const api = {
  get: <T>(path: string) => request<T>("GET", path),
  post: <T>(path: string, body?: unknown) => request<T>("POST", path, body),
  patch: <T>(path: string, body?: unknown) => request<T>("PATCH", path, body),
};

/** Extracts the first message per field from a validation error's details. */
export function getFieldErrors(error: unknown): Record<string, string> {
  if (!(error instanceof ApiError) || !isRecord(error.details)) return {};
  const { fieldErrors } = error.details;
  if (!isRecord(fieldErrors)) return {};

  const result: Record<string, string> = {};
  for (const [field, messages] of Object.entries(fieldErrors)) {
    if (Array.isArray(messages) && typeof messages[0] === "string") result[field] = messages[0];
  }
  return result;
}
