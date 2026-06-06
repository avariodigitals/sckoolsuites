"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, GraduationCap, CheckCircle, ChevronRight, School, Calendar, User } from "lucide-react";
import { SchoolStep } from "./steps/school-step";
import { SessionStep } from "./steps/session-step";
import { TermStep } from "./steps/term-step";
import { UserStep } from "./steps/user-step";
import { ReviewStep } from "./steps/review-step";

interface SchoolData {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  website: string | null;
  motto: string | null;
}

interface SessionData {
  id: string;
  name: string;
}

interface TermData {
  id: string;
  name: string;
}

interface SetupWizardProps {
  existingSchool: SchoolData | null;
  step: number;
  existingSession: SessionData | null;
  existingTerm: TermData | null;
}

export function SetupWizard({ existingSchool, step: initialStep, existingSession, existingTerm }: SetupWizardProps) {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(initialStep);
  const [isLoading, setIsLoading] = useState(false);
  const [schoolData, setSchoolData] = useState(existingSchool);
  const [sessionData, setSessionData] = useState(existingSession);
  const [termData, setTermData] = useState(existingTerm);
  const [adminUser, setAdminUser] = useState<{name: string; email: string; password: string} | null>(null);

  const steps = [
    { id: 1, name: "School Details", icon: Building2 },
    { id: 2, name: "Academic Session", icon: GraduationCap },
    { id: 3, name: "Academic Term", icon: Calendar },
    { id: 4, name: "Admin User", icon: User },
    { id: 5, name: "Review & Activate", icon: CheckCircle },
  ];

  const [schoolError, setSchoolError] = useState<string | null>(null);

  const handleSchoolComplete = async (data: FormData) => {
    setIsLoading(true);
    setSchoolError(null);
    try {
      const res = await fetch("/api/setup/school", {
        method: "POST",
        body: data,
      });
      
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Server error" }));
        setSchoolError(err.error || `Error: ${res.status}`);
        return;
      }

      const result = await res.json();
      if (result.success) {
        setSchoolData(result.school);
        router.refresh();
        setCurrentStep(2);
      } else {
        setSchoolError(result.error || "Failed to create school");
      }
    } catch (err) {
      setSchoolError(err instanceof Error ? err.message : "Network error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSessionComplete = (data: SessionData) => {
    setSessionData(data);
    setCurrentStep(3);
  };

  const handleTermComplete = (data: TermData) => {
    setTermData(data);
    setCurrentStep(4);
  };

  const handleUserComplete = (data: {name: string; email: string; password: string}) => {
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
          schoolId: schoolData.id,
          sessionId: sessionData.id,
          termId: termData.id,
          adminUser
        })
      });
      const result = await res.json();
      
      if (!res.ok) {
        setActivateError(result.error || "Failed to activate");
        return;
      }
      
      // Redirect to login with credentials displayed
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
              schoolId={schoolData.id}
              onComplete={handleSessionComplete}
              onBack={() => setCurrentStep(1)}
              isLoading={isLoading}
              initialData={sessionData}
            />
          )}
          {currentStep === 3 && schoolData && sessionData && (
            <TermStep 
              schoolId={schoolData.id}
              sessionId={sessionData.id}
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
