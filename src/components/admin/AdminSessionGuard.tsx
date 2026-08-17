"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { supabase } from "@/lib/supabase";

const IDLE_TIMEOUT_MS = 30 * 60 * 1000;
const ABSOLUTE_TIMEOUT_MS = 8 * 60 * 60 * 1000;
const ACTIVITY_WRITE_INTERVAL_MS = 10 * 1000;
const CHECK_INTERVAL_MS = 15 * 1000;

const STORAGE_KEYS = {
  user: "sind:admin-session:user",
  startedAt: "sind:admin-session:started-at",
  lastActivity: "sind:admin-session:last-activity",
};

export default function AdminSessionGuard({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [ready, setReady] = useState(pathname === "/admin/reset-password");
  const loggingOut = useRef(false);
  const lastWrite = useRef(0);

  useEffect(() => {
    if (pathname === "/admin/reset-password") return;

    const clearTracking = () => {
      Object.values(STORAGE_KEYS).forEach((key) => localStorage.removeItem(key));
    };

    const logout = async (reason: "inactive" | "expired") => {
      if (loggingOut.current) return;
      loggingOut.current = true;
      clearTracking();
      await supabase.auth.signOut({ scope: "local" });
      window.location.replace(`/login?reason=${reason}`);
    };

    const checkTimeout = () => {
      const now = Date.now();
      const startedAt = Number(localStorage.getItem(STORAGE_KEYS.startedAt));
      const lastActivity = Number(
        localStorage.getItem(STORAGE_KEYS.lastActivity),
      );

      if (startedAt && now - startedAt >= ABSOLUTE_TIMEOUT_MS) {
        void logout("expired");
        return;
      }
      if (lastActivity && now - lastActivity >= IDLE_TIMEOUT_MS) {
        void logout("inactive");
      }
    };

    const registerActivity = () => {
      const now = Date.now();
      const startedAt = Number(localStorage.getItem(STORAGE_KEYS.startedAt));
      const previousActivity = Number(
        localStorage.getItem(STORAGE_KEYS.lastActivity),
      );
      if (
        (startedAt && now - startedAt >= ABSOLUTE_TIMEOUT_MS) ||
        (previousActivity && now - previousActivity >= IDLE_TIMEOUT_MS)
      ) {
        checkTimeout();
        return;
      }
      if (now - lastWrite.current < ACTIVITY_WRITE_INTERVAL_MS) return;
      lastWrite.current = now;
      localStorage.setItem(STORAGE_KEYS.lastActivity, String(now));
    };

    const initialize = async () => {
      const { data, error } = await supabase.auth.getUser();
      if (error || !data.user) {
        clearTracking();
        window.location.replace("/login");
        return;
      }

      const now = Date.now();
      const trackedUser = localStorage.getItem(STORAGE_KEYS.user);
      if (trackedUser !== data.user.id) {
        localStorage.setItem(STORAGE_KEYS.user, data.user.id);
        localStorage.setItem(STORAGE_KEYS.startedAt, String(now));
        localStorage.setItem(STORAGE_KEYS.lastActivity, String(now));
      } else {
        if (!localStorage.getItem(STORAGE_KEYS.startedAt)) {
          localStorage.setItem(STORAGE_KEYS.startedAt, String(now));
        }
        if (!localStorage.getItem(STORAGE_KEYS.lastActivity)) {
          localStorage.setItem(STORAGE_KEYS.lastActivity, String(now));
        }
      }

      checkTimeout();
      if (!loggingOut.current) setReady(true);
    };

    const activityEvents: Array<keyof WindowEventMap> = [
      "pointerdown",
      "keydown",
      "touchstart",
      "scroll",
    ];
    activityEvents.forEach((event) =>
      window.addEventListener(event, registerActivity, { passive: true }),
    );

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") checkTimeout();
    };
    const onStorage = (event: StorageEvent) => {
      if (event.key === STORAGE_KEYS.user && event.newValue === null) {
        window.location.replace("/login");
        return;
      }
      if (Object.values(STORAGE_KEYS).includes(event.key || "")) checkTimeout();
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("storage", onStorage);
    const interval = window.setInterval(checkTimeout, CHECK_INTERVAL_MS);
    void initialize();

    return () => {
      activityEvents.forEach((event) =>
        window.removeEventListener(event, registerActivity),
      );
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("storage", onStorage);
      window.clearInterval(interval);
    };
  }, [pathname]);

  if (!ready) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 animate-pulse">
          Validando sessão...
        </p>
      </div>
    );
  }

  return children;
}
