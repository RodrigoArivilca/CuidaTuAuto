import { Platform } from "react-native";
import type { Health } from "../types";

export const DEFAULT_API_URL =
  process.env.EXPO_PUBLIC_API_URL?.trim() ||
  (Platform.OS === "android"
    ? "http://10.0.2.2:4000"
    : "http://localhost:4000");
export class ApiError extends Error {
  constructor(
    message: string,
    public status = 0,
    public code = "NETWORK_ERROR",
  ) {
    super(message);
    this.name = "ApiError";
  }
}
export function normalizeApiUrl(input: string): string {
  const clean = input
    .trim()
    .replace(/\/+$/, "")
    .replace(/\/api$/, "");
  let parsed: URL;
  try {
    parsed = new URL(clean);
  } catch {
    throw new Error(
      "Escribe una URL completa, por ejemplo http://localhost:4000.",
    );
  }
  if (
    !["http:", "https:"].includes(parsed.protocol) ||
    parsed.username ||
    parsed.password ||
    parsed.search ||
    parsed.hash
  )
    throw new Error("Usa una URL http o https sin credenciales ni parámetros.");
  return clean;
}
export class Api {
  constructor(
    public baseUrl: string,
    public token: string | null = null,
    private onUnauthorized?: () => void,
  ) {}
  async request<T>(
    path: string,
    options: { method?: string; body?: unknown; public?: boolean } = {},
  ): Promise<T> {
    const abort = new AbortController();
    const timer = setTimeout(() => abort.abort(), 25000);
    try {
      const response = await fetch(`${this.baseUrl}${path}`, {
        method: options.method || "GET",
        signal: abort.signal,
        headers: {
          "Content-Type": "application/json",
          ...(this.token && !options.public
            ? { Authorization: `Bearer ${this.token}` }
            : {}),
        },
        ...(options.body === undefined
          ? {}
          : { body: JSON.stringify(options.body) }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        if (response.status === 401 && this.token && !options.public)
          this.onUnauthorized?.();
        throw new ApiError(
          data?.error?.message || `La API respondió ${response.status}.`,
          response.status,
          data?.error?.code || "API_ERROR",
        );
      }
      if (data === null)
        throw new ApiError(
          "La API devolvió una respuesta vacía. Revisa la dirección de conexión.",
          response.status,
        );
      return data as T;
    } catch (err) {
      if (err instanceof ApiError) throw err;
      const timeout = err instanceof Error && err.name === "AbortError";
      throw new ApiError(
        timeout
          ? "La conexión tardó demasiado. Comprueba que el backend esté iniciado."
          : `No se pudo conectar a ${this.baseUrl}. Revisa el backend y la configuración de conexión.`,
      );
    } finally {
      clearTimeout(timer);
    }
  }
  health(): Promise<Health> {
    return this.request("/health", { public: true });
  }
  get<T>(path: string) {
    return this.request<T>(`/api${path}`);
  }
  post<T>(path: string, body: unknown = {}, isPublic = false) {
    return this.request<T>(`/api${path}`, {
      method: "POST",
      body,
      public: isPublic,
    });
  }
  patch<T>(path: string, body: unknown) {
    return this.request<T>(`/api${path}`, { method: "PATCH", body });
  }
  delete<T>(path: string) {
    return this.request<T>(`/api${path}`, { method: "DELETE" });
  }
}
