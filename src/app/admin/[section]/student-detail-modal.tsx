"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import {
  X,
  User,
  Phone,
  Shield,
  Users,
  BookOpen,
  FileText,
  Wallet,
  RotateCcw,
  CalendarCheck,
  GraduationCap,
  BookMarked,
  MessageSquare,
  StickyNote,
  FileCheck,
  Award,
  Landmark,
  Bus,
  Loader2,
  Camera,
} from "lucide-react";
import {
  BasicTab,
  ContactTab,
  LoginTab,
  GuardianTab,
  SiblingTab,
  RecordTab,
  FeeTab,
  WalletTab,
  RefundTab,
  AttendanceTab,
  ExamTab,
  SubjectTab,
  DialogueTab,
  NoteTab,
  DocumentTab,
  QualificationTab,
  AccountTab,
  TransportTab,
} from "./student-detail-tabs";
import { StudentPromoteDialog } from "./student-promote-dialog";

type TabKey =
  | "basic"
  | "contact"
  | "login"
  | "guardian"
  | "sibling"
  | "record"
  | "fee"
  | "wallet"
  | "refund"
  | "attendance"
  | "exam"
  | "subject"
  | "dialogue"
  | "note"
  | "document"
  | "qualification"
  | "account"
  | "transport";

const tabs: { key: TabKey; label: string; icon: React.ReactNode }[] = [
  { key: "basic", label: "Basic", icon: <User className="h-4 w-4" /> },
  { key: "contact", label: "Contact", icon: <Phone className="h-4 w-4" /> },
  { key: "login", label: "User Login", icon: <Shield className="h-4 w-4" /> },
  { key: "guardian", label: "Guardian", icon: <Users className="h-4 w-4" /> },
  { key: "sibling", label: "Sibling", icon: <Users className="h-4 w-4" /> },
  { key: "record", label: "Record", icon: <BookOpen className="h-4 w-4" /> },
  { key: "fee", label: "Fee", icon: <FileText className="h-4 w-4" /> },
  { key: "wallet", label: "Wallet", icon: <Wallet className="h-4 w-4" /> },
  { key: "refund", label: "Fee Refund", icon: <RotateCcw className="h-4 w-4" /> },
  { key: "attendance", label: "Attendance", icon: <CalendarCheck className="h-4 w-4" /> },
  { key: "exam", label: "Exam Report", icon: <GraduationCap className="h-4 w-4" /> },
  { key: "subject", label: "Subject", icon: <BookMarked className="h-4 w-4" /> },
  { key: "dialogue", label: "Dialogue", icon: <MessageSquare className="h-4 w-4" /> },
  { key: "note", label: "Note", icon: <StickyNote className="h-4 w-4" /> },
  { key: "document", label: "Document", icon: <FileCheck className="h-4 w-4" /> },
  { key: "qualification", label: "Qualification", icon: <Award className="h-4 w-4" /> },
  { key: "account", label: "Account", icon: <Landmark className="h-4 w-4" /> },
  { key: "transport", label: "Transport", icon: <Bus className="h-4 w-4" /> },
];

