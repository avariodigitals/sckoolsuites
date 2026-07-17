"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useConfirm } from "@/components/ui/confirm-dialog";

type FeeGroup = { id: string; name: string; code: string; description?: string | null; isActive?: boolean; feeItemCount?: number };
type FeeComponent = { id: string; name: string; description?: string | null };
type FeeConcession = { id: string; name: string; type: string; value: number; description?: string | null; isActive: boolean };
type ClassGroup = { id: string; name: string };
type Class = { id: string; name: string; classGroupId?: string | null };
type ClassArm = { id: string; name: string; classId: string };
type Session = { id: string; name: string };
type Term = { id: string; name: string; sessionId: string };

type ProfileItem = {
  feeComponentId: string;
  feeComponentName: string;
  amount: number;
  isOptional: boolean;
};

type FeeProfile = {
  id: string;
  name: string;
  feeGroupId: string;
  feeGroupName: string;
  sessionId: string;
  sessionName: string;
  termId: string;
  termName: string;
  dueDate: string | null;
  isActive: boolean;
  items: { id: string; feeComponentId: string; feeComponentName: string; amount: number; isOptional: boolean }[];
  classes: { id: string; name: string }[];
  arms: { id: string; name: string }[];
};

export function FeeProfileManager() {
  const confirm = useConfirm();
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("");

  // Data
  const [profiles, setProfiles] = useState<FeeProfile[]>([]);
  const [feeGroups, setFeeGroups] = useState<FeeGroup[]>([]);
  const [feeComponents, setFeeComponents] = useState<FeeComponent[]>([]);
  const [classGroups, setClassGroups] = useState<ClassGroup[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [arms, setArms] = useState<ClassArm[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [terms, setTerms] = useState<Term[]>([]);
  const [concessions, setConcessions] = useState<FeeConcession[]>([]);
  const [stats, setStats] = useState({ totalProfiles: 0, isActivated: false });

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [profileName, setProfileName] = useState("");
  const [selectedFeeGroup, setSelectedFeeGroup] = useState("");
  const [selectedSession, setSelectedSession] = useState("");
  const [selectedTerm, setSelectedTerm] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [selectedClassGroup, setSelectedClassGroup] = useState<string>("");
  const [selectedClasses, setSelectedClasses] = useState<string[]>([]);
  const [selectedArms, setSelectedArms] = useState<string[]>([]);
  const [profileItems, setProfileItems] = useState<ProfileItem[]>([]);
  const [submitting, setSubmitting] = useState(false);

  // New component form
  const [showComponentForm, setShowComponentForm] = useState(false);
  const [componentName, setComponentName] = useState("");
  const [componentDesc, setComponentDesc] = useState("");

  // New fee group form
  const [showGroupForm, setShowGroupForm] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [groupCode, setGroupCode] = useState("");
  const [groupDesc, setGroupDesc] = useState("");

  // Concession form
  const [showConcessionForm, setShowConcessionForm] = useState(false);
  const [concessionName, setConcessionName] = useState("");
  const [concessionType, setConcessionType] = useState("PERCENTAGE");
  const [concessionValue, setConcessionValue] = useState("");
  const [concessionDesc, setConcessionDesc] = useState("");

  // Active sub-tab
  const [activeTab, setActiveTab] = useState<"profiles" | "groups" | "components" | "concessions">("profiles");

  async function loadData() {
    setLoading(true);
    try {
      const [profilesRes, groupsRes, componentsRes, classGroupsRes, classesRes, armsRes, sessionsRes, concessionsRes] = await Promise.all([
        fetch("/api/admin/finance/fee-profiles", { cache: "no-store" }),
        fetch("/api/admin/finance/fee-groups", { cache: "no-store" }),
        fetch("/api/admin/finance/fee-components", { cache: "no-store" }),
        fetch("/api/admin/class-groups", { cache: "no-store" }),
        fetch("/api/admin/classes", { cache: "no-store" }),
        fetch("/api/admin/class-arms", { cache: "no-store" }),
        fetch("/api/context/session-term", { cache: "no-store" }),
        fetch("/api/admin/finance/fee-concessions", { cache: "no-store" }),
      ]);

      const [profilesData, groupsData, componentsData, classGroupsData, classesData, armsData, sessionData, concessionsData] = await Promise.all([
        profilesRes.json(),
        groupsRes.json(),
        componentsRes.json(),
        classGroupsRes.json(),
        classesRes.json(),
        armsRes.json(),
        sessionsRes.json(),
        concessionsRes.json(),
      ]);

      setProfiles(profilesData.profiles || []);
      setStats(profilesData.stats || { totalProfiles: 0, isActivated: false });
      setFeeGroups(groupsData.groups || []);
      setFeeComponents(componentsData.components || []);
      setClassGroups(classGroupsData.classGroups || []);
      setClasses(classesData.classes || []);
      setArms(armsData.arms || []);
      setSessions(sessionData.sessions || []);
      setTerms(sessionData.terms || []);
      setConcessions(concessionsData.concessions || []);
    } catch {
      setStatus("Failed to load data");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadData();
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  const filteredClasses = selectedClassGroup
    ? classes.filter((c) => c.classGroupId === selectedClassGroup)
    : classes;

  const filteredArms = selectedClasses.length > 0
    ? arms.filter((a) => selectedClasses.includes(a.classId))
    : [];

  function toggleClass(classId: string) {
    setSelectedClasses((prev) =>
      prev.includes(classId) ? prev.filter((id) => id !== classId) : [...prev, classId]
    );
    // Clear arms that don't belong to selected classes
    setSelectedArms((prev) => prev.filter((armId) => {
      const arm = arms.find((a) => a.id === armId);
      return arm && selectedClasses.includes(arm.classId);
    }));
  }

  function toggleArm(armId: string) {
    setSelectedArms((prev) =>
      prev.includes(armId) ? prev.filter((id) => id !== armId) : [...prev, armId]
    );
  }

  function addProfileItem(component: FeeComponent) {
    if (profileItems.some((i) => i.feeComponentId === component.id)) return;
    setProfileItems((prev) => [
      ...prev,
      {
        feeComponentId: component.id,
        feeComponentName: component.name,
        amount: 0,
        isOptional: false,
      },
    ]);
  }

  function updateItemAmount(index: number, amount: number) {
    setProfileItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, amount } : item))
    );
  }

  function updateItemOptional(index: number, isOptional: boolean) {
    setProfileItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, isOptional } : item))
    );
  }

  function removeItem(index: number) {
    setProfileItems((prev) => prev.filter((_, i) => i !== index));
  }

  async function createComponent() {
    if (!componentName.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/finance/fee-components", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: componentName, description: componentDesc }),
      });
      if (res.ok) {
        const data = await res.json();
        setFeeComponents((prev) => [...prev, data.component]);
        setComponentName("");
        setComponentDesc("");
        setShowComponentForm(false);
      }
    } catch {
      setStatus("Failed to create component");
    } finally {
      setSubmitting(false);
    }
  }

  async function createFeeGroup() {
    if (!groupName.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/finance/fee-groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: groupName, code: groupCode || undefined, description: groupDesc || undefined }),
      });
      if (res.ok) {
        await loadData();
        setGroupName("");
        setGroupCode("");
        setGroupDesc("");
        setShowGroupForm(false);
        setStatus("Fee group created successfully");
      } else {
        const data = await res.json();
        setStatus(data.error || "Failed to create fee group");
      }
    } catch {
      setStatus("Failed to create fee group");
    } finally {
      setSubmitting(false);
    }
  }

  async function createConcession() {
    if (!concessionName.trim() || !concessionValue) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/finance/fee-concessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: concessionName,
          type: concessionType,
          value: Number(concessionValue),
          description: concessionDesc || undefined,
        }),
      });
      if (res.ok) {
        await loadData();
        setConcessionName("");
        setConcessionValue("");
        setConcessionDesc("");
        setShowConcessionForm(false);
        setStatus("Concession created successfully");
      } else {
        const data = await res.json();
        setStatus(data.error || "Failed to create concession");
      }
    } catch {
      setStatus("Failed to create concession");
    } finally {
      setSubmitting(false);
    }
  }

  async function deleteConcession(id: string) {
    if (!(await confirm({
      title: "Delete Concession",
      message: "Delete this concession?",
      confirmLabel: "Delete",
      variant: "danger",
    }))) return;
    try {
      const res = await fetch(`/api/admin/finance/fee-concessions?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        await loadData();
      }
    } catch {
      setStatus("Failed to delete concession");
    }
  }

  async function createProfile() {
    if (!profileName || !selectedFeeGroup || !selectedSession || !selectedTerm || selectedClasses.length === 0 || profileItems.length === 0) {
      setStatus("Please fill all required fields");
      return;
    }

    if (profileItems.some((i) => i.amount <= 0)) {
      setStatus("All fee items must have an amount greater than 0");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/finance/fee-profiles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          feeGroupId: selectedFeeGroup,
          name: profileName,
          sessionId: selectedSession,
          termId: selectedTerm,
          dueDate: dueDate || undefined,
          classIds: selectedClasses,
          armIds: selectedArms,
          items: profileItems.map((i) => ({
            feeComponentId: i.feeComponentId,
            amount: i.amount,
            isOptional: i.isOptional,
          })),
        }),
      });

      if (res.ok) {
        setStatus("Fee profile created successfully");
        resetForm();
        await loadData();
      } else {
        const data = await res.json();
        setStatus(data.error || "Failed to create profile");
      }
    } catch {
      setStatus("An error occurred");
    } finally {
      setSubmitting(false);
    }
  }

  function resetForm() {
    setShowForm(false);
    setStep(1);
    setProfileName("");
    setSelectedFeeGroup("");
    setSelectedSession("");
    setSelectedTerm("");
    setDueDate("");
    setSelectedClassGroup("");
    setSelectedClasses([]);
    setSelectedArms([]);
    setProfileItems([]);
  }

  async function deleteProfile(id: string) {
    if (!(await confirm({
      title: "Delete Fee Profile",
      message: "Delete this fee profile?",
      confirmLabel: "Delete",
      variant: "danger",
    }))) return;
    try {
      const res = await fetch(`/api/admin/finance/fee-profiles?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        await loadData();
      }
    } catch {
      setStatus("Failed to delete profile");
    }
  }

  if (loading) {
    return <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      {status && (
        <div className={`rounded-lg border px-4 py-3 text-sm ${status.includes("success") ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-rose-200 bg-rose-50 text-rose-700"}`}>
          {status}
        </div>
      )}

      {/* Activation Status */}
      {!stats.isActivated && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm font-medium text-amber-800">System Activation Required</p>
          <p className="text-sm text-amber-700 mt-1">Create at least one fee profile to activate the billing system.</p>
        </div>
      )}

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs text-slate-500 font-medium uppercase">Fee Profiles</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{stats.totalProfiles}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs text-slate-500 font-medium uppercase">Fee Components</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{feeComponents.length}</p>
        </div>
        <div className={`rounded-xl border p-4 ${stats.isActivated ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50"}`}>
          <p className={`text-xs font-medium uppercase ${stats.isActivated ? "text-emerald-600" : "text-amber-600"}`}>System Status</p>
          <p className={`text-lg font-bold mt-1 ${stats.isActivated ? "text-emerald-700" : "text-amber-700"}`}>
            {stats.isActivated ? "Activated" : "Pending Setup"}
          </p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-1 border-b border-slate-200">
        {([
          { key: "profiles", label: "Fee Profiles" },
          { key: "groups", label: "Fee Groups" },
          { key: "components", label: "Fee Components" },
          { key: "concessions", label: "Concessions" },
        ] as const).map((t) => (
          <button
            key={t.key}
            onClick={() => { setActiveTab(t.key); setShowForm(false); setShowComponentForm(false); setShowGroupForm(false); setShowConcessionForm(false); }}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === t.key ? "border-slate-900 text-slate-900" : "border-transparent text-slate-500 hover:text-slate-700"}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* === PROFILES TAB === */}
      {activeTab === "profiles" && (
        <>
          <div className="flex gap-2">
            <Button onClick={() => setShowForm(!showForm)}>
              {showForm ? "Cancel" : "+ Create Fee Profile"}
            </Button>
          </div>

      {/* Fee Profile Form - Step 1 */}
      {showForm && step === 1 && (
        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Step 1: Profile Details</h3>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Profile Name *</label>
              <Input
                placeholder="e.g., JSS 1-3 First Term 2024"
                value={profileName}
                onChange={(e) => setProfileName(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Fee Group *</label>
              <select
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                value={selectedFeeGroup}
                onChange={(e) => setSelectedFeeGroup(e.target.value)}
              >
                <option value="">Select Fee Group</option>
                {feeGroups.map((g) => (
                  <option key={g.id} value={g.id}>{g.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Session *</label>
              <select
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                value={selectedSession}
                onChange={(e) => setSelectedSession(e.target.value)}
              >
                <option value="">Select Session</option>
                {sessions.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Term *</label>
              <select
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                value={selectedTerm}
                onChange={(e) => setSelectedTerm(e.target.value)}
              >
                <option value="">Select Term</option>
                {terms.filter((t) => !selectedSession || t.sessionId === selectedSession).map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Due Date</label>
              <Input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <Button
              onClick={() => setStep(2)}
              disabled={!profileName || !selectedFeeGroup || !selectedSession || !selectedTerm}
            >
              Next: Select Classes
            </Button>
            <Button variant="outline" onClick={resetForm}>Cancel</Button>
          </div>
        </div>
      )}

      {/* Step 2: Select Classes & Arms */}
      {showForm && step === 2 && (
        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Step 2: Select Classes & Arms</h3>
          
          {/* Class Group Filter */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-slate-700 mb-1">Filter by Class Group (optional)</label>
            <select
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm max-w-xs"
              value={selectedClassGroup}
              onChange={(e) => {
                setSelectedClassGroup(e.target.value);
                setSelectedClasses([]);
                setSelectedArms([]);
              }}
            >
              <option value="">All Class Groups</option>
              {classGroups.map((cg) => (
                <option key={cg.id} value={cg.id}>{cg.name}</option>
              ))}
            </select>
          </div>

          {/* Classes Checkboxes */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-slate-700 mb-2">Select Classes *</label>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {filteredClasses.map((c) => (
                <label key={c.id} className="flex items-center gap-2 p-3 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedClasses.includes(c.id)}
                    onChange={() => toggleClass(c.id)}
                    className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                  />
                  <span className="text-sm text-slate-900">{c.name}</span>
                </label>
              ))}
            </div>
            {selectedClasses.length === 0 && (
              <p className="text-sm text-rose-600 mt-2">Select at least one class</p>
            )}
          </div>

          {/* Arms Checkboxes */}
          {filteredArms.length > 0 && (
            <div className="mb-6">
              <label className="block text-sm font-medium text-slate-700 mb-2">Select Arms (optional)</label>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                {filteredArms.map((a) => (
                  <label key={a.id} className="flex items-center gap-2 p-3 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedArms.includes(a.id)}
                      onChange={() => toggleArm(a.id)}
                      className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                    />
                    <span className="text-sm text-slate-900">{a.name}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setStep(1)}>Back</Button>
            <Button
              onClick={() => setStep(3)}
              disabled={selectedClasses.length === 0}
            >
              Next: Add Fee Items
            </Button>
          </div>
        </div>
      )}

      {/* Step 3: Add Fee Items */}
      {showForm && step === 3 && (
        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Step 3: Add Fee Items</h3>
          
          {/* Available Components */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-slate-700 mb-2">Click to Add Fee Components</label>
            <div className="flex flex-wrap gap-2">
              {feeComponents.map((fc) => {
                const isAdded = profileItems.some((i) => i.feeComponentId === fc.id);
                return (
                  <button
                    key={fc.id}
                    onClick={() => addProfileItem(fc)}
                    disabled={isAdded}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium transition ${
                      isAdded
                        ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                        : "bg-slate-900 text-white hover:bg-slate-800"
                    }`}
                  >
                    {isAdded ? "✓ " : "+ "}{fc.name}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Selected Items with Amounts */}
          {profileItems.length > 0 && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 mb-2">Configure Fee Items</label>
              <div className="space-y-2">
                {profileItems.map((item, index) => (
                  <div key={item.feeComponentId} className="flex items-center gap-4 p-3 rounded-lg border border-slate-200 bg-slate-50">
                    <span className="flex-1 text-sm font-medium text-slate-900">{item.feeComponentName}</span>
                    <Input
                      type="number"
                      placeholder="Amount"
                      value={item.amount || ""}
                      onChange={(e) => updateItemAmount(index, parseFloat(e.target.value) || 0)}
                      className="w-32"
                    />
                    <label className="flex items-center gap-1 text-sm text-slate-600">
                      <input
                        type="checkbox"
                        checked={item.isOptional}
                        onChange={(e) => updateItemOptional(index, e.target.checked)}
                        className="h-4 w-4 rounded border-slate-300"
                      />
                      Optional
                    </label>
                    <button
                      onClick={() => removeItem(index)}
                      className="text-rose-500 hover:text-rose-700 px-2"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
              <div className="mt-3 p-3 rounded-lg bg-emerald-50 border border-emerald-200">
                <p className="text-sm font-medium text-emerald-800">
                  Total: ₦{profileItems.reduce((sum, i) => sum + (i.amount || 0), 0).toLocaleString()}
                </p>
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setStep(2)}>Back</Button>
            <Button
              onClick={createProfile}
              disabled={submitting || profileItems.length === 0 || profileItems.some((i) => i.amount <= 0)}
            >
              {submitting ? "Creating..." : "Create Fee Profile"}
            </Button>
          </div>
        </div>
      )}

      {/* Profiles List */}
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200">
          <h3 className="text-lg font-semibold text-slate-900">Fee Profiles ({profiles.length})</h3>
        </div>
        <div className="divide-y divide-slate-200">
          {profiles.length === 0 ? (
            <div className="px-6 py-8 text-center text-slate-500">
              No fee profiles created yet. Create your first profile to activate the system.
            </div>
          ) : (
            profiles.map((profile) => (
              <div key={profile.id} className="p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-semibold text-slate-900">{profile.name}</h4>
                      <span className="px-2 py-0.5 rounded-full text-xs bg-slate-100 text-slate-600">
                        {profile.feeGroupName}
                      </span>
                    </div>
                    <p className="text-sm text-slate-500 mb-2">
                      {profile.sessionName} • {profile.termName}
                      {profile.dueDate && ` • Due: ${new Date(profile.dueDate).toLocaleDateString()}`}
                    </p>
                    <div className="flex flex-wrap gap-1 mb-2">
                      <span className="text-xs text-slate-500 mr-1">Classes:</span>
                      {profile.classes.map((c) => (
                        <span key={c.id} className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 text-xs">{c.name}</span>
                      ))}
                    </div>
                    {profile.arms.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-2">
                        <span className="text-xs text-slate-500 mr-1">Arms:</span>
                        {profile.arms.map((a) => (
                          <span key={a.id} className="px-2 py-0.5 rounded bg-amber-50 text-amber-700 text-xs">{a.name}</span>
                        ))}
                      </div>
                    )}
                    <div className="flex flex-wrap gap-1">
                      <span className="text-xs text-slate-500 mr-1">Items:</span>
                      {profile.items.map((item) => (
                        <span key={item.id} className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 text-xs">
                          {item.feeComponentName}: ₦{item.amount.toLocaleString()}{item.isOptional ? " (Opt)" : ""}
                        </span>
                      ))}
                    </div>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => deleteProfile(profile.id)}>
                    Delete
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
        </>
      )}

      {/* === GROUPS TAB === */}
      {activeTab === "groups" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-slate-900">Fee Groups ({feeGroups.length})</h3>
            <Button onClick={() => setShowGroupForm(!showGroupForm)}>
              {showGroupForm ? "Cancel" : "+ Create Fee Group"}
            </Button>
          </div>

          {showGroupForm && (
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Create Fee Group</h3>
              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Group Name *</label>
                  <Input
                    placeholder="e.g., Boarding, Day, Transport"
                    value={groupName}
                    onChange={(e) => setGroupName(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Code (optional)</label>
                  <Input
                    placeholder="e.g., BOARD, DAY"
                    value={groupCode}
                    onChange={(e) => setGroupCode(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Description (optional)</label>
                  <Input
                    placeholder="Brief description"
                    value={groupDesc}
                    onChange={(e) => setGroupDesc(e.target.value)}
                  />
                </div>
              </div>
              <div className="mt-4 flex gap-2">
                <Button onClick={createFeeGroup} disabled={submitting || !groupName.trim()}>
                  {submitting ? "Creating..." : "Create Group"}
                </Button>
                <Button variant="outline" onClick={() => setShowGroupForm(false)}>Cancel</Button>
              </div>
            </div>
          )}

          <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
            <div className="divide-y divide-slate-200">
              {feeGroups.length === 0 ? (
                <div className="px-6 py-8 text-center text-slate-500">
                  No fee groups yet. Create a fee group first to organize your fee items.
                </div>
              ) : (
                feeGroups.map((group) => (
                  <div key={group.id} className="p-4 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold text-slate-900">{group.name}</h4>
                        <span className="px-2 py-0.5 rounded-full text-xs bg-slate-100 text-slate-600">{group.code}</span>
                        {group.isActive === false && (
                          <span className="px-2 py-0.5 rounded-full text-xs bg-rose-50 text-rose-600">Inactive</span>
                        )}
                      </div>
                      {group.description && (
                        <p className="text-sm text-slate-500 mt-0.5">{group.description}</p>
                      )}
                      {group.feeItemCount !== undefined && (
                        <p className="text-xs text-slate-400 mt-0.5">{group.feeItemCount} fee item(s)</p>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* === COMPONENTS TAB === */}
      {activeTab === "components" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-slate-900">Fee Components ({feeComponents.length})</h3>
            <Button onClick={() => setShowComponentForm(!showComponentForm)}>
              {showComponentForm ? "Cancel" : "+ Add Fee Component"}
            </Button>
          </div>

          {showComponentForm && (
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Add Fee Component</h3>
              <div className="grid gap-4 md:grid-cols-2">
                <Input
                  placeholder="Component Name (e.g., Tuition, Sports)"
                  value={componentName}
                  onChange={(e) => setComponentName(e.target.value)}
                />
                <Input
                  placeholder="Description (optional)"
                  value={componentDesc}
                  onChange={(e) => setComponentDesc(e.target.value)}
                />
              </div>
              <div className="mt-4 flex gap-2">
                <Button onClick={createComponent} disabled={submitting || !componentName.trim()}>
                  {submitting ? "Creating..." : "Create Component"}
                </Button>
                <Button variant="outline" onClick={() => setShowComponentForm(false)}>Cancel</Button>
              </div>
            </div>
          )}

          <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
            <div className="divide-y divide-slate-200">
              {feeComponents.length === 0 ? (
                <div className="px-6 py-8 text-center text-slate-500">
                  No fee components yet. Create components like Tuition, Sports, Library, etc.
                </div>
              ) : (
                feeComponents.map((comp) => (
                  <div key={comp.id} className="p-4">
                    <h4 className="font-semibold text-slate-900">{comp.name}</h4>
                    {comp.description && <p className="text-sm text-slate-500 mt-0.5">{comp.description}</p>}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* === CONCESSIONS TAB === */}
      {activeTab === "concessions" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-slate-900">Fee Concessions ({concessions.length})</h3>
            <Button onClick={() => setShowConcessionForm(!showConcessionForm)}>
              {showConcessionForm ? "Cancel" : "+ Add Concession"}
            </Button>
          </div>

          {showConcessionForm && (
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Add Fee Concession</h3>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Concession Name *</label>
                  <Input
                    placeholder="e.g., Sibling Discount, Scholarship, Staff Child"
                    value={concessionName}
                    onChange={(e) => setConcessionName(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Type *</label>
                  <select
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                    value={concessionType}
                    onChange={(e) => setConcessionType(e.target.value)}
                  >
                    <option value="PERCENTAGE">Percentage (%)</option>
                    <option value="FIXED">Fixed Amount (₦)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Value * {concessionType === "PERCENTAGE" ? "(% e.g., 10 for 10%)" : "(₦ amount)"}
                  </label>
                  <Input
                    type="number"
                    placeholder={concessionType === "PERCENTAGE" ? "e.g., 10" : "e.g., 5000"}
                    value={concessionValue}
                    onChange={(e) => setConcessionValue(e.target.value)}
                    min={0}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Description (optional)</label>
                  <Input
                    placeholder="Brief description"
                    value={concessionDesc}
                    onChange={(e) => setConcessionDesc(e.target.value)}
                  />
                </div>
              </div>
              <div className="mt-4 flex gap-2">
                <Button onClick={createConcession} disabled={submitting || !concessionName.trim() || !concessionValue}>
                  {submitting ? "Creating..." : "Create Concession"}
                </Button>
                <Button variant="outline" onClick={() => setShowConcessionForm(false)}>Cancel</Button>
              </div>
            </div>
          )}

          <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
            <div className="divide-y divide-slate-200">
              {concessions.length === 0 ? (
                <div className="px-6 py-8 text-center text-slate-500">
                  No concessions yet. Create concessions like sibling discounts, scholarships, staff child discounts, etc.
                </div>
              ) : (
                concessions.map((concession) => (
                  <div key={concession.id} className="p-4 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold text-slate-900">{concession.name}</h4>
                        <span className="px-2 py-0.5 rounded-full text-xs bg-indigo-50 text-indigo-700">
                          {concession.type === "PERCENTAGE" ? `${concession.value}%` : `₦${concession.value.toLocaleString()}`}
                        </span>
                      </div>
                      {concession.description && (
                        <p className="text-sm text-slate-500 mt-0.5">{concession.description}</p>
                      )}
                    </div>
                    <Button size="sm" variant="outline" onClick={() => deleteConcession(concession.id)}>
                      Delete
                    </Button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
