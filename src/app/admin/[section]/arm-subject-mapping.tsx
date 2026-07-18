"use client";

import { useEffect, useMemo, useState } from "react";
import { 
  BookMarked, 
  Layers, 
  Users, 
  Link2,
  CheckCircle2,
  AlertCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type ClassArm = {
  id: string;
  name: string;
  classId: string;
  className: string;
  subjects: { id: string; name: string; teacherId?: string; teacherName?: string }[];
  studentCount: number;
};

type Subject = {
  id: string;
  name: string;
  classId: string | null;
  className: string | null;
  teacherId: string | null;
  teacherName: string | null;
};


export function ArmSubjectMappingManager() {
  const [arms, setArms] = useState<ClassArm[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [, setTeachers] = useState<Array<{ id: string; name: string; email: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  // Analytics
  const stats = useMemo(() => {
    const totalArms = arms.length;
    const totalSubjects = subjects.length;
    const mappedSubjects = arms.reduce((acc, arm) => acc + arm.subjects.length, 0);
    const withTeachers = arms.reduce((acc, arm) => 
      acc + arm.subjects.filter(s => s.teacherId).length, 0
    );
    return { totalArms, totalSubjects, mappedSubjects, withTeachers };
  }, [arms, subjects]);

  const filteredArms = useMemo(() => {
    if (!searchQuery.trim()) return arms;
    const query = searchQuery.toLowerCase();
    return arms.filter(
      (a) =>
        a.name.toLowerCase().includes(query) ||
        a.className.toLowerCase().includes(query)
    );
  }, [arms, searchQuery]);

  useEffect(() => {
    let cancelled = false;
    const doLoad = async () => {
      setLoading(true);
      setStatus("");
      try {
        const [armsRes, subjectsRes, teachersRes] = await Promise.all([
          fetch("/api/admin/class-arms", { cache: "no-store" }),
          fetch("/api/admin/subjects", { cache: "no-store" }),
          fetch("/api/admin/teachers", { cache: "no-store" }),
        ]);
        
        const armsData = await armsRes.json().catch(() => []);
        const subjectsData = await subjectsRes.json().catch(() => []);
        const teachersData = await teachersRes.json().catch(() => []);
        
        if (!cancelled) {
          setArms((armsData.arms ?? []).map((a: any) => ({
            ...a,
            subjects: a.subjects ?? [],
            studentCount: a.studentCount ?? 0,
            className: a.className ?? "Unassigned",
          })));
          setSubjects(subjectsData.subjects ?? []);
          setTeachers(teachersData.teachers ?? []);
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-500">Loading arm subject data...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Status Alert */}
      {status && (
        <div className={cn(
          "rounded-lg border px-4 py-3 text-sm",
          status.includes("success") 
            ? "border-emerald-200 bg-emerald-50 text-emerald-700" 
            : "border-rose-200 bg-rose-50 text-rose-700"
        )}>
          {status}
        </div>
      )}

      {/* Module Scope */}
      <div className="rounded-xl bg-white shadow-sm border border-slate-200">
        <div className="px-6 py-4 border-b border-slate-100">
          <h2 className="font-semibold text-slate-900">Arm Subject Mapping Scope</h2>
        </div>
        <div className="p-6">
          <div className="grid gap-6 md:grid-cols-3">
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wide">Assign Subjects</h3>
              <div className="flex flex-wrap gap-2">
                <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-slate-100 text-slate-700">Subject Selection</span>
                <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-slate-100 text-slate-700">Arm Binding</span>
                <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-slate-100 text-slate-700">Bulk Assign</span>
              </div>
            </div>
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wide">Per Arm Rules</h3>
              <div className="flex flex-wrap gap-2">
                <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-slate-100 text-slate-700">Different Subjects</span>
                <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-slate-100 text-slate-700">Arm A vs Arm B</span>
                <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-slate-100 text-slate-700">Junior/Senior Split</span>
              </div>
            </div>
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wide">Teacher Binding</h3>
              <div className="flex flex-wrap gap-2">
                <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-slate-100 text-slate-700">Assign Teacher</span>
                <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-slate-100 text-slate-700">Subject-Arm Pair</span>
                <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-slate-100 text-slate-700">Workload Track</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Analytics Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-xl bg-white p-6 shadow-sm border border-slate-200">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">Class Arms</p>
              <p className="mt-2 text-3xl font-bold text-slate-900">{stats.totalArms}</p>
            </div>
            <div className="rounded-lg bg-indigo-50 p-3">
              <Layers className="h-6 w-6 text-indigo-600" />
            </div>
          </div>
        </div>
        
        <div className="rounded-xl bg-white p-6 shadow-sm border border-slate-200">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">Available Subjects</p>
              <p className="mt-2 text-3xl font-bold text-slate-900">{stats.totalSubjects}</p>
            </div>
            <div className="rounded-lg bg-blue-50 p-3">
              <BookMarked className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>
        
        <div className="rounded-xl bg-white p-6 shadow-sm border border-slate-200">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">Mapped Subjects</p>
              <p className="mt-2 text-3xl font-bold text-slate-900">{stats.mappedSubjects}</p>
              <p className="text-xs text-slate-500 mt-1">across all arms</p>
            </div>
            <div className="rounded-lg bg-emerald-50 p-3">
              <Link2 className="h-6 w-6 text-emerald-600" />
            </div>
          </div>
        </div>
        
        <div className="rounded-xl bg-white p-6 shadow-sm border border-slate-200">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">With Teachers</p>
              <p className="mt-2 text-3xl font-bold text-slate-900">{stats.withTeachers}</p>
              <p className="text-xs text-slate-500 mt-1">of {stats.mappedSubjects} mapped</p>
            </div>
            <div className="rounded-lg bg-purple-50 p-3">
              <Users className="h-6 w-6 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-md">
          <Layers className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            placeholder="Search arms..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 w-full sm:w-64"
          />
        </div>
        <Button className="bg-indigo-600 hover:bg-indigo-700">+ Quick Map</Button>
      </div>

      {/* Arms Grid */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-3">
        {filteredArms.length === 0 ? (
          <div className="col-span-full rounded-xl bg-white p-12 text-center border border-slate-200">
            <div className="mx-auto mb-4 rounded-full bg-slate-100 p-4 w-fit">
              <Layers className="h-8 w-8 text-slate-400" />
            </div>
            <p className="text-slate-500">No class arms found</p>
            <p className="text-sm text-slate-400 mt-1">Create classes and arms first</p>
          </div>
        ) : (
          filteredArms.map((arm) => (
            <div key={arm.id} className="rounded-xl bg-white shadow-sm border border-slate-200 overflow-hidden">
              <div className="px-4 sm:px-6 py-4 border-b border-slate-100 bg-slate-50/50">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-slate-900">{arm.className} {arm.name}</h3>
                    <p className="text-sm text-slate-500">{arm.studentCount} students</p>
                  </div>
                  <div className="rounded-lg bg-indigo-50 p-2 shrink-0">
                    <Layers className="h-5 w-5 text-indigo-600" />
                  </div>
                </div>
              </div>
              
              <div className="p-4 sm:p-6">
                {arm.subjects.length === 0 ? (
                  <div className="text-center py-4">
                    <AlertCircle className="h-6 w-6 text-slate-300 mx-auto mb-2" />
                    <p className="text-sm text-slate-500">No subjects mapped</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {arm.subjects.map((subject) => (
                      <div key={subject.id} className="flex items-center justify-between py-2 px-3 rounded-lg bg-slate-50">
                        <div className="flex items-center gap-2">
                          <BookMarked className="h-4 w-4 text-slate-400" />
                          <span className="text-sm font-medium text-slate-700">{subject.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {subject.teacherId ? (
                            <span className="inline-flex items-center gap-1 text-xs text-emerald-600">
                              <CheckCircle2 className="h-3 w-3" />
                              {subject.teacherName || "Assigned"}
                            </span>
                          ) : (
                            <span className="text-xs text-amber-600">No teacher</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
