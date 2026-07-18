"use client";

import { School, Calendar, ArrowLeft, Rocket, User, GraduationCap } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ReviewStepProps {
  school: {
    name: string;
    email: string;
    phone: string;
    address: string;
    website: string | null;
    motto: string | null;
  };
  session: { name: string; startDate: string; endDate: string };
  term: { name: string; startDate: string; endDate: string };
  adminUser: { name: string; email: string };
  onActivate: () => void;
  onBack: () => void;
  isLoading: boolean;
  error?: string | null;
}

export function ReviewStep({ school, session, term, adminUser, onActivate, onBack, isLoading, error }: ReviewStepProps) {
  return (
    <div className="p-8">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-slate-900">Review & Activate</h2>
        <p className="text-slate-500">Review your school setup before activating the system.</p>
      </div>

      <div className="space-y-6">
        {/* School Info Card */}
        <div className="rounded-lg border border-slate-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <School className="h-5 w-5 text-indigo-600" />
            <h3 className="font-semibold text-slate-900">School Information</h3>
          </div>
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 text-sm">
            <div>
              <p className="text-slate-500">Name</p>
              <p className="font-medium text-slate-900">{school.name}</p>
            </div>
            <div>
              <p className="text-slate-500">Email</p>
              <p className="font-medium text-slate-900">{school.email}</p>
            </div>
            <div>
              <p className="text-slate-500">Phone</p>
              <p className="font-medium text-slate-900">{school.phone}</p>
            </div>
            {school.website && (
              <div>
                <p className="text-slate-500">Website</p>
                <p className="font-medium text-slate-900">{school.website}</p>
              </div>
            )}
            <div className="md:col-span-2">
              <p className="text-slate-500">Address</p>
              <p className="font-medium text-slate-900">{school.address}</p>
            </div>
            {school.motto && (
              <div className="md:col-span-2">
                <p className="text-slate-500">Motto</p>
                <p className="font-medium text-slate-900 italic">&ldquo;{school.motto}&rdquo;</p>
              </div>
            )}
          </div>
        </div>

        {/* Academic Info Card */}
        <div className="rounded-lg border border-slate-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="h-5 w-5 text-emerald-600" />
            <h3 className="font-semibold text-slate-900">Academic Setup</h3>
          </div>
          <div className="grid gap-2 text-sm">
            <div className="flex items-center gap-2 text-emerald-700">
              <GraduationCap className="h-4 w-4" />
              <span>Session: <strong>{session.name}</strong></span>
            </div>
            <div className="flex items-center gap-2 text-emerald-700">
              <Calendar className="h-4 w-4" />
              <span>Term: <strong>{term.name}</strong></span>
            </div>
          </div>
        </div>

        {/* Admin User Card */}
        <div className="rounded-lg border border-slate-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <User className="h-5 w-5 text-violet-600" />
            <h3 className="font-semibold text-slate-900">Administrator Account</h3>
          </div>
          <div className="grid gap-2 text-sm">
            <div>
              <p className="text-slate-500">Name</p>
              <p className="font-medium text-slate-900">{adminUser.name}</p>
            </div>
            <div>
              <p className="text-slate-500">Email</p>
              <p className="font-medium text-slate-900">{adminUser.email}</p>
            </div>
          </div>
        </div>

        {/* Activation Notice */}
        <div className="rounded-lg bg-indigo-50 border border-indigo-100 p-4">
          <div className="flex items-start gap-3">
            <Rocket className="h-5 w-5 text-indigo-600 mt-0.5" />
            <div>
              <p className="font-medium text-indigo-900">Ready to Activate</p>
              <p className="text-sm text-indigo-700 mt-1">
                After activation, login with <strong>{adminUser.email}</strong> to manage your school.
                You can update all settings later from the admin panel.
              </p>
            </div>
          </div>
        </div>

        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 p-4">
            <p className="text-red-700 font-medium">Activation Error</p>
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}

        {isLoading && (
          <div className="rounded-lg bg-amber-50 border border-amber-100 p-4 text-center">
            <p className="text-amber-700">Activating your school...</p>
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
            onClick={onActivate}
            className="bg-indigo-600 hover:bg-indigo-700"
            disabled={isLoading}
          >
            {isLoading ? "Activating..." : "Activate School & Start"}
            <Rocket className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
