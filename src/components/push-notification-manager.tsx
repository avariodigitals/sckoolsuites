"use client";

import { useEffect, useState } from "react";
import { Bell, BellOff } from "lucide-react";

export function PushNotificationManager() {
  const [status, setStatus] = useState<"loading" | "granted" | "denied" | "default" | "unsupported">("loading");
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      setStatus("unsupported");
      return;
    }

    if (Notification.permission === "granted") {
      setStatus("granted");
      registerAndSubscribe();
    } else if (Notification.permission === "denied") {
      setStatus("denied");
    } else {
      setStatus("default");
      setShowPrompt(true);
    }

    async function registerAndSubscribe() {
      try {
        const reg = await navigator.serviceWorker.register("/sw.js");
        await navigator.serviceWorker.ready;

        const existingSub = await reg.pushManager.getSubscription();
        if (existingSub) {
          await sendSubscriptionToServer(existingSub);
          return;
        }

        const pubKeyRes = await fetch("/api/push/vapid-public-key");
        if (!pubKeyRes.ok) return;
        const { publicKey } = await pubKeyRes.json();
        if (!publicKey) return;

        const sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey),
        });

        await sendSubscriptionToServer(sub);
      } catch (err) {
        console.error("[push] Registration failed:", err);
      }
    }
  }, []);

  async function handleEnable() {
    setShowPrompt(false);
    const permission = await Notification.requestPermission();
    if (permission === "granted") {
      setStatus("granted");
      try {
        const reg = await navigator.serviceWorker.register("/sw.js");
        await navigator.serviceWorker.ready;

        const existingSub = await reg.pushManager.getSubscription();
        if (existingSub) {
          await sendSubscriptionToServer(existingSub);
          return;
        }

        const pubKeyRes = await fetch("/api/push/vapid-public-key");
        if (!pubKeyRes.ok) return;
        const { publicKey } = await pubKeyRes.json();
        if (!publicKey) return;

        const sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey),
        });

        await sendSubscriptionToServer(sub);
      } catch (err) {
        console.error("[push] Subscription failed:", err);
      }
    } else {
      setStatus("denied");
    }
  }

  function handleDismiss() {
    setShowPrompt(false);
  }

  if (status === "unsupported" || status === "loading") {
    return null;
  }

  if (showPrompt && status === "default") {
    return (
      <div className="fixed bottom-4 left-1/2 z-50 -translate-x-1/2 sm:bottom-6">
        <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-lg">
          <Bell className="h-5 w-5 text-indigo-600" />
          <div className="text-sm text-slate-700">
            <p className="font-medium">Enable push notifications</p>
            <p className="text-xs text-slate-500">Get alerted about announcements, results & fees.</p>
          </div>
          <button
            onClick={handleEnable}
            className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700"
          >
            Enable
          </button>
          <button
            onClick={handleDismiss}
            className="rounded-lg px-2 py-1.5 text-xs text-slate-400 hover:text-slate-600"
          >
            Not now
          </button>
        </div>
      </div>
    );
  }

  return null;
}

async function sendSubscriptionToServer(subscription: PushSubscription) {
  const sub = subscription.toJSON();
  await fetch("/api/push/subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      endpoint: sub.endpoint,
      keys: sub.keys,
      userAgent: navigator.userAgent,
    }),
  });
}

function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const buffer = new ArrayBuffer(rawData.length);
  const outputArray = new Uint8Array(buffer);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return buffer;
}
