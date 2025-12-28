import { z } from "zod";

type FetchJsonOptions<T> = {
  schema?: z.ZodType<T>;
};

function extractErrorMessage(payload: unknown): string | null {
  if (payload && typeof payload === "object" && "error" in payload) {
    const error = (payload as { error?: unknown }).error;
    if (typeof error === "string" && error.trim()) {
      return error;
    }
  }
  return null;
}

export async function fetchJson<T>(
  input: RequestInfo,
  init?: RequestInit,
  options: FetchJsonOptions<T> = {},
): Promise<T> {
  const response = await fetch(input, init);
  const contentType = response.headers.get("content-type") ?? "";
  const isJson = contentType.includes("application/json");
  const payload = isJson ? await response.json() : await response.text();

  if (!response.ok) {
    const errorMessage =
      extractErrorMessage(payload) || response.statusText || "Request failed.";
    throw new Error(errorMessage);
  }

  if (options.schema) {
    return options.schema.parse(payload);
  }

  return payload as T;
}
