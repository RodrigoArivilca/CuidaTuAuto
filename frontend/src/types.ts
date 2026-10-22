export type Role = "owner" | "caretaker";
export type LocationSource = "manual" | "device" | "demo";
export type CustodyStatus =
  | "pending"
  | "active"
  | "awaiting_confirmation"
  | "closed"
  | "cancelled";
export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
}
export interface Vehicle {
  id: string;
  ownerId: string;
  plate: string;
  brand: string;
  model: string;
  color: string;
  createdAt: string;
}
export interface Round {
  id: string;
  custodyId: string;
  caretakerId: string;
  status: "ok" | "incident";
  note: string;
  latitude: number | null;
  longitude: number | null;
  locationSource: LocationSource;
  createdAt: string;
}
export interface Evidence {
  id: string;
  custodyId: string;
  roundId: string | null;
  phase: "initial" | "round" | "final";
  position: string | null;
  note: string;
  source: "upload" | "camera" | "demo";
  imageData: string;
  createdAt: string;
}
export interface Custody {
  id: string;
  ownerId: string;
  caretakerId: string | null;
  vehicleId: string;
  code: string;
  qrPayload: string;
  status: CustodyStatus;
  locationLabel: string;
  latitude: number | null;
  longitude: number | null;
  locationSource: LocationSource;
  roundIntervalMinutes: number;
  createdAt: string;
  startedAt: string | null;
  endedAt: string | null;
  closeOutcome: "conforme" | "observacion" | null;
  closeNote: string | null;
  vehicle: Vehicle;
  ownerName: string;
  caretakerName: string | null;
  rounds: Round[];
  evidence: Evidence[];
}
export interface Health {
  ok: boolean;
  databaseMode: "pglite" | "postgres";
  demoMode: boolean;
}
export interface Session {
  token: string;
  user: User;
}
export interface Photo {
  imageData: string;
  source: "camera" | "upload";
}
export interface GeoPoint {
  latitude: number | null;
  longitude: number | null;
  locationSource: LocationSource;
}
