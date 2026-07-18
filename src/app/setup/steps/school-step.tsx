"use client";

import { useState } from "react";
import { Building2, Mail, Phone, MapPin, Globe, Quote, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface SchoolStepProps {
  onComplete: (formData: FormData) => void;
  isLoading: boolean;
  error?: string | null;
  initialData?: {
    name: string;
    email: string;
    phone: string;
    address: string;
    website: string | null;
    motto: string | null;
  } | null;
}

export function SchoolStep({ onComplete, isLoading, error, initialData }: SchoolStepProps) {
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    
    // Validation
    const newErrors: Record<string, string> = {};
    const name = String(formData.get("name") || "").trim();
    const email = String(formData.get("email") || "").trim();
    const phone = String(formData.get("phone") || "").trim();
    const address = String(formData.get("address") || "").trim();
    
    if (!name) newErrors.name = "School name is required";
    if (!email) newErrors.email = "Email is required";
    else if (!email.includes("@")) newErrors.email = "Valid email required";
    if (!phone) newErrors.phone = "Phone is required";
    if (!address) newErrors.address = "Address is required";
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    
    onComplete(formData);
  };

  return (
    <div className="p-8">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-slate-900">School Details</h2>
        <p className="text-slate-500">Enter your school&apos;s basic information. This can be updated later.</p>
      </div>

      {error && (
        <div className="mb-6 rounded-lg bg-red-50 border border-red-200 p-4">
          <p className="text-red-700 font-medium">Error</p>
          <p className="text-red-600 text-sm">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid gap-6 grid-cols-1 sm:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">School Name *</label>
            <div className="relative">
              <Building2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                name="name"
                placeholder="e.g., Excellence Academy"
                className="pl-10"
                disabled={isLoading}
                defaultValue={initialData?.name ?? ""}
              />
            </div>
            {errors.name && <p className="text-xs text-red-600">{errors.name}</p>}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">School Email *</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                name="email"
                type="email"
                placeholder="info@school.edu"
                className="pl-10"
                disabled={isLoading}
                defaultValue={initialData?.email ?? ""}
              />
            </div>
            {errors.email && <p className="text-xs text-red-600">{errors.email}</p>}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">Phone Number *</label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                name="phone"
                placeholder="+234 801 234 5678"
                className="pl-10"
                disabled={isLoading}
                defaultValue={initialData?.phone ?? ""}
              />
            </div>
            {errors.phone && <p className="text-xs text-red-600">{errors.phone}</p>}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">Website</label>
            <div className="relative">
              <Globe className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                name="website"
                placeholder="www.school.edu"
                className="pl-10"
                disabled={isLoading}
                defaultValue={initialData?.website ?? ""}
              />
            </div>
          </div>

          <div className="space-y-2 md:col-span-2">
            <label className="text-sm font-medium text-slate-700">Address *</label>
            <div className="relative">
              <MapPin className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
              <Input
                name="address"
                placeholder="123 School Street, City, State"
                className="pl-10"
                disabled={isLoading}
                defaultValue={initialData?.address ?? ""}
              />
            </div>
            {errors.address && <p className="text-xs text-red-600">{errors.address}</p>}
          </div>

          <div className="space-y-2 md:col-span-2">
            <label className="text-sm font-medium text-slate-700">School Motto</label>
            <div className="relative">
              <Quote className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
              <Input
                name="motto"
                placeholder="Excellence, Discipline, Integrity"
                className="pl-10"
                disabled={isLoading}
                defaultValue={initialData?.motto ?? ""}
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-4">
          <Button
            type="submit"
            className="bg-indigo-600 hover:bg-indigo-700"
            disabled={isLoading}
          >
            {isLoading ? "Creating School..." : "Continue to Academic Setup"}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </form>
    </div>
  );
}
