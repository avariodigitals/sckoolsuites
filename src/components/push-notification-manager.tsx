"use client";

import { useEffect, useState } from "react";
import { Bell, BellOff, Download, Share, X } from "lucide-react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export function PushNotificationManager() {
  const [status, setStatus] = useState<"loading" | "granted" | "denied" | "default" | "unsupported">("loading");
  const [showPrompt, setShowPrompt] = useState(false);
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [showIOSInstall, setShowIOSInstall] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  const isIOS = typeof window !== "undefined" && /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
  const isStandalone = typeof window !== "undefined" && (window.matchMedia("(display-mode: standalone)").matches || (navigator as any).standalone);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const standalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as any).standalone;
    if (standalone) {
      setIsInstalled(true);
    }

    if (!("serviceWorker" in navigator)) {
      setStatus("unsupported");
      return;
    }

    navigator.serviceWorker.register("/sw.js").catch((err) => {
      console.error("[pwa] SW registration failed:", err);
    });

    const installDismissed = localStorage.getItem("pwa-install-dismissed") === "1";

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setInstallEvent(e as BeforeInstallPromptEvent);
      if (!standalone && !installDismissed) {
        setShowInstallPrompt(true);
      }
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setShowInstallPrompt(false);
      setShowIOSInstall(false);
      setInstallEvent(null);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);
    window.addEventListener("appinstalled", handleAppInstalled);

    const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    const iosInstallDismissed = localStorage.getItem("pwa-ios-install-dismissed") === "1";
    if (ios && !standalone && !iosInstallDismissed) {
      setShowIOSInstall(true);
    }

    if (ios && !standalone) {
      setStatus("unsupported");
    } else if (!("PushManager" in window)) {
      setStatus("unsupported");
    } else if (Notification.permission === "granted") {
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

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
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

  async function handleInstall() {
    if (!installEvent) return;
    await installEvent.prompt();
    const choice = await installEvent.userChoice;
    if (choice.outcome === "accepted") {
      setIsInstalled(true);
    }
    setInstallEvent(null);
    setShowInstallPrompt(false);
  }

  function handleInstallDismiss() {
    setShowInstallPrompt(false);
    localStorage.setItem("pwa-install-dismissed", "1");
  }

  function handleIOSInstallDismiss() {
    setShowIOSInstall(false);
    localStorage.setItem("pwa-ios-install-dismissed", "1");
  }

  if (status === "loading") {
    return null;
  }

  return (
    <>
      {/* Chrome/Android install prompt */}
      {showInstallPrompt && !isInstalled && (
        <div className="fixed bottom-4 left-1/2 z-50 -translate-x-1/2 sm:bottom-6">
          <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-lg">
            <Download className="h-5 w-5 text-indigo-600" />
            <div className="text-sm text-slate-700">
              <p className="font-medium">Install Sckool Suite</p>
              <p className="text-xs text-slate-500">Add to your home screen for quick access.</p>
            </div>
            <button
              onClick={handleInstall}
              className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700"
            >
              Install
            </button>
            <button
              onClick={handleInstallDismiss}
              className="rounded-lg px-2 py-1.5 text-xs text-slate-400 hover:text-slate-600"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* iOS Safari install instructions */}
      {showIOSInstall && !isInstalled && (
        <div className="fixed bottom-4 left-1/2 z-50 w-[90%] max-w-md -translate-x-1/2 sm:bottom-6">
          <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-lg">
            <div className="flex items-start gap-3">
              <Download className="mt-0.5 h-5 w-5 shrink-0 text-indigo-600" />
              <div className="text-sm text-slate-700">
                <p className="font-medium">Install Sckool Suite on your iPhone</p>
                <ol className="mt-1.5 space-y-1 text-xs text-slate-500">
                  <li>1. Tap the <span className="inline-flex items-center gap-0.5 font-medium text-slate-700"><Share className="h-3 w-3" /> Share</span> button in Safari</li>
                  <li>2. Scroll down and tap <span className="font-medium text-slate-700">Add to Home Screen</span></li>
                  <li>3. Tap <span className="font-medium text-slate-700">Add</span></li>
                </ol>
                <p className="mt-1.5 text-xs text-slate-400">Then open Sckool Suite from your home screen to enable push notifications.</p>
              </div>
              <button
                onClick={handleIOSInstallDismiss}
                className="rounded-lg px-2 py-1.5 text-xs text-slate-400 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Push notification prompt (only in standalone PWA on iOS, or any browser on Android/desktop) */}
      {showPrompt && status === "default" && (
        <div className={`fixed bottom-4 left-1/2 z-40 -translate-x-1/2 sm:bottom-6 ${showInstallPrompt || showIOSInstall ? "hidden" : ""}`}>
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
      )}
    </>
  );
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
