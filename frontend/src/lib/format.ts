import type { CustodyStatus } from "../types";
export const statusLabels: Record<CustodyStatus, string> = {
  pending: "Por vincular",
  active: "En custodia",
  awaiting_confirmation: "Por confirmar",
  closed: "Finalizada",
  cancelled: "Cancelada",
};
export const formatDate = (value: string | null | undefined) =>
  value
    ? new Date(value).toLocaleString("es-PE", {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";
export const isOpen = (status: CustodyStatus) =>
  ["pending", "active", "awaiting_confirmation"].includes(status);
export const errorMessage = (err: unknown) =>
  err instanceof Error
    ? err.message
    : "Ocurrió un problema. Inténtalo de nuevo.";
