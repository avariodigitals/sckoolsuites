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
        <p className="text-sm text-slate-600">Password updates are managed via the school administration desk in this release.</p>
      </article>
    </section>
  );
}
