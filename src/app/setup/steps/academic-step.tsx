"use client";

import { useState } from "react";
import { Calendar, ArrowRight, ArrowLeft, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface AcademicStepProps {
  schoolId: string;
  onComplete: () => void;
  onBack: () => void;
  isLoading: boolean;
}

export function AcademicStep({ schoolId, onComplete, onBack, isLoading }: AcademicStepProps) {
  const [step, setStep] = useState<"session" | "term">("session");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSessionSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    
    const name = String(formData.get("sessionName") || "").trim();
    const startDate = String(formData.get("sessionStart") || "");
    const endDate = String(formData.get("sessionEnd") || "");
    
    const newErrors: Record<string, string> = {};
    if (!name) newErrors.sessionName = "Session name is required";
    if (!startDate) newErrors.sessionStart = "Start date is required";
    if (!endDate) newErrors.sessionEnd = "End date is required";
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    try {
      const res = await fetch("/api/admin/academic/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          schoolId,
          name,
          startDate,
          endDate,
          isCurrent: true,
        }),
      });

      const result = await res.json();
      if (!res.ok) {
        setErrors({ submit: result.error || `Error: ${res.status}` });
        return;
      }
      if (result.id) {
        setSessionId(result.id);
        setStep("term");
        setErrors({});
      } else {
        setErrors({ submit: "Invalid response from server" });
      }
    } catch (err) {
      setErrors({ submit: err instanceof Error ? err.message : "Failed to create session" });
    }
  };

  const handleTermSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    
    const name = String(formData.get("termName") || "").trim();
    const startDate = String(formData.get("termStart") || "");
    const endDate = String(formData.get("termEnd") || "");
    
    const newErrors: Record<string, string> = {};
    if (!name) newErrors.termName = "Term name is required";
    if (!startDate) newErrors.termStart = "Start date is required";
    if (!endDate) newErrors.termEnd = "End date is required";
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    try {
      const res = await fetch("/api/admin/academic/terms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          schoolId,
          sessionId,
          name,
          startDate,
          endDate,
          isCurrent: true,
        }),
      });

      const result = await res.json();
      if (!res.ok) {
        setErrors({ submit: result.error || `Error: ${res.status}` });
        return;
      }
      if (result.id) {
        onComplete();
      } else {
        setErrors({ submit: "Invalid response from server" });
      }
    } catch (err) {
      setErrors({ submit: err instanceof Error ? err.message : "Failed to create term" });
    }
  };

  return (
    <div className="p-8">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-slate-900">Academic Setup</h2>
        <p className="text-slate-500">You must create an Academic Session AND at least one Term to proceed.</p>
      </div>

      {step === "session" ? (
        <form onSubmit={handleSessionSubmit} className="space-y-6">
          <div className="rounded-lg bg-indigo-50 border border-indigo-100 p-4 mb-4">
            <div className="flex items-center gap-2 text-indigo-700">
              <BookOpen className="h-5 w-5" />
              <span className="font-medium">Step 1: Create Academic Session</span>
            </div>
            <p className="text-sm text-indigo-600 mt-1">
              An academic session represents a full school year (e.g., 2024/2025)
            </p>
          </div>

          <div className="grid gap-6 grid-cols-1 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Session Name *</label>
              <Input
                name="sessionName"
                placeholder="e.g., 2024/2025 Academic Session"
                disabled={isLoading}
              />
              {errors.sessionName && <p className="text-xs text-red-600">{errors.sessionName}</p>}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Start Date *</label>
              <Input
                name="sessionStart"
                type="date"
                disabled={isLoading}
              />
              {errors.sessionStart && <p className="text-xs text-red-600">{errors.sessionStart}</p>}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">End Date *</label>
              <Input
                name="sessionEnd"
                type="date"
                disabled={isLoading}
              />
              {errors.sessionEnd && <p className="text-xs text-red-600">{errors.sessionEnd}</p>}
            </div>
          </div>

          {errors.submit && (
            <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
              {errors.submit}
            </div>
          )}

          <div className="flex justify-between pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onBack}
              disabled={isLoading}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            <Button
              type="submit"
              className="bg-indigo-600 hover:bg-indigo-700"
              disabled={isLoading}
            >
              Create Session & Next: Create Term
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </form>
      ) : (
        <form onSubmit={handleTermSubmit} className="space-y-6">
          <div className="rounded-lg bg-emerald-50 border border-emerald-100 p-4 mb-4">
            <div className="flex items-center gap-2 text-emerald-700">
              <Calendar className="h-5 w-5" />
              <span className="font-medium">Step 2: Create First Term (Required)</span>
            </div>
            <p className="text-sm text-emerald-600 mt-1">
              Create the first term within this session. You cannot access the dashboard without at least one term.
            </p>
          </div>

          <div className="grid gap-6 grid-cols-1 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Term Name *</label>
              <Input
                name="termName"
                placeholder="e.g., First Term"
                disabled={isLoading}
              />
              {errors.termName && <p className="text-xs text-red-600">{errors.termName}</p>}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Start Date *</label>
              <Input
                name="termStart"
                type="date"
                disabled={isLoading}
              />
              {errors.termStart && <p className="text-xs text-red-600">{errors.termStart}</p>}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">End Date *</label>
              <Input
                name="termEnd"
                type="date"
                disabled={isLoading}
              />
              {errors.termEnd && <p className="text-xs text-red-600">{errors.termEnd}</p>}
            </div>
          </div>

          {errors.submit && (
            <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
              {errors.submit}
            </div>
          )}

          <div className="flex justify-between pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setStep("session")}
              disabled={isLoading}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Session
            </Button>
            <Button
              type="submit"
              className="bg-emerald-600 hover:bg-emerald-700"
              disabled={isLoading}
            >
              Create Term & Continue
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
