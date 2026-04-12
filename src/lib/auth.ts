import { User } from "@/lib/types";

const KEY = "aman_store_current_user";
const EXPIRY_KEY = "aman_store_session_expiry";
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

export function saveSession(user: User): void {
  if (typeof window === "undefined") return;
  const expiry = Date.now() + THIRTY_DAYS_MS;
  localStorage.setItem(KEY, JSON.stringify(user));
  localStorage.setItem(EXPIRY_KEY, String(expiry));
  // Also keep sessionStorage in sync for legacy reads in other components
  sessionStorage.setItem(KEY, JSON.stringify(user));
}

export function getSession(): User | null {
  if (typeof window === "undefined") return null;

  // Check localStorage for long-lived session
  const raw = localStorage.getItem(KEY);
  const expiry = localStorage.getItem(EXPIRY_KEY);

  if (raw && expiry) {
    if (Date.now() < Number(expiry)) {
      const user: User = JSON.parse(raw);
      // Refresh sessionStorage so legacy reads still work
      sessionStorage.setItem(KEY, raw);
      return user;
    } else {
      // Expired – clean up
      clearSession();
      return null;
    }
  }

  // Fallback: check old sessionStorage (e.g., tab was never closed during this session)
  const sessionRaw = sessionStorage.getItem(KEY);
  if (sessionRaw) return JSON.parse(sessionRaw);

  return null;
}

export function clearSession(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(KEY);
  localStorage.removeItem(EXPIRY_KEY);
  sessionStorage.removeItem(KEY);
}
