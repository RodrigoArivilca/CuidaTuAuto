import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import type { Session } from "../types";
const SESSION = "cuidatuauto_session_v1";
const API_URL = "cuidatuauto_api_v1";
export async function loadSession(): Promise<Session | null> {
  try {
    const value =
      Platform.OS === "web"
        ? globalThis.sessionStorage?.getItem(SESSION)
        : await SecureStore.getItemAsync(SESSION);
    return value ? JSON.parse(value) : null;
  } catch {
    return null;
  }
}
export async function saveSession(session: Session | null): Promise<void> {
  if (Platform.OS === "web") {
    if (session)
      globalThis.sessionStorage?.setItem(SESSION, JSON.stringify(session));
    else globalThis.sessionStorage?.removeItem(SESSION);
  } else if (session)
    await SecureStore.setItemAsync(SESSION, JSON.stringify(session));
  else await SecureStore.deleteItemAsync(SESSION);
}
export async function loadApiUrl(): Promise<string | null> {
  try {
    return Platform.OS === "web"
      ? globalThis.localStorage?.getItem(API_URL)
      : await SecureStore.getItemAsync(API_URL);
  } catch {
    return null;
  }
}
export async function saveApiUrl(url: string): Promise<void> {
  if (Platform.OS === "web") globalThis.localStorage?.setItem(API_URL, url);
  else await SecureStore.setItemAsync(API_URL, url);
}
