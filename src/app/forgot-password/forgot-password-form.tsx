"use client";

import { useState, useTransition } from "react";
import { Mail, Lock, ArrowRight, ArrowLeft, CheckCircle2, Clock, XCircle, KeyRound } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type Step = "email" | "otp" | "pending" | "set-password" | "rejected" | "completed";

export function ForgotPasswordForm({ initialRequestId }: { initialRequestId?: string }) {
  const [pending, startTransition] = useTransition();
  const [step, setStep] = useState<Step>(initialRequestId ? "set-password" : "email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [requestId, setRequestId] = useState(initialRequestId ?? "");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  const handleRequestOtp = () => {
    setError("");
    setInfo("");
    startTransition(async () => {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Something went wrong.");
        return;
      }
      setInfo("If an account exists for that email, a verification code has been sent.");
      setStep("otp");
    });
  };

  const handleVerifyOtp = () => {
    setError("");
    setInfo("");
    startTransition(async () => {
      const res = await fetch("/api/auth/verify-reset-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Verification failed.");
        return;
      }
      setRequestId(data.requestId);
      setStep("pending");
    });
  };

  const handleSetPassword = () => {
    setError("");
    setInfo("");
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    startTransition(async () => {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to reset password.");
        return;
      }
      setStep("completed");
    });
  };

  const handleCheckStatus = () => {
    setError("");
    setInfo("");
    startTransition(async () => {
      const res = await fetch("/api/admin/password-reset-requests");
      if (!res.ok) {
        setError("Unable to check status. Please wait a moment and try again.");
        return;
      }
      const data = await res.json();
      const found = data.requests?.find((r: Record<string, unknown>) => r.id === requestId);
      if (!found) {
        setError("Request not found.");
        return;
      }
      const status = found.status as string;
      if (status === "approved") {
        setStep("set-password");
      } else if (status === "rejected") {
        setStep("rejected");
      } else {
        setInfo("Your request is still pending admin approval. Please check back later.");
      }
    });
  };

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div>
      )}
      {info && (
        <div className="rounded-lg bg-blue-50 p-3 text-sm text-blue-700">{info}</div>
      )}

      {step === "email" && (
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">Email address</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
              <Input
                type="email"
                placeholder="admin@school.com"
                className="h-12 pl-10"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleRequestOtp()}
              />
            </div>
          </div>
          <Button
            className="h-12 w-full gap-2 bg-indigo-600 text-base font-semibold hover:bg-indigo-700"
            disabled={pending || !email}
            onClick={handleRequestOtp}
          >
            {pending ? "Sending..." : "Send Verification Code"}
            {!pending && <ArrowRight className="h-4 w-4" />}
          </Button>
        </div>
      )}

      {step === "otp" && (
        <div className="space-y-4">
          <div className="rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
            Enter the 6-digit code sent to <strong>{email}</strong>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">Verification code</label>
            <div className="relative">
              <KeyRound className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
              <Input
                type="text"
                inputMode="numeric"
                maxLength={6}
                placeholder="123456"
                className="h-12 pl-10 text-center text-lg tracking-widest"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                onKeyDown={(e) => e.key === "Enter" && otp.length === 6 && handleVerifyOtp()}
              />
            </div>
          </div>
          <Button
            className="h-12 w-full gap-2 bg-indigo-600 text-base font-semibold hover:bg-indigo-700"
            disabled={pending || otp.length !== 6}
            onClick={handleVerifyOtp}
          >
            {pending ? "Verifying..." : "Verify Code"}
            {!pending && <ArrowRight className="h-4 w-4" />}
          </Button>
          <button
            type="button"
            onClick={() => { setStep("email"); setOtp(""); setError(""); setInfo(""); }}
            className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700"
          >
            <ArrowLeft className="h-4 w-4" /> Use a different email
          </button>
        </div>
      )}

      {step === "pending" && (
        <div className="space-y-4 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-100">
            <Clock className="h-8 w-8 text-amber-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-slate-800">Awaiting Admin Approval</h3>
            <p className="mt-2 text-sm text-slate-600">
              Your identity has been verified. An administrator has been notified and needs to approve your password reset request before you can set a new password.
            </p>
          </div>
          <Button
            variant="outline"
            className="h-11 w-full"
            disabled={pending}
            onClick={handleCheckStatus}
          >
            {pending ? "Checking..." : "Check Status"}
          </Button>
          <button
            type="button"
            onClick={() => { setStep("email"); setOtp(""); setError(""); setInfo(""); }}
            className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 mx-auto"
          >
            <ArrowLeft className="h-4 w-4" /> Start over
          </button>
        </div>
      )}

      {step === "set-password" && (
        <div className="space-y-4">
          <div className="rounded-lg bg-green-50 p-3 text-sm text-green-700">
            Your reset request was approved. Please set your new password.
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">New password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
              <Input
                type="password"
                placeholder="••••••••"
                className="h-12 pl-10"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">Confirm password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
              <Input
                type="password"
                placeholder="••••••••"
                className="h-12 pl-10"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSetPassword()}
              />
            </div>
          </div>
          <Button
            className="h-12 w-full gap-2 bg-indigo-600 text-base font-semibold hover:bg-indigo-700"
            disabled={pending || !newPassword || !confirmPassword}
            onClick={handleSetPassword}
          >
            {pending ? "Resetting..." : "Reset Password"}
            {!pending && <ArrowRight className="h-4 w-4" />}
          </Button>
        </div>
      )}

      {step === "rejected" && (
        <div className="space-y-4 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
            <XCircle className="h-8 w-8 text-red-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-slate-800">Request Rejected</h3>
            <p className="mt-2 text-sm text-slate-600">
              Your password reset request was not approved. Please contact your school administrator for assistance.
            </p>
          </div>
          <a href="/login" className="inline-block text-sm text-indigo-600 hover:text-indigo-700 hover:underline">
            Back to login
          </a>
        </div>
      )}

      {step === "completed" && (
        <div className="space-y-4 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
            <CheckCircle2 className="h-8 w-8 text-green-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-slate-800">Password Reset Complete</h3>
            <p className="mt-2 text-sm text-slate-600">
              Your password has been changed successfully. You can now log in with your new password.
            </p>
          </div>
          <a
            href="/login"
            className="inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-indigo-600 px-6 text-base font-semibold text-white hover:bg-indigo-700"
          >
            Go to Login <ArrowRight className="h-4 w-4" />
          </a>
        </div>
      )}
    </div>
  );
}
