"use client";

import { useEffect, useRef, useState } from "react";
import { useSession, signOut } from "next-auth/react";

const INACTIVITY_LIMIT_MS = 15 * 60 * 1000; // 15 minutes
const WARNING_MS = 60 * 1000; // warn 1 minute before
const CHECK_INTERVAL_MS = 10 * 1000; // check every 10 seconds

export function InactivityTimer() {
  const { data: session, status } = useSession();
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastActivityRef = useRef<number>(0);
  const [showWarning, setShowWarning] = useState(false);
  const [remainingMs, setRemainingMs] = useState(0);

  useEffect(() => {
    if (status !== "authenticated" || !session) return;

    lastActivityRef.current = Date.now();

    const activityEvents = [
      "mousedown",
      "mousemove",
      "keydown",
      "scroll",
      "touchstart",
      "click",
    ];

    function updateActivity() {
      lastActivityRef.current = Date.now();
      setShowWarning(false);
    }

    activityEvents.forEach((evt) =>
      window.addEventListener(evt, updateActivity, { passive: true })
    );

    timerRef.current = setInterval(() => {
      const elapsed = Date.now() - lastActivityRef.current;
      const remaining = INACTIVITY_LIMIT_MS - elapsed;

      if (remaining <= 0) {
        setShowWarning(false);
        signOut({ callbackUrl: "/login?reason=inactivity" });
      } else if (remaining <= WARNING_MS) {
        setShowWarning(true);
        setRemainingMs(remaining);
      } else {
        setShowWarning(false);
      }
    }, CHECK_INTERVAL_MS);

    return () => {
      activityEvents.forEach((evt) =>
        window.removeEventListener(evt, updateActivity)
      );
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [session, status]);

  if (!showWarning) return null;

  const secondsLeft = Math.ceil(remainingMs / 1000);

  return (
    <div className="fixed bottom-4 right-4 z-[9999] flex items-center gap-3 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 shadow-lg">
      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-100">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-amber-600"
        >
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
      </div>
      <div className="text-sm">
        <p className="font-semibold text-amber-900">Session expiring</p>
        <p className="text-amber-700">
          You will be logged out in {secondsLeft}s due to inactivity.
        </p>
      </div>
      <button
        onClick={() => {
          lastActivityRef.current = Date.now();
          setShowWarning(false);
        }}
        className="rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-700"
      >
        Stay signed in
      </button>
    </div>
  );
}