export function StudentDetailModal({ studentId, onClose }: { studentId: string; onClose: () => void }) {
  const [activeTab, setActiveTab] = useState<TabKey>("basic");
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState("");
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [promoteOpen, setPromoteOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/students/${studentId}/detail`, { cache: "no-store" });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(payload?.error ?? "Failed to load student details.");
        return;
      }
      setData(payload);
    } catch {
      setError("Failed to load student details.");
    } finally {
      setLoading(false);
    }
  }, [studentId]);

  useEffect(() => {
    let cancelled = false;
    async function fetchData() {
      setLoading(true);
      setError("");
      try {
        const res = await fetch(`/api/admin/students/${studentId}/detail`, { cache: "no-store" });
        const payload = await res.json().catch(() => ({}));
        if (!cancelled) {
          if (!res.ok) {
            setError(payload?.error ?? "Failed to load student details.");
          } else {
            setData(payload);
          }
          setLoading(false);
        }
      } catch {
        if (!cancelled) {
          setError("Failed to load student details.");
          setLoading(false);
        }
      }
    }
    fetchData();
    return () => { cancelled = true; };
  }, [studentId]);

  const s = data?.student;

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !studentId) return;
    setUploadingAvatar(true);
    const fd = new FormData();
    fd.append("file", file);
    try {
      const res = await fetch(`/api/admin/students/${studentId}/avatar`, { method: "POST", body: fd });
      if (res.ok) {
        const result = await res.json();
        setData((prev: any) => prev ? { ...prev, student: { ...prev.student, passportUrl: result.url } } : prev);
      }
    } catch {
      // ignore
    } finally {
      setUploadingAvatar(false);
    }
  }

  function renderContent() {
    if (loading) {
      return (
        <div className="flex h-64 items-center justify-center text-slate-500">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          Loading student details...
        </div>
      );
    }
    if (error) {
      return <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</div>;
    }
    if (!s) return null;

    switch (activeTab) {
      case "basic": return <BasicTab student={s} studentId={studentId} onUpdate={load} />;
      case "contact": return <ContactTab student={s} studentId={studentId} onUpdate={load} />;
      case "login": return <LoginTab student={s} studentId={studentId} onUpdate={load} />;
      case "guardian": return <GuardianTab student={s} data={data} studentId={studentId} onUpdate={load} />;
      case "sibling": return <SiblingTab data={data} />;
      case "record": return <RecordTab data={data} />;
      case "fee": return <FeeTab data={data} />;
      case "wallet": return <WalletTab data={data} />;
      case "refund": return <RefundTab />;
      case "attendance": return <AttendanceTab data={data} />;
      case "exam": return <ExamTab data={data} studentId={studentId} onUpdate={load} />;
      case "subject": return <SubjectTab data={data} />;
      case "dialogue": return <DialogueTab data={data} />;
      case "note": return <NoteTab data={data} />;
      case "document": return <DocumentTab data={data} />;
      case "qualification": return <QualificationTab data={data} />;
      case "account": return <AccountTab data={data} />;
      case "transport": return <TransportTab data={data} />;
      default: return null;
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 p-4 pt-8">
      <div className="flex h-[calc(100vh-4rem)] w-full max-w-6xl overflow-hidden rounded-xl bg-white shadow-2xl">
        {/* Left Sidebar Tabs */}
        <div className="flex w-52 flex-shrink-0 flex-col border-r border-slate-200 bg-slate-50">
          <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Sections</span>
            <button onClick={onClose} className="rounded-md p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-600">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto py-2">
            {tabs.map((t) => (
              <button
                key={t.key}
                onClick={() => setActiveTab(t.key)}
                className={`flex w-full items-center gap-2.5 px-4 py-2 text-left text-sm transition-colors ${
                  activeTab === t.key
                    ? "bg-indigo-50 font-medium text-indigo-700"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                {t.icon}
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Right Content */}
        <div className="flex flex-1 flex-col overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="relative">
                {s?.passportUrl ? (
                  <Image src={s.passportUrl} alt="" width={40} height={40} className="h-10 w-10 rounded-full object-cover" />
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 text-sm font-bold text-indigo-700">
                    {s?.user?.name?.charAt(0)?.toUpperCase() ?? "S"}
                  </div>
                )}
                <label className="absolute -bottom-1 -right-1 flex h-5 w-5 cursor-pointer items-center justify-center rounded-full bg-slate-800 text-white hover:bg-slate-700">
                  <Camera className="h-3 w-3" />
                  <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
                </label>
                {uploadingAvatar && <Loader2 className="absolute inset-0 m-auto h-4 w-4 animate-spin text-indigo-600" />}
              </div>
              <div>
                <h2 className="text-base font-semibold text-slate-900">{s?.user?.name ?? "Student Details"}</h2>
                <p className="text-xs text-slate-500">
                  {s?.class?.name ?? "No class"} · {s?.gender ?? "-"} · Age {s?.age ?? "-"}
                </p>
              </div>
            </div>
            <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${s?.user?.isActive ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>
              {s?.user?.isActive ? "Active" : "Inactive"}
            </span>
            <button
              type="button"
              onClick={() => setPromoteOpen(true)}
              className="ml-3 rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700"
            >
              Promote
            </button>
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto p-6">{renderContent()}</div>
        </div>
      </div>

      {promoteOpen && (
        <StudentPromoteDialog
          studentId={studentId}
          latestEnrollment={data?.enrollments?.[0]}
          onClose={() => setPromoteOpen(false)}
          onSuccess={load}
        />
      )}
    </div>
  );
}
