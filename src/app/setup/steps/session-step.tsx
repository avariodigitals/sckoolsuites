"use client";

import { useState } from "react";
import { ArrowRight, ArrowLeft, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface SessionStepProps {
  onComplete: (session: { name: string; startDate: string; endDate: string }) => void;
  onBack: () => void;
  isLoading: boolean;
  initialData: { name: string; startDate: string; endDate: string } | null;
}

export function SessionStep({ onComplete, onBack, isLoading, initialData }: SessionStepProps) {
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
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

    onComplete({ name, startDate, endDate });
  };

  return (
    <div className="p-8">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-slate-900">Step 2: Academic Session</h2>
        <p className="text-slate-500">Create your academic session (school year). This will be saved immediately.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="rounded-lg bg-indigo-50 border border-indigo-100 p-4 mb-4">
          <div className="flex items-center gap-2 text-indigo-700">
            <BookOpen className="h-5 w-5" />
            <span className="font-medium">Academic Session</span>
          </div>
          <p className="text-sm text-indigo-600 mt-1">
            An academic session represents a full school year (e.g., 2024/2025)
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">Session Name *</label>
            <Input
              name="sessionName"
              placeholder="e.g., 2024/2025 Academic Session"
              disabled={isLoading}
              defaultValue={initialData?.name ?? ""}
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
            Back to School
          </Button>
          <Button
            type="submit"
            className="bg-indigo-600 hover:bg-indigo-700"
            disabled={isLoading}
          >
            Save Session & Continue to Term
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </form>
    </div>
  );
}
