"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Camera, Lock, Mail, MapPin, Phone, Shield, User } from "lucide-react";

type UserProfile = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  address: string | null;
  roleName: string | null;
  avatarUrl: string | null;
  isActive: boolean;
};

export function ProfileManager() {
  const { update: updateSession } = useSession();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", phone: "", address: "" });
  const [pwdForm, setPwdForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const fileRef = useRef<HTMLInputElement>(null);

  const loadProfile = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/profile", { cache: "no-store" });
      const payload = await response.json().catch(() => ({}));
      if (response.ok && payload.user) {
        setProfile(payload.user);
        setForm({
          name: payload.user.name ?? "",
          email: payload.user.email ?? "",
          phone: payload.user.phone ?? "",
          address: payload.user.address ?? "",
        });
      }
    } catch {
      setStatus("Failed to load profile.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => void loadProfile(), 0);
    return () => clearTimeout(timer);
  }, [loadProfile]);

  async function handleUpdate() {
    setStatus("");
    setSaving(true);
    try {
      const response = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        setStatus(payload?.error ?? "Failed to update profile.");
        return;
      }
      setStatus("Profile updated successfully.");
      if (payload.user) {
        setProfile(payload.user);
        setForm({
          name: payload.user.name ?? "",
          email: payload.user.email ?? "",
          phone: payload.user.phone ?? "",
          address: payload.user.address ?? "",
        });
      }
    } catch {
      setStatus("An error occurred.");
    } finally {
      setSaving(false);
    }
  }

  async function handleAvatarUpload(file: File) {
    setUploading(true);
    setStatus("");
    try {
      const data = new FormData();
      data.append("avatar", file);
      const response = await fetch("/api/profile/avatar", {
        method: "POST",
        body: data,
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        setStatus(payload?.error ?? "Failed to upload avatar.");
        return;
      }
      setStatus("Avatar updated.");
      if (payload.avatarUrl && profile) {
        setProfile({ ...profile, avatarUrl: payload.avatarUrl });
      }
      await updateSession();
    } catch {
      setStatus("An error occurred during upload.");
    } finally {
      setUploading(false);
    }
  }

  async function handlePasswordChange() {
    setStatus("");
    if (pwdForm.newPassword !== pwdForm.confirmPassword) {
      setStatus("New passwords do not match.");
      return;
    }
    if (pwdForm.newPassword.length < 6) {
      setStatus("New password must be at least 6 characters.");
      return;
    }
    setSaving(true);
    try {
      const response = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: pwdForm.currentPassword, newPassword: pwdForm.newPassword }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        setStatus(payload?.error ?? "Failed to change password.");
        return;
      }
      setPwdForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
      setShowPassword(false);
      setStatus("Password changed successfully.");
    } catch {
      setStatus("An error occurred.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center rounded-xl border border-slate-200 bg-white p-8 text-sm text-slate-600">
        Loading profile...
      </div>
    );
  }

  const initials = profile?.name?.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) ?? "U";
  const isAdmin = profile?.roleName?.toLowerCase() === "super admin" || profile?.roleName?.toLowerCase() === "school admin";

  return (
    <div className="space-y-6">
      {status ? (
        <div className={`rounded-lg border px-4 py-3 text-sm ${status.includes("success") || status.includes("updated") ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-rose-200 bg-rose-50 text-rose-700"}`}>
          {status}
        </div>
      ) : null}

      {/* Avatar + Current Info Card */}
      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
          <div className="relative">
            <div className="h-24 w-24 overflow-hidden rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-2xl font-bold text-white shadow-lg">
              {profile?.avatarUrl ? (
                <img
                  src={profile.avatarUrl}
                  alt={profile.name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center">{initials}</div>
              )}
            </div>
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full bg-white shadow-md ring-1 ring-slate-200 hover:bg-slate-50 disabled:opacity-50"
              title="Change avatar"
            >
              <Camera className="h-4 w-4 text-slate-600" />
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleAvatarUpload(file);
                e.target.value = "";
              }}
            />
          </div>
          <div className="flex-1 text-center sm:text-left">
            <h2 className="text-lg font-semibold text-slate-900">{profile?.name}</h2>
            <p className="text-sm text-slate-500">{profile?.email}</p>
            <div className="mt-2 flex flex-wrap items-center justify-center gap-2 sm:justify-start">
              <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-700">
                <Shield className="h-3 w-3" />
                {profile?.roleName ?? "User"}
              </span>
              <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${profile?.isActive ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>
                {profile?.isActive ? "Active" : "Inactive"}
              </span>
            </div>
            {/* Current phone/address display */}
            <div className="mt-3 grid gap-1 text-sm sm:grid-cols-2">
              <div className="flex items-center gap-1.5 text-slate-600">
                <Phone className="h-3.5 w-3.5 text-slate-400" />
                <span className={profile?.phone ? "text-slate-900" : "text-slate-400 italic"}>
                  {profile?.phone || "No phone number"}
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-slate-600">
                <MapPin className="h-3.5 w-3.5 text-slate-400" />
                <span className={profile?.address ? "text-slate-900" : "text-slate-400 italic"}>
                  {profile?.address || "No address"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Profile Form */}
      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <h3 className="mb-5 text-sm font-semibold text-slate-900">Edit Information</h3>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-slate-700">
              <User className="h-3.5 w-3.5 text-slate-400" />
              Full Name
            </label>
            <Input
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              placeholder="Your full name"
            />
          </div>
          <div>
            <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-slate-700">
              <Mail className="h-3.5 w-3.5 text-slate-400" />
              Email Address
              {!isAdmin && (
                <span className="ml-auto rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">Admin only</span>
              )}
            </label>
            <Input
              type="email"
              value={form.email}
              disabled={!isAdmin}
              onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
              placeholder={isAdmin ? "your@email.com" : "Contact admin to change"}
              className={!isAdmin ? "bg-slate-50 text-slate-500" : ""}
            />
            {!isAdmin && (
              <p className="mt-1 text-[11px] text-slate-400">
                Only administrators can change email addresses.
              </p>
            )}
          </div>
          <div>
            <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-slate-700">
              <Phone className="h-3.5 w-3.5 text-slate-400" />
              Phone Number
            </label>
            <Input
              value={form.phone}
              onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
              placeholder="+234 ..."
            />
          </div>
          <div>
            <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-slate-700">
              <MapPin className="h-3.5 w-3.5 text-slate-400" />
              Address
            </label>
            <Input
              value={form.address}
              onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))}
              placeholder="Your address"
            />
          </div>
        </div>
        <div className="mt-5">
          <Button onClick={handleUpdate} disabled={saving} className="bg-slate-900 hover:bg-slate-800">
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </div>

      {/* Password Section */}
      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Lock className="h-4 w-4 text-slate-500" />
            <h3 className="text-sm font-semibold text-slate-900">Security</h3>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowPassword((v) => !v)}
          >
            {showPassword ? "Cancel" : "Change Password"}
          </Button>
        </div>

        {showPassword && (
          <div className="mt-5 grid gap-4 md:grid-cols-3">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-700">Current Password</label>
              <Input
                type="password"
                value={pwdForm.currentPassword}
                onChange={(e) => setPwdForm((p) => ({ ...p, currentPassword: e.target.value }))}
                placeholder="Enter current password"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-700">New Password</label>
              <Input
                type="password"
                value={pwdForm.newPassword}
                onChange={(e) => setPwdForm((p) => ({ ...p, newPassword: e.target.value }))}
                placeholder="Min 6 characters"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-700">Confirm Password</label>
              <Input
                type="password"
                value={pwdForm.confirmPassword}
                onChange={(e) => setPwdForm((p) => ({ ...p, confirmPassword: e.target.value }))}
                placeholder="Re-enter new password"
              />
            </div>
            <div className="md:col-span-3">
              <Button onClick={handlePasswordChange} disabled={saving} size="sm">
                {saving ? "Updating..." : "Update Password"}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
