"use client";

import { useEffect, useMemo, useState } from "react";
import { 
  School, 
  UsersRound, 
  BookMarked, 
  GraduationCap,
  Plus,
  Search,
  X,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Edit2,
  Save
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

// Types
type ClassGroup = { id: string; name: string; description: string | null; createdAt: string };
type ClassItem = { id: string; name: string; classGroupId: string | null; classGroupName: string | null; studentCount: number; armCount: number };
type ClassArm = { id: string; name: string; classId: string; className: string; studentCount: number; isActive: boolean; capacity?: number | null };
type Subject = { id: string; name: string; classCount: number; createdAt: string };
type TabType = "classGroups" | "classes" | "arms" | "subjects";

export function MasterDataManager() {
  const [activeTab, setActiveTab] = useState<TabType>("classGroups");
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("");
  const [classGroups, setClassGroups] = useState<ClassGroup[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [arms, setArms] = useState<ClassArm[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Record<string, string>>({});
  const [classGroupForm, setClassGroupForm] = useState({ name: "" });
  const [classForm, setClassForm] = useState({ name: "", classGroupId: "" });
  const [armForm, setArmForm] = useState({ name: "", classId: "", capacity: "" });
  const [subjectForm, setSubjectForm] = useState({ name: "" });

  useEffect(() => {
    let cancelled = false;
    const doLoad = async () => {
      setLoading(true);
      try {
        const [groupsRes, classesRes, armsRes, subjectsRes] = await Promise.all([
          fetch("/api/admin/class-groups", { cache: "no-store" }),
          fetch("/api/admin/classes", { cache: "no-store" }),
          fetch("/api/admin/class-arms", { cache: "no-store" }),
          fetch("/api/admin/subjects", { cache: "no-store" }),
        ]);
        const groupsData = await groupsRes.json().catch(() => []);
        const classesData = await classesRes.json().catch(() => []);
        const armsData = await armsRes.json().catch(() => []);
        const subjectsData = await subjectsRes.json().catch(() => []);
        if (!cancelled) {
          setClassGroups(groupsData.classGroups ?? []);
          setClasses(classesData.classes ?? []);
          setArms(armsData.arms ?? []);
          setSubjects(subjectsData.subjects ?? []);
        }
      } catch {
        if (!cancelled) setStatus("Failed to load data.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    doLoad();
    return () => { cancelled = true; };
  }, []);

  const filteredClassGroups = useMemo(() => {
    if (!searchQuery.trim()) return classGroups;
    return classGroups.filter(g => g.name.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [classGroups, searchQuery]);

  const filteredClasses = useMemo(() => {
    if (!searchQuery.trim()) return classes;
    return classes.filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()) || c.classGroupName?.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [classes, searchQuery]);

  const filteredArms = useMemo(() => {
    if (!searchQuery.trim()) return arms;
    return arms.filter(a => a.name.toLowerCase().includes(searchQuery.toLowerCase()) || a.className.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [arms, searchQuery]);

  const filteredSubjects = useMemo(() => {
    if (!searchQuery.trim()) return subjects;
    return subjects.filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [subjects, searchQuery]);

  async function handleCreateClassGroup() {
    if (!classGroupForm.name.trim()) { setStatus("Class group name is required."); return; }
    setSubmitting(true);
    try {
      const response = await fetch("/api/admin/class-groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(classGroupForm),
      });
      if (!response.ok) { const data = await response.json().catch(() => ({})); setStatus(data.error || "Failed to create."); return; }
      setClassGroupForm({ name: "" });
      setShowForm(false);
      setStatus("Class group created successfully.");
      const res = await fetch("/api/admin/class-groups", { cache: "no-store" });
      const data = await res.json().catch(() => []);
      setClassGroups(data.classGroups ?? []);
    } catch { setStatus("An error occurred."); }
    finally { setSubmitting(false); }
  }

  async function handleCreateClass() {
    if (!classForm.name.trim() || !classForm.classGroupId) { setStatus("Class name and group are required."); return; }
    setSubmitting(true);
    try {
      const response = await fetch("/api/admin/classes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(classForm),
      });
      if (!response.ok) { const data = await response.json().catch(() => ({})); setStatus(data.error || "Failed to create."); return; }
      setClassForm({ name: "", classGroupId: "" });
      setShowForm(false);
      setStatus("Class created successfully.");
      const res = await fetch("/api/admin/classes", { cache: "no-store" });
      const data = await res.json().catch(() => []);
      setClasses(data.classes ?? []);
    } catch { setStatus("An error occurred."); }
    finally { setSubmitting(false); }
  }

  async function handleCreateArm() {
    if (!armForm.name.trim() || !armForm.classId) { setStatus("Arm name and class are required."); return; }
    setSubmitting(true);
    try {
      const response = await fetch("/api/admin/class-arms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(armForm),
      });
      if (!response.ok) { const data = await response.json().catch(() => ({})); setStatus(data.error || "Failed to create."); return; }
      setArmForm({ name: "", classId: "", capacity: "" });
      setShowForm(false);
      setStatus("Arm created successfully.");
      const res = await fetch("/api/admin/class-arms", { cache: "no-store" });
      const data = await res.json().catch(() => []);
      setArms(data.arms ?? []);
    } catch { setStatus("An error occurred."); }
    finally { setSubmitting(false); }
  }

  async function handleCreateSubject() {
    if (!subjectForm.name.trim()) { setStatus("Subject name is required."); return; }
    setSubmitting(true);
    try {
      const response = await fetch("/api/admin/subjects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(subjectForm),
      });
      if (!response.ok) { const data = await response.json().catch(() => ({})); setStatus(data.error || "Failed to create."); return; }
      setSubjectForm({ name: "" });
      setShowForm(false);
      setStatus("Subject created successfully.");
      const res = await fetch("/api/admin/subjects", { cache: "no-store" });
      const data = await res.json().catch(() => []);
      setSubjects(data.subjects ?? []);
    } catch { setStatus("An error occurred."); }
    finally { setSubmitting(false); }
  }

  async function handleDeleteClassGroup(id: string, name: string) {
    if (!window.confirm(`Delete class group "${name}"?`)) return;
    try {
      const response = await fetch(`/api/admin/class-groups/${id}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Failed");
      setStatus("Class group deleted.");
      setClassGroups(prev => prev.filter(g => g.id !== id));
    } catch { setStatus("Failed to delete."); }
  }

  async function handleDeleteClass(id: string, name: string) {
    if (!window.confirm(`Delete class "${name}"?`)) return;
    try {
      const response = await fetch(`/api/admin/classes/${id}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Failed");
      setStatus("Class deleted.");
      setClasses(prev => prev.filter(c => c.id !== id));
    } catch { setStatus("Failed to delete."); }
  }

  async function handleDeleteSubject(id: string, name: string) {
    if (!window.confirm(`Delete subject "${name}"?`)) return;
    try {
      const response = await fetch(`/api/admin/subjects/${id}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Failed");
      setStatus("Subject deleted.");
      setSubjects(prev => prev.filter(s => s.id !== id));
    } catch { setStatus("Failed to delete."); }
  }

  // Update handlers
  async function handleUpdateClassGroup(id: string) {
    const name = editForm[`group_${id}_name`];
    if (!name?.trim()) { setStatus("Name is required."); return; }
    setSubmitting(true);
    try {
      const response = await fetch(`/api/admin/class-groups/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (!response.ok) { const data = await response.json().catch(() => ({})); setStatus(data.error || "Failed to update."); return; }
      setEditingId(null);
      setStatus("Class group updated successfully.");
      const res = await fetch("/api/admin/class-groups", { cache: "no-store" });
      const data = await res.json().catch(() => []);
      setClassGroups(data.classGroups ?? []);
    } catch { setStatus("An error occurred."); }
    finally { setSubmitting(false); }
  }

  async function handleUpdateClass(id: string) {
    const name = editForm[`class_${id}_name`];
    const classGroupId = editForm[`class_${id}_group`];
    if (!name?.trim()) { setStatus("Class name is required."); return; }
    setSubmitting(true);
    try {
      const response = await fetch(`/api/admin/classes/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, classGroupId }),
      });
      if (!response.ok) { const data = await response.json().catch(() => ({})); setStatus(data.error || "Failed to update."); return; }
      setEditingId(null);
      setStatus("Class updated successfully.");
      const res = await fetch("/api/admin/classes", { cache: "no-store" });
      const data = await res.json().catch(() => []);
      setClasses(data.classes ?? []);
    } catch { setStatus("An error occurred."); }
    finally { setSubmitting(false); }
  }

  async function handleUpdateArm(id: string) {
    const name = editForm[`arm_${id}_name`];
    const isActive = editForm[`arm_${id}_active`] === "true";
    if (!name?.trim()) { setStatus("Arm name is required."); return; }
    setSubmitting(true);
    try {
      const response = await fetch(`/api/admin/class-arms/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, isActive }),
      });
      if (!response.ok) { const data = await response.json().catch(() => ({})); setStatus(data.error || "Failed to update."); return; }
      setEditingId(null);
      setStatus("Arm updated successfully.");
      const res = await fetch("/api/admin/class-arms", { cache: "no-store" });
      const data = await res.json().catch(() => []);
      setArms(data.arms ?? []);
    } catch { setStatus("An error occurred."); }
    finally { setSubmitting(false); }
  }

  async function handleUpdateSubject(id: string) {
    const name = editForm[`subject_${id}_name`];
    if (!name?.trim()) { setStatus("Subject name is required."); return; }
    setSubmitting(true);
    try {
      const response = await fetch(`/api/admin/subjects/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (!response.ok) { const data = await response.json().catch(() => ({})); setStatus(data.error || "Failed to update."); return; }
      setEditingId(null);
      setStatus("Subject updated successfully.");
      const res = await fetch("/api/admin/subjects", { cache: "no-store" });
      const data = await res.json().catch(() => []);
      setSubjects(data.subjects ?? []);
    } catch { setStatus("An error occurred."); }
    finally { setSubmitting(false); }
  }

  function startEditing(type: string, id: string, values: Record<string, string>) {
    setEditingId(`${type}_${id}`);
    setEditForm(prev => ({ ...prev, ...values }));
  }

  function cancelEditing() {
    setEditingId(null);
    setEditForm({});
  }

  const tabs = [
    { id: "classGroups" as TabType, label: "Class Groups", icon: School, count: classGroups.length },
    { id: "classes" as TabType, label: "Classes", icon: GraduationCap, count: classes.length },
    { id: "arms" as TabType, label: "Arms", icon: UsersRound, count: arms.length },
    { id: "subjects" as TabType, label: "Subjects", icon: BookMarked, count: subjects.length },
  ];

  if (loading) return <div className="flex items-center justify-center h-64"><div className="text-slate-500">Loading master data...</div></div>;

  return (
    <div className="space-y-6">
      {status && (
        <div className={cn("rounded-lg border px-4 py-3 text-sm", status.includes("success") || status.includes("created") || status.includes("deleted") ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-rose-200 bg-rose-50 text-rose-700")}>
          {status}
        </div>
      )}

      <div className="rounded-xl bg-white shadow-sm border border-slate-200">
        <div className="px-6 py-4 border-b border-slate-100">
          <h2 className="font-semibold text-slate-900">Master Data Governance</h2>
        </div>
        <div className="p-6">
          <div className="grid gap-6 md:grid-cols-4">
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wide">Class Groups</h3>
              <p className="text-xs text-slate-500">Create stage groups to organize classes hierarchically.</p>
            </div>
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wide">Classes</h3>
              <p className="text-xs text-slate-500">Create individual classes and assign them to groups.</p>
            </div>
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wide">Arms</h3>
              <p className="text-xs text-slate-500">Manage class divisions for grouping students.</p>
            </div>
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wide">Subjects</h3>
              <p className="text-xs text-slate-500">Create subjects and manage availability across classes.</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id); setSearchQuery(""); setShowForm(false); }}
              className={cn("flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors", isActive ? "bg-indigo-600 text-white" : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50")}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
              <span className={cn("ml-1 px-2 py-0.5 rounded-full text-xs", isActive ? "bg-white/20" : "bg-slate-100 text-slate-600")}>{tab.count}</span>
            </button>
          );
        })}
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input placeholder={`Search ${tabs.find(t => t.id === activeTab)?.label.toLowerCase()}...`} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9 w-72" />
        </div>
        <Button onClick={() => setShowForm(!showForm)} className="bg-indigo-600 hover:bg-indigo-700">
          {showForm ? <X className="h-4 w-4 mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
          {showForm ? "Cancel" : `Create ${tabs.find(t => t.id === activeTab)?.label}`}
        </Button>
      </div>

      {showForm && (
        <div className="rounded-xl bg-white p-6 shadow-sm border border-slate-200">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Create New {tabs.find(t => t.id === activeTab)?.label}</h3>
          
          {activeTab === "classGroups" && (
            <div className="grid gap-4 md:grid-cols-2 items-end">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Group Name *</label>
                <Input placeholder="e.g., Nursery, Primary, Junior Secondary" value={classGroupForm.name} onChange={(e) => setClassGroupForm(p => ({ ...p, name: e.target.value }))} />
              </div>
              <Button onClick={handleCreateClassGroup} disabled={submitting || !classGroupForm.name.trim()} className="md:w-auto bg-indigo-600 hover:bg-indigo-700">
                {submitting ? "Creating..." : "Create Class Group"}
              </Button>
            </div>
          )}

          {activeTab === "classes" && (
            <div className="grid gap-4 md:grid-cols-3 items-end">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Class Name *</label>
                <Input placeholder="e.g., JSS 1, SS 2A" value={classForm.name} onChange={(e) => setClassForm(p => ({ ...p, name: e.target.value }))} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Class Group *</label>
                <select className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm bg-white h-9" value={classForm.classGroupId} onChange={(e) => setClassForm(p => ({ ...p, classGroupId: e.target.value }))}>
                  <option value="">Select group</option>
                  {classGroups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
                </select>
              </div>
              <Button onClick={handleCreateClass} disabled={submitting || !classForm.name.trim() || !classForm.classGroupId} className="md:w-auto bg-indigo-600 hover:bg-indigo-700">
                {submitting ? "Creating..." : "Create Class"}
              </Button>
            </div>
          )}

          {activeTab === "arms" && (
            <div className="grid gap-4 md:grid-cols-4 items-end">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Arm Name *</label>
                <Input placeholder="e.g., A, B, C, Gold" value={armForm.name} onChange={(e) => setArmForm(p => ({ ...p, name: e.target.value }))} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Class *</label>
                <select className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm bg-white h-9" value={armForm.classId} onChange={(e) => setArmForm(p => ({ ...p, classId: e.target.value }))}>
                  <option value="">Select class</option>
                  {classes.map((c) => <option key={c.id} value={c.id}>{c.name} {c.classGroupName ? `(${c.classGroupName})` : ""}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Max Capacity</label>
                <Input type="number" min="1" placeholder="e.g., 30, 40" value={armForm.capacity} onChange={(e) => setArmForm(p => ({ ...p, capacity: e.target.value }))} />
              </div>
              <Button onClick={handleCreateArm} disabled={submitting || !armForm.name.trim() || !armForm.classId} className="md:w-auto bg-indigo-600 hover:bg-indigo-700">
                {submitting ? "Creating..." : "Create Arm"}
              </Button>
            </div>
          )}

          {activeTab === "subjects" && (
            <div className="grid gap-4 md:grid-cols-2 items-end">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Subject Name *</label>
                <Input placeholder="e.g., Mathematics, English Language" value={subjectForm.name} onChange={(e) => setSubjectForm(p => ({ ...p, name: e.target.value }))} />
              </div>
              <Button onClick={handleCreateSubject} disabled={submitting || !subjectForm.name.trim()} className="md:w-auto bg-indigo-600 hover:bg-indigo-700">
                {submitting ? "Creating..." : "Create Subject"}
              </Button>
            </div>
          )}
        </div>
      )}

      <div className="rounded-xl bg-white shadow-sm border border-slate-200 overflow-hidden">
        {activeTab === "classGroups" && (
          <>
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h2 className="font-semibold text-slate-900">Class Groups</h2>
              <span className="text-sm text-slate-500">{filteredClassGroups.length} groups</span>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                    <th className="px-6 py-3 font-medium">Group Name</th>
                    <th className="px-6 py-3 font-medium">Created</th>
                    <th className="px-6 py-3 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredClassGroups.length === 0 ? (
                    <tr><td colSpan={3} className="px-6 py-12 text-center text-slate-500"><div className="flex flex-col items-center gap-2"><div className="rounded-full bg-slate-100 p-3"><School className="h-6 w-6 text-slate-400" /></div><p>No class groups found</p></div></td></tr>
                  ) : (
                    filteredClassGroups.map((group) => {
                      const isEditing = editingId === `group_${group.id}`;
                      return (
                        <tr key={group.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-6 py-4">
                            {isEditing ? (
                              <Input 
                                value={editForm[`group_${group.id}_name`] || ""} 
                                onChange={(e) => setEditForm(prev => ({ ...prev, [`group_${group.id}_name`]: e.target.value }))}
                                className="w-48"
                              />
                            ) : (
                              <div className="flex items-center gap-3">
                                <div className="h-8 w-8 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-700 font-semibold text-sm">{group.name.charAt(0)}</div>
                                <span className="font-medium text-slate-900">{group.name}</span>
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4 text-slate-600">{new Date(group.createdAt).toLocaleDateString()}</td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex justify-end gap-2">
                              {isEditing ? (
                                <>
                                  <Button size="sm" variant="outline" className="text-emerald-600" onClick={() => handleUpdateClassGroup(group.id)} disabled={submitting}>
                                    <Save className="h-4 w-4" />
                                  </Button>
                                  <Button size="sm" variant="ghost" onClick={cancelEditing}>
                                    <X className="h-4 w-4" />
                                  </Button>
                                </>
                              ) : (
                                <>
                                  <Button size="sm" variant="ghost" className="text-slate-400 hover:text-indigo-600" onClick={() => startEditing("group", group.id, { [`group_${group.id}_name`]: group.name })}>
                                    <Edit2 className="h-4 w-4" />
                                  </Button>
                                  <Button size="sm" variant="ghost" className="text-slate-400 hover:text-rose-600" onClick={() => handleDeleteClassGroup(group.id, group.name)}>
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}

        {activeTab === "classes" && (
          <>
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h2 className="font-semibold text-slate-900">Classes</h2>
              <span className="text-sm text-slate-500">{filteredClasses.length} classes</span>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                    <th className="px-6 py-3 font-medium">Class Name</th>
                    <th className="px-6 py-3 font-medium">Group</th>
                    <th className="px-6 py-3 font-medium">Arms</th>
                    <th className="px-6 py-3 font-medium">Students</th>
                    <th className="px-6 py-3 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredClasses.length === 0 ? (
                    <tr><td colSpan={5} className="px-6 py-12 text-center text-slate-500"><div className="flex flex-col items-center gap-2"><div className="rounded-full bg-slate-100 p-3"><GraduationCap className="h-6 w-6 text-slate-400" /></div><p>No classes found</p></div></td></tr>
                  ) : (
                    filteredClasses.map((cls) => {
                      const isEditing = editingId === `class_${cls.id}`;
                      return (
                        <tr key={cls.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-6 py-4">
                            {isEditing ? (
                              <Input 
                                value={editForm[`class_${cls.id}_name`] || ""} 
                                onChange={(e) => setEditForm(prev => ({ ...prev, [`class_${cls.id}_name`]: e.target.value }))}
                                className="w-32"
                              />
                            ) : (
                              <div className="flex items-center gap-3">
                                <div className="h-8 w-8 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-700 font-semibold text-sm">{cls.name.charAt(0)}</div>
                                <span className="font-medium text-slate-900">{cls.name}</span>
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            {isEditing ? (
                              <select 
                                className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm bg-white"
                                value={editForm[`class_${cls.id}_group`] || ""}
                                onChange={(e) => setEditForm(prev => ({ ...prev, [`class_${cls.id}_group`]: e.target.value }))}
                              >
                                <option value="">No group</option>
                                {classGroups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
                              </select>
                            ) : (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-slate-100 text-slate-700">{cls.classGroupName || "No group"}</span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-slate-600">{cls.armCount} arms</td>
                          <td className="px-6 py-4 text-slate-600">{cls.studentCount} students</td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex justify-end gap-2">
                              {isEditing ? (
                                <>
                                  <Button size="sm" variant="outline" className="text-emerald-600" onClick={() => handleUpdateClass(cls.id)} disabled={submitting}>
                                    <Save className="h-4 w-4" />
                                  </Button>
                                  <Button size="sm" variant="ghost" onClick={cancelEditing}>
                                    <X className="h-4 w-4" />
                                  </Button>
                                </>
                              ) : (
                                <>
                                  <Button size="sm" variant="ghost" className="text-slate-400 hover:text-indigo-600" onClick={() => startEditing("class", cls.id, { [`class_${cls.id}_name`]: cls.name, [`class_${cls.id}_group`]: cls.classGroupId || "" })}>
                                    <Edit2 className="h-4 w-4" />
                                  </Button>
                                  <Button size="sm" variant="ghost" className="text-slate-400 hover:text-rose-600" onClick={() => handleDeleteClass(cls.id, cls.name)}>
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}

        {activeTab === "arms" && (
          <>
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h2 className="font-semibold text-slate-900">Class Arms</h2>
              <span className="text-sm text-slate-500">{filteredArms.length} arms</span>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                    <th className="px-6 py-3 font-medium">Arm</th>
                    <th className="px-6 py-3 font-medium">Class</th>
                    <th className="px-6 py-3 font-medium">Students</th>
                    <th className="px-6 py-3 font-medium">Status</th>
                    <th className="px-6 py-3 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredArms.length === 0 ? (
                    <tr><td colSpan={5} className="px-6 py-12 text-center text-slate-500"><div className="flex flex-col items-center gap-2"><div className="rounded-full bg-slate-100 p-3"><UsersRound className="h-6 w-6 text-slate-400" /></div><p>No arms found</p></div></td></tr>
                  ) : (
                    filteredArms.map((arm) => {
                      const isEditing = editingId === `arm_${arm.id}`;
                      return (
                        <tr key={arm.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-6 py-4">
                            {isEditing ? (
                              <Input 
                                value={editForm[`arm_${arm.id}_name`] || ""} 
                                onChange={(e) => setEditForm(prev => ({ ...prev, [`arm_${arm.id}_name`]: e.target.value }))}
                                className="w-24"
                              />
                            ) : (
                              <div className="flex items-center gap-3">
                                <div className="h-8 w-8 rounded-lg bg-purple-100 flex items-center justify-center text-purple-700 font-semibold text-sm">{arm.name}</div>
                                <span className="font-medium text-slate-900">Arm {arm.name}</span>
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4 text-slate-600">{arm.className}</td>
                          <td className="px-6 py-4 text-slate-600">{arm.studentCount} students</td>
                          <td className="px-6 py-4">
                            {isEditing ? (
                              <select 
                                className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm bg-white"
                                value={editForm[`arm_${arm.id}_active`] || "true"}
                                onChange={(e) => setEditForm(prev => ({ ...prev, [`arm_${arm.id}_active`]: e.target.value }))}
                              >
                                <option value="true">Active</option>
                                <option value="false">Inactive</option>
                              </select>
                            ) : (
                              <span className={cn("inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium", arm.isActive ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600")}>
                                {arm.isActive ? <CheckCircle2 className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
                                {arm.isActive ? "Active" : "Inactive"}
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex justify-end gap-2">
                              {isEditing ? (
                                <>
                                  <Button size="sm" variant="outline" className="text-emerald-600" onClick={() => handleUpdateArm(arm.id)} disabled={submitting}>
                                    <Save className="h-4 w-4" />
                                  </Button>
                                  <Button size="sm" variant="ghost" onClick={cancelEditing}>
                                    <X className="h-4 w-4" />
                                  </Button>
                                </>
                              ) : (
                                <>
                                  <Button size="sm" variant="ghost" className="text-slate-400 hover:text-indigo-600" onClick={() => startEditing("arm", arm.id, { [`arm_${arm.id}_name`]: arm.name, [`arm_${arm.id}_active`]: arm.isActive ? "true" : "false" })}>
                                    <Edit2 className="h-4 w-4" />
                                  </Button>
                                  <Button size="sm" variant="ghost" className="text-slate-400 hover:text-rose-600" onClick={() => handleDeleteClass(arm.id, `Arm ${arm.name}`)}>
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}

        {activeTab === "subjects" && (
          <>
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h2 className="font-semibold text-slate-900">Subjects</h2>
              <span className="text-sm text-slate-500">{filteredSubjects.length} subjects</span>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                    <th className="px-6 py-3 font-medium">Subject Name</th>
                    <th className="px-6 py-3 font-medium">Classes Using</th>
                    <th className="px-6 py-3 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredSubjects.length === 0 ? (
                    <tr><td colSpan={3} className="px-6 py-12 text-center text-slate-500"><div className="flex flex-col items-center gap-2"><div className="rounded-full bg-slate-100 p-3"><BookMarked className="h-6 w-6 text-slate-400" /></div><p>No subjects found</p></div></td></tr>
                  ) : (
                    filteredSubjects.map((subject) => {
                      const isEditing = editingId === `subject_${subject.id}`;
                      return (
                        <tr key={subject.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-6 py-4">
                            {isEditing ? (
                              <Input 
                                value={editForm[`subject_${subject.id}_name`] || ""} 
                                onChange={(e) => setEditForm(prev => ({ ...prev, [`subject_${subject.id}_name`]: e.target.value }))}
                                className="w-48"
                              />
                            ) : (
                              <div className="flex items-center gap-3">
                                <div className="h-8 w-8 rounded-lg bg-amber-100 flex items-center justify-center text-amber-700 font-semibold text-sm">{subject.name.charAt(0)}</div>
                                <span className="font-medium text-slate-900">{subject.name}</span>
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4 text-slate-600">{subject.classCount} classes</td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex justify-end gap-2">
                              {isEditing ? (
                                <>
                                  <Button size="sm" variant="outline" className="text-emerald-600" onClick={() => handleUpdateSubject(subject.id)} disabled={submitting}>
                                    <Save className="h-4 w-4" />
                                  </Button>
                                  <Button size="sm" variant="ghost" onClick={cancelEditing}>
                                    <X className="h-4 w-4" />
                                  </Button>
                                </>
                              ) : (
                                <>
                                  <Button size="sm" variant="ghost" className="text-slate-400 hover:text-indigo-600" onClick={() => startEditing("subject", subject.id, { [`subject_${subject.id}_name`]: subject.name })}>
                                    <Edit2 className="h-4 w-4" />
                                  </Button>
                                  <Button size="sm" variant="ghost" className="text-slate-400 hover:text-rose-600" onClick={() => handleDeleteSubject(subject.id, subject.name)}>
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
