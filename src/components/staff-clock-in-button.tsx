"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Clock, Camera, X, MapPin, CheckCircle2, AlertCircle } from "lucide-react";

type ClockStatus = {
  isClockedIn: boolean;
  lastClockIn: { timestamp: string; facePhotoUrl: string | null } | null;
  lastClockOut: { timestamp: string } | null;
};

export function StaffClockInButton() {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<ClockStatus | null>(null);
  const [, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [photoBlob, setPhotoBlob] = useState<Blob | null>(null);
  const [geo, setGeo] = useState<{ lat: number; lon: number } | null>(null);
  const [geoStatus, setGeoStatus] = useState<"pending" | "ok" | "denied" | "unavailable">("pending");
  const [cameraReady, setCameraReady] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const loadStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/staff/clock-in", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setStatus(data);
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (open) {
      void loadStatus().catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setCameraReady(false);
  }, []);

  const startCamera = useCallback(async () => {
    setError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: 480, height: 360 },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          setCameraReady(true);
        };
      }
    } catch {
      setError("Could not access camera. Please allow camera permission.");
    }
  }, []);

  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = 480;
    canvas.height = 360;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, 480, 360);
    canvas.toBlob((blob) => {
      if (blob) setPhotoBlob(blob);
    }, "image/jpeg", 0.8);
  }, []);

  const getGeolocation = useCallback(() => {
    if (!navigator.geolocation) {
      setGeoStatus("unavailable");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGeo({ lat: pos.coords.latitude, lon: pos.coords.longitude });
        setGeoStatus("ok");
      },
      () => {
        setGeoStatus("denied");
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, []);

  useEffect(() => {
    if (open) {
      void startCamera().catch(() => {});
      getGeolocation();
    }
    return () => {
      stopCamera();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  async function handleSubmit(type: "CLOCK_IN" | "CLOCK_OUT") {
    if (!photoBlob) {
      setError("Please capture a photo first.");
      return;
    }
    setSubmitting(true);
    setError("");
    setMessage("");

    const formData = new FormData();
    formData.append("facePhoto", photoBlob, "clock-in.jpg");
    formData.append("type", type);
    if (geo) {
      formData.append("latitude", String(geo.lat));
      formData.append("longitude", String(geo.lon));
    }

    try {
      const res = await fetch("/api/staff/clock-in", {
        method: "POST",
        body: formData,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.error ?? "Clock-in failed.");
      } else {
        setMessage(type === "CLOCK_IN" ? "Clocked in successfully!" : "Clocked out successfully!");
        setPhotoBlob(null);
        await loadStatus();
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  function handleClose() {
    setOpen(false);
    stopCamera();
    setPhotoBlob(null);
    setError("");
    setMessage("");
  }

  const now = new Date().toLocaleString();

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
        title="Staff Clock In / Out"
      >
        <Clock className="h-4 w-4 text-slate-500" />
        <span className="hidden sm:inline">Clock In</span>
        {status?.isClockedIn && (
          <span className="h-2 w-2 rounded-full bg-emerald-500" title="Clocked in" />
        )}
      </button>

      {open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
              <h3 className="text-sm font-semibold text-slate-900">Staff Clock In / Out</h3>
              <button onClick={handleClose} className="text-slate-400 hover:text-slate-600">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3 p-4">
              {status && (
                <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs">
                  {status.isClockedIn ? (
                    <>
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      <span className="text-slate-700">
                        Clocked in at{" "}
                        {new Date(status.lastClockIn?.timestamp ?? "").toLocaleTimeString()}
                      </span>
                    </>
                  ) : (
                    <>
                      <Clock className="h-4 w-4 text-slate-400" />
                      <span className="text-slate-600">Not clocked in today</span>
                    </>
                  )}
                </div>
              )}

              <p className="text-center text-xs text-slate-500">{now}</p>

              <div className="relative mx-auto w-full max-w-xs overflow-hidden rounded-xl border border-slate-200 bg-slate-900">
                {photoBlob ? (
                  <img
                    src={URL.createObjectURL(photoBlob)}
                    alt="Captured"
                    className="w-full"
                  />
                ) : (
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full"
                    style={{ transform: "scaleX(-1)" }}
                  />
                )}
                <canvas ref={canvasRef} className="hidden" />
              </div>

              {error && (
                <div className="flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  {error}
                </div>
              )}

              {message && (
                <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  {message}
                </div>
              )}

              <div className="flex items-center gap-2 text-xs text-slate-500">
                <MapPin className="h-4 w-4" />
                {geoStatus === "ok" && geo ? (
                  <span>Location: {geo.lat.toFixed(4)}, {geo.lon.toFixed(4)}</span>
                ) : geoStatus === "denied" ? (
                  <span className="text-amber-600">Location permission denied</span>
                ) : geoStatus === "unavailable" ? (
                  <span className="text-amber-600">Geolocation unavailable</span>
                ) : (
                  <span>Getting location...</span>
                )}
              </div>

              <div className="flex gap-2">
                {!photoBlob ? (
                  <button
                    type="button"
                    onClick={capturePhoto}
                    disabled={!cameraReady}
                    className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 disabled:opacity-50 hover:bg-slate-50"
                  >
                    <Camera className="h-4 w-4" />
                    Capture Photo
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setPhotoBlob(null);
                      void startCamera();
                    }}
                    className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                  >
                    Retake
                  </button>
                )}
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => void handleSubmit("CLOCK_IN")}
                  disabled={submitting || !photoBlob}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-medium text-white disabled:opacity-50 hover:bg-emerald-700"
                >
                  {submitting ? "Processing..." : "Clock In"}
                </button>
                <button
                  type="button"
                  onClick={() => void handleSubmit("CLOCK_OUT")}
                  disabled={submitting || !photoBlob}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-slate-800 px-3 py-2 text-xs font-medium text-white disabled:opacity-50 hover:bg-slate-900"
                >
                  {submitting ? "Processing..." : "Clock Out"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
