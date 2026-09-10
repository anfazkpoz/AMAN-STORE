import { User } from "@/lib/types";

const KEY = "aman_store_current_user";
const EXPIRY_KEY = "aman_store_session_expiry";
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

export function saveSession(user: User): void {
  if (typeof window === "undefined") return;
  const expiry = Date.now() + THIRTY_DAYS_MS;
  const cleanUser: User = {
    id: user.id,
    name: user.name,
    phone: user.phone,
    role: user.role,
    batch: user.batch,
    debtorId: user.debtorId,
    visiblePassword: user.visiblePassword,
  };
  localStorage.setItem(KEY, JSON.stringify(cleanUser));
  localStorage.setItem(EXPIRY_KEY, String(expiry));
  sessionStorage.setItem(KEY, JSON.stringify(cleanUser));
  // Keep cookie in sync for Next.js middleware
  document.cookie = `aman_store_session=${encodeURIComponent(JSON.stringify(cleanUser))}; path=/; max-age=${30 * 24 * 60 * 60}; SameSite=Lax`;
}

export function getSession(): User | null {
  if (typeof window === "undefined") return null;

  try {
    // Check localStorage for long-lived session
    const raw = localStorage.getItem(KEY);
    const expiry = localStorage.getItem(EXPIRY_KEY);

    if (raw && expiry) {
      if (Date.now() < Number(expiry)) {
        const user: User = JSON.parse(raw);
        // Clean out any legacy storeCode or storeName attributes
        if ((user as any).storeCode || (user as any).storeName) {
          delete (user as any).storeCode;
          delete (user as any).storeName;
          localStorage.setItem(KEY, JSON.stringify(user));
        }
        // Refresh sessionStorage so legacy reads still work
        sessionStorage.setItem(KEY, JSON.stringify(user));
        // Keep cookie in sync for middleware
        document.cookie = `aman_store_session=${encodeURIComponent(JSON.stringify(user))}; path=/; max-age=${30 * 24 * 60 * 60}; SameSite=Lax`;
        return user;
      } else {
        // Expired – clean up
        clearSession();
        return null;
      }
    }

    // Fallback: check old sessionStorage
    const sessionRaw = sessionStorage.getItem(KEY);
    if (sessionRaw) {
      const user: User = JSON.parse(sessionRaw);
      return user;
    }
  } catch (e) {
    console.error("Failed to parse session:", e);
    clearSession();
    return null;
  }

  return null;
}

export function clearSession(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(KEY);
  localStorage.removeItem(EXPIRY_KEY);
  sessionStorage.removeItem(KEY);
  document.cookie = "aman_store_session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax";
}
