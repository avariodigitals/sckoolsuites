"use client";

import { useEffect, useState } from "react";

type ProfilePayload = {
  name: string;
  email: string;
  phone: string | null;
  address: string | null;
};

export function TeacherProfilePanel() {
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [profile, setProfile] = useState<ProfilePayload>({
    name: "",
    email: "",
    phone: "",
    address: "",
  });
  const [security, setSecurity] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [securityBusy, setSecurityBusy] = useState(false);
  const [securityMessage, setSecurityMessage] = useState("");

  useEffect(() => {
    (async () => {
      const response = await fetch("/api/profile");
      const payload = await response.json().catch(() => null);
      if (payload && !payload.error && payload.user) {
        setProfile({
          name: payload.user.name ?? "",
          email: payload.user.email ?? "",
          phone: payload.user.phone ?? "",
          address: payload.user.address ?? "",
        });
      }
      setLoading(false);
    })();
  }, []);

  async function save() {
    setMessage("Saving...");
    const response = await fetch("/api/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: profile.name,
        phone: profile.phone,
        address: profile.address,
      }),
    });

    const payload = await response.json().catch(() => ({}));
    setMessage(response.ok ? "Profile updated." : payload?.error ?? "Could not update profile.");
  }

  async function changePassword() {
    setSecurityMessage("");

    if (!security.currentPassword || !security.newPassword) {
      setSecurityMessage("Please fill in all password fields.");
      return;
    }

    if (security.newPassword.length < 6) {
      setSecurityMessage("New password must be at least 6 characters.");
      return;
    }

    if (security.newPassword !== security.confirmPassword) {
      setSecurityMessage("New passwords do not match.");
      return;
    }

    setSecurityBusy(true);
    try {
      const response = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: security.currentPassword,
          newPassword: security.newPassword,
        }),
      });

      const payload = await response.json().catch(() => ({}));
      if (response.ok) {
        setSecurityMessage("Password changed successfully.");
        setSecurity({ currentPassword: "", newPassword: "", confirmPassword: "" });
      } else {
        setSecurityMessage(payload?.error ?? "Could not change password.");
      }
    } catch {
      setSecurityMessage("An error occurred while changing password.");
    } finally {
      setSecurityBusy(false);
    }
  }

  return (
    <section className="grid gap-3 xl:grid-cols-[1.2fr_1fr]">
      <article className="glass-panel rounded-2xl p-4">
        <h3 className="mb-3 text-base font-semibold text-slate-900">Teacher Profile Settings</h3>
        {loading ? <p className="text-sm text-slate-500">Loading...</p> : (
          <div className="grid gap-2 text-sm md:grid-cols-2">
            <input className="rounded-md border border-slate-300 px-3 py-2" placeholder="Name" value={profile.name} onChange={(e) => setProfile((s) => ({ ...s, name: e.target.value }))} />
            <input className="rounded-md border border-slate-300 px-3 py-2" placeholder="Phone" value={profile.phone ?? ""} onChange={(e) => setProfile((s) => ({ ...s, phone: e.target.value }))} />
            <input className="rounded-md border border-slate-300 px-3 py-2 md:col-span-2" placeholder="Email" value={profile.email} disabled title="Email changes require admin approval" />
            <textarea className="rounded-md border border-slate-300 px-3 py-2 md:col-span-2" placeholder="Address" value={profile.address ?? ""} onChange={(e) => setProfile((s) => ({ ...s, address: e.target.value }))} />
            <button type="button" onClick={save} className="rounded-md bg-[var(--brand-primary)] px-3 py-2 text-white md:col-span-2">Save Profile</button>
          </div>
        )}
        {message ? <p className="mt-2 text-xs text-slate-600">{message}</p> : null}
      </article>

      <article className="glass-panel rounded-2xl p-4">
        <h3 className="mb-3 text-base font-semibold text-slate-900">Security</h3>
        <div className="grid gap-2 text-sm">
          <input
            type="password"
            className="rounded-md border border-slate-300 px-3 py-2"
            placeholder="Current password"
            value={security.currentPassword}
            onChange={(e) => setSecurity((s) => ({ ...s, currentPassword: e.target.value }))}
          />
          <input
            type="password"
            className="rounded-md border border-slate-300 px-3 py-2"
            placeholder="New password (min 6 characters)"
            value={security.newPassword}
            onChange={(e) => setSecurity((s) => ({ ...s, newPassword: e.target.value }))}
          />
          <input
            type="password"
            className="rounded-md border border-slate-300 px-3 py-2"
            placeholder="Confirm new password"
            value={security.confirmPassword}
            onChange={(e) => setSecurity((s) => ({ ...s, confirmPassword: e.target.value }))}
          />
          <button
            type="button"
            onClick={changePassword}
            disabled={securityBusy}
            className="rounded-md bg-slate-900 px-3 py-2 text-white disabled:opacity-60"
          >
            {securityBusy ? "Updating..." : "Change Password"}
          </button>
          {securityMessage ? <p className="text-xs text-slate-600">{securityMessage}</p> : null}
        </div>
      </article>
    </section>
  );
}
