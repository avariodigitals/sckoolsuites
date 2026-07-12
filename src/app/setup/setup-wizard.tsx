"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, GraduationCap, CheckCircle, ChevronRight, School, Calendar, User } from "lucide-react";
import { SchoolStep } from "./steps/school-step";
import { SessionStep } from "./steps/session-step";
import { TermStep } from "./steps/term-step";
import { UserStep } from "./steps/user-step";
import { ReviewStep } from "./steps/review-step";

interface SchoolInput {
  name: string;
  email: string;
  phone: string;
  address: string;
  website: string | null;
  motto: string | null;
}

interface SessionInput {
  name: string;
  startDate: string;
  endDate: string;
}

interface TermInput {
  name: string;
  startDate: string;
  endDate: string;
}

interface AdminInput {
  name: string;
  email: string;
  password: string;
}

export function SetupWizard() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [schoolData, setSchoolData] = useState<SchoolInput | null>(null);
  const [sessionData, setSessionData] = useState<SessionInput | null>(null);
  const [termData, setTermData] = useState<TermInput | null>(null);
  const [adminUser, setAdminUser] = useState<AdminInput | null>(null);

  const steps = [
    { id: 1, name: "School Details", icon: Building2 },
    { id: 2, name: "Academic Session", icon: GraduationCap },
    { id: 3, name: "Academic Term", icon: Calendar },
    { id: 4, name: "Admin User", icon: User },
    { id: 5, name: "Review & Activate", icon: CheckCircle },
  ];

  const [schoolError, setSchoolError] = useState<string | null>(null);

  const handleSchoolComplete = (formData: FormData) => {
    setSchoolError(null);
    const data: SchoolInput = {
      name: String(formData.get("name") ?? "").trim(),
      email: String(formData.get("email") ?? "").trim().toLowerCase(),
      phone: String(formData.get("phone") ?? "").trim(),
      address: String(formData.get("address") ?? "").trim(),
      website: String(formData.get("website") ?? "").trim() || null,
      motto: String(formData.get("motto") ?? "").trim() || null,
    };

    if (!data.name || !data.email || !data.phone || !data.address) {
      setSchoolError("Name, email, phone, and address are required");
      return;
    }

    setSchoolData(data);
    setCurrentStep(2);
  };

  const handleSessionComplete = (data: SessionInput) => {
    setSessionData(data);
    setCurrentStep(3);
  };

  const handleTermComplete = (data: TermInput) => {
    setTermData(data);
    setCurrentStep(4);
  };

  const handleUserComplete = (data: AdminInput) => {
    setAdminUser(data);
    setCurrentStep(5);
  };

  const [activateError, setActivateError] = useState<string | null>(null);

  const handleActivate = async () => {
    setIsLoading(true);
    setActivateError(null);
    try {
      if (!schoolData || !sessionData || !termData || !adminUser) {
        setActivateError("Missing required data");
        return;
      }

      const res = await fetch("/api/setup/activate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          school: schoolData,
          session: sessionData,
          term: termData,
          adminUser,
        })
      });
      const result = await res.json();

      if (!res.ok) {
        setActivateError(result.error || "Failed to activate");
        return;
      }

      // Redirect to login after successful activation
      router.push("/login?setup=complete");
    } catch (err) {
      setActivateError(err instanceof Error ? err.message : "Activation failed");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-600 p-2 rounded-lg">
              <School className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">School Setup</h1>
              <p className="text-sm text-slate-500">Configure your school management system</p>
            </div>
          </div>
        </div>
      </div>

      {/* Progress */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => {
              const Icon = step.icon;
              const isActive = step.id === currentStep;
              const isComplete = step.id < currentStep;
              
              return (
                <div key={step.id} className="flex items-center">
                  <div className={`flex items-center gap-3 px-4 py-2 rounded-lg ${
                    isActive ? "bg-indigo-50 text-indigo-700" : 
                    isComplete ? "bg-emerald-50 text-emerald-700" : "text-slate-400"
                  }`}>
                    <div className={`p-2 rounded-full ${
                      isActive ? "bg-indigo-100" : 
                      isComplete ? "bg-emerald-100" : "bg-slate-100"
                    }`}>
                      {isComplete ? (
                        <CheckCircle className="h-5 w-5" />
                      ) : (
                        <Icon className="h-5 w-5" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium">Step {step.id}</p>
                      <p className="text-xs">{step.name}</p>
                    </div>
                  </div>
                  {index < steps.length - 1 && (
                    <ChevronRight className="h-5 w-5 mx-4 text-slate-300" />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
          {currentStep === 1 && (
            <SchoolStep
              onComplete={handleSchoolComplete}
              isLoading={isLoading}
              error={schoolError}
              initialData={schoolData}
            />
          )}
          {currentStep === 2 && schoolData && (
            <SessionStep
              onComplete={handleSessionComplete}
              onBack={() => setCurrentStep(1)}
              isLoading={isLoading}
              initialData={sessionData}
            />
          )}
          {currentStep === 3 && schoolData && sessionData && (
            <TermStep
              onComplete={handleTermComplete}
              onBack={() => setCurrentStep(2)}
              isLoading={isLoading}
              initialData={termData}
            />
          )}
          {currentStep === 4 && schoolData && (
            <UserStep
              onComplete={handleUserComplete}
              onBack={() => setCurrentStep(3)}
              isLoading={isLoading}
              initialData={adminUser}
            />
          )}
          {currentStep === 5 && schoolData && sessionData && termData && adminUser && (
            <ReviewStep
              school={schoolData}
              session={sessionData}
              term={termData}
              adminUser={adminUser}
              onActivate={handleActivate}
              onBack={() => setCurrentStep(4)}
              isLoading={isLoading}
              error={activateError}
            />
          )}
        </div>
      </div>
    </div>
  );
}
