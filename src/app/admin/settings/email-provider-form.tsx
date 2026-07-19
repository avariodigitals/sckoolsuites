"use client";

import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";

type ProviderType = "cpanel" | "google" | "microsoft" | "zoho";

type ProviderConfig = {
  id: number;
  provider: ProviderType;
  domain: string;
  isActive: boolean;
  passwordPolicy: string | null;
  emailPattern: string | null;
  customPattern: string | null;
  hasDefaultPassword: boolean;
  requiredFields: string[];
  hasCredentials: boolean;
  createdAt: string;
};

const PROVIDER_LABELS: Record<ProviderType, string> = {
  cpanel: "cPanel (UAPI)",
  google: "Google Workspace",
  microsoft: "Microsoft 365",
  zoho: "Zoho Mail",
};

const PROVIDER_DESCRIPTIONS: Record<ProviderType, string> = {
  cpanel: "Create email accounts via cPanel UAPI. Best for self-hosted email.",
  google: "Create email accounts via Google Admin SDK Directory API.",
  microsoft: "Create email accounts via Microsoft Graph API.",
  zoho: "Create email accounts via Zoho Mail Admin API.",
};

const PROVIDER_FIELD_LABELS: Record<string, string> = {
  cpanelUrl: "cPanel URL",
  cpanelUser: "cPanel Username",
  cpanelToken: "cPanel API Token",
  serviceAccountEmail: "Service Account Email",
  privateKey: "Private Key (PEM)",
  adminEmail: "Admin Email (for impersonation)",
  tenantId: "Azure Tenant ID",
  clientId: "Azure Client (App) ID",
  clientSecret: "Azure Client Secret",
  usageLocation: "Usage Location (e.g. US, NG)",
  zohoAuthToken: "Zoho Auth Token",
  zohoOrgId: "Zoho Organization ID",
  zohoApiUrl: "Zoho API URL",
};

const PROVIDER_FIELD_PLACEHOLDERS: Record<string, string> = {
  cpanelUrl: "https://yourserver.com:2083",
  cpanelUser: "your_cpanel_username",
  cpanelToken: "your_api_token_from_cPanel",
  serviceAccountEmail: "service-account@project.iam.gserviceaccount.com",
  privateKey: "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----",
  adminEmail: "admin@yourdomain.com",
  tenantId: "your-tenant-id.onmicrosoft.com",
  clientId: "your-azure-app-client-id",
  clientSecret: "your-azure-app-client-secret",
  usageLocation: "US",
  zohoAuthToken: "your_zoho_authtoken",
  zohoOrgId: "your_org_id",
  zohoApiUrl: "https://mail.zoho.com/api/organization",
};

const PROVIDER_FIELDS: Record<ProviderType, string[]> = {
  cpanel: ["cpanelUrl", "cpanelUser", "cpanelToken"],
  google: ["serviceAccountEmail", "privateKey", "adminEmail"],
  microsoft: ["tenantId", "clientId", "clientSecret", "usageLocation"],
  zoho: ["zohoAuthToken", "zohoOrgId", "zohoApiUrl"],
};

const PASSWORD_POLICIES = [
  { value: "fixed", label: "Fixed password (same for all students)" },
  { value: "random", label: "Random password (unique per student)" },
  { value: "firstname+year", label: "Firstname + Year (e.g. john2026)" },
];

const EMAIL_PATTERNS = [
  { value: "firstname.lastname", label: "firstname.lastname (john.doe)" },
  { value: "firstname.lastinitial", label: "firstname.lastinitial (john.d)" },
  { value: "firstinitial.lastname", label: "firstinitial.lastname (j.doe)" },
  { value: "firstname", label: "firstname (john)" },
  { value: "firstname.lastname.year", label: "firstname.lastname.year (john.doe.2026)" },
  { value: "firstname.studentid", label: "firstname.studentid (john.42)" },
  { value: "admissionno", label: "admissionno (adm001)" },
  { value: "custom", label: "Custom pattern" },
];

const CUSTOM_PATTERN_HELP = "Use placeholders: {firstname}, {lastname}, {firstinitial}, {lastinitial}, {studentid}, {year}, {admissionno}";

export function EmailProviderForm() {
  const [configs, setConfigs] = useState<ProviderConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [status, setStatus] = useState<{ type: "success" | "error" | "info"; message: string } | null>(null);

  const [selectedProvider, setSelectedProvider] = useState<ProviderType>("cpanel");
  const [domain, setDomain] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [credentials, setCredentials] = useState<Record<string, string>>({});
  const [defaultPassword, setDefaultPassword] = useState("");
  const [passwordPolicy, setPasswordPolicy] = useState<string>("random");
  const [emailPattern, setEmailPattern] = useState<string>("firstname.lastname");
  const [customPattern, setCustomPattern] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);

  useEffect(() => {
    fetchConfigs();
  }, []);

  async function fetchConfigs() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/email-providers", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setConfigs(data);
      }
    } catch {
      setStatus({ type: "error", message: "Failed to load provider configurations" });
    } finally {
      setLoading(false);
    }
  }

  function resetForm() {
    setSelectedProvider("cpanel");
    setDomain("");
    setIsActive(true);
    setCredentials({});
    setDefaultPassword("");
    setPasswordPolicy("random");
    setEmailPattern("firstname.lastname");
    setCustomPattern("");
    setEditingId(null);
  }

  function editConfig(config: ProviderConfig) {
    setSelectedProvider(config.provider);
    setDomain(config.domain);
    setIsActive(config.isActive);
    setCredentials({});
    setDefaultPassword("");
    setPasswordPolicy(config.passwordPolicy || "random");
    setEmailPattern(config.emailPattern || "firstname.lastname");
    setCustomPattern(config.customPattern || "");
    setEditingId(config.id);
    setStatus(null);
  }

  async function handleSave() {
    if (!domain.trim()) {
      setStatus({ type: "error", message: "Domain is required" });
      return;
    }

    const requiredFields = PROVIDER_FIELDS[selectedProvider];
    const missing = requiredFields.filter((f) => !credentials[f]);
    if (missing.length > 0) {
      setStatus({ type: "error", message: `Missing required fields: ${missing.map((f) => PROVIDER_FIELD_LABELS[f]).join(", ")}` });
      return;
    }

    setSaving(true);
    setStatus(null);
    try {
      const payload: Record<string, unknown> = {
        provider: selectedProvider,
        domain: domain.trim(),
        isActive,
        credentials,
        passwordPolicy,
        emailPattern,
        customPattern: emailPattern === "custom" ? customPattern : null,
      };
      if (defaultPassword) {
        payload.defaultPassword = defaultPassword;
      }

      const res = await fetch("/api/admin/email-providers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setStatus({ type: "error", message: data.error || "Failed to save provider configuration" });
      } else {
        setStatus({ type: "success", message: `${PROVIDER_LABELS[selectedProvider]} configuration saved successfully` });
        resetForm();
        await fetchConfigs();
      }
    } catch {
      setStatus({ type: "error", message: "Network error while saving" });
    } finally {
      setSaving(false);
    }
  }

  async function handleTest() {
    setTesting(true);
    setStatus(null);
    try {
      const res = await fetch("/api/admin/email-providers/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider: selectedProvider }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setStatus({ type: "success", message: `Connection test successful: ${data.message || "Provider is reachable"}` });
      } else {
        setStatus({ type: "error", message: `Connection test failed: ${data.error || "Unknown error"}` });
      }
    } catch {
      setStatus({ type: "error", message: "Network error while testing connection" });
    } finally {
      setTesting(false);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm("Delete this provider configuration?")) return;
    try {
      const res = await fetch(`/api/admin/email-providers?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        setStatus({ type: "success", message: "Provider configuration deleted" });
        if (editingId === id) resetForm();
        await fetchConfigs();
      } else {
        setStatus({ type: "error", message: "Failed to delete provider" });
      }
    } catch {
      setStatus({ type: "error", message: "Network error while deleting" });
    }
  }

  function handleProviderChange(provider: ProviderType) {
    setSelectedProvider(provider);
    setCredentials({});
  }

  const currentFields = PROVIDER_FIELDS[selectedProvider];

  return (
    <div className="space-y-6">
      {/* Status message */}
      {status && (
        <div
          className={`rounded-lg border px-4 py-3 text-sm ${
            status.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : status.type === "error"
                ? "border-rose-200 bg-rose-50 text-rose-700"
                : "border-slate-200 bg-slate-50 text-slate-700"
          }`}
        >
          {status.message}
        </div>
      )}

      {/* Existing configurations */}
      {loading ? (
        <p className="text-sm text-slate-500">Loading configurations...</p>
      ) : configs.length > 0 ? (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-slate-900">Configured Providers</h3>
          <div className="grid gap-3">
            {configs.map((config) => (
              <div
                key={config.id}
                className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50/50 p-4"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-slate-900">
                      {PROVIDER_LABELS[config.provider] || config.provider}
                    </span>
                    {config.isActive ? (
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
                        Active
                      </span>
                    ) : (
                      <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs font-medium text-slate-600">
                        Inactive
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-slate-500">
                    Domain: <strong>{config.domain}</strong>
                    {config.emailPattern && (
                      <> &middot; Pattern: <strong>{config.emailPattern}</strong></>
                    )}
                    {config.passwordPolicy && (
                      <> &middot; Password: <strong>{config.passwordPolicy}</strong></>
                    )}
                  </div>
                  <div className="text-xs text-slate-400">
                    Credentials: {config.hasCredentials ? "Configured" : "Missing"}
                    {config.hasDefaultPassword && " &middot; Default password set"}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => editConfig(config)}>
                    Edit
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => handleTest()}>
                    Test
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-rose-600 hover:bg-rose-50"
                    onClick={() => handleDelete(config.id)}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50/50 p-6 text-center">
          <p className="text-sm text-slate-500">
            No email provider configured yet. Configure one below to enable automatic student email creation.
          </p>
        </div>
      )}

      {/* Configuration form */}
      <div className="rounded-lg border border-slate-200 p-5 space-y-5">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-900">
            {editingId ? "Edit Provider" : "Add New Provider"}
          </h3>
          {editingId && (
            <Button size="sm" variant="ghost" onClick={resetForm}>
              Cancel
            </Button>
          )}
        </div>

        {/* Provider selection */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700">Email Provider</label>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {(Object.keys(PROVIDER_LABELS) as ProviderType[]).map((provider) => (
              <button
                key={provider}
                type="button"
                onClick={() => handleProviderChange(provider)}
                className={`rounded-lg border p-3 text-left transition-colors ${
                  selectedProvider === provider
                    ? "border-indigo-600 bg-indigo-50"
                    : "border-slate-200 bg-white hover:border-slate-300"
                }`}
              >
                <div className="text-sm font-semibold text-slate-900">
                  {PROVIDER_LABELS[provider]}
                </div>
                <div className="mt-1 text-xs text-slate-500">
                  {PROVIDER_DESCRIPTIONS[provider]}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Domain */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700">
            Email Domain <span className="text-rose-500">*</span>
          </label>
          <Input
            type="text"
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            placeholder="schooldomain.com"
            className="max-w-md"
          />
          <p className="text-xs text-slate-500">
            Student emails will be created on this domain (e.g. john.doe@schooldomain.com)
          </p>
        </div>

        {/* Provider credentials */}
        <div className="space-y-3">
          <label className="text-sm font-medium text-slate-700">
            Provider Credentials <span className="text-rose-500">*</span>
          </label>
          {editingId && (
            <p className="text-xs text-amber-600">
              Leave fields blank to keep existing credentials. Fill in to update.
            </p>
          )}
          <div className="grid gap-3 sm:grid-cols-2">
            {currentFields.map((field) => (
              <div key={field} className="space-y-1">
                <label className="text-xs font-medium text-slate-600">
                  {PROVIDER_FIELD_LABELS[field] || field}
                </label>
                {field === "privateKey" ? (
                  <textarea
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm font-mono"
                    rows={4}
                    value={credentials[field] || ""}
                    onChange={(e) =>
                      setCredentials((prev) => ({ ...prev, [field]: e.target.value }))
                    }
                    placeholder={PROVIDER_FIELD_PLACEHOLDERS[field] || ""}
                  />
                ) : (
                  <Input
                    type="text"
                    value={credentials[field] || ""}
                    onChange={(e) =>
                      setCredentials((prev) => ({ ...prev, [field]: e.target.value }))
                    }
                    placeholder={PROVIDER_FIELD_PLACEHOLDERS[field] || ""}
                    className="text-sm"
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Email pattern */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700">Email Address Pattern</label>
          <select
            className="w-full max-w-md rounded-md border border-slate-300 px-3 py-2 text-sm"
            value={emailPattern}
            onChange={(e) => setEmailPattern(e.target.value)}
          >
            {EMAIL_PATTERNS.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
          {emailPattern === "custom" && (
            <div className="space-y-1">
              <Input
                type="text"
                value={customPattern}
                onChange={(e) => setCustomPattern(e.target.value)}
                placeholder="{firstname}.{firstinitial}{lastinitial}"
                className="max-w-md"
              />
              <p className="text-xs text-slate-500">{CUSTOM_PATTERN_HELP}</p>
            </div>
          )}
          <p className="text-xs text-slate-500">
            Preview: <strong>{getPreview(emailPattern, customPattern)}</strong>@{domain || "schooldomain.com"}
          </p>
        </div>

        {/* Password policy */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700">Password Policy</label>
          <select
            className="w-full max-w-md rounded-md border border-slate-300 px-3 py-2 text-sm"
            value={passwordPolicy}
            onChange={(e) => setPasswordPolicy(e.target.value)}
          >
            {PASSWORD_POLICIES.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
          {passwordPolicy === "fixed" && (
            <div className="space-y-1">
              <Input
                type="text"
                value={defaultPassword}
                onChange={(e) => setDefaultPassword(e.target.value)}
                placeholder="Default password for all student emails"
                className="max-w-md"
              />
              <p className="text-xs text-amber-600">
                Warning: All students will have the same password. They should change it on first login.
              </p>
            </div>
          )}
        </div>

        {/* Active toggle */}
        <div className="flex items-center gap-3">
          <Switch checked={isActive} onCheckedChange={setIsActive} />
          <div>
            <label className="text-sm font-medium text-slate-700">Active</label>
            <p className="text-xs text-slate-500">
              Only one provider can be active at a time. New student emails will use the active provider.
            </p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-3 pt-2">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : editingId ? "Update Provider" : "Save Provider"}
          </Button>
          <Button variant="outline" onClick={handleTest} disabled={testing || !editingId}>
            {testing ? "Testing..." : "Test Connection"}
          </Button>
          {!editingId && (
            <Button variant="ghost" onClick={resetForm}>
              Clear
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function getPreview(pattern: string, customPattern: string): string {
  const first = "john";
  const last = "doe";
  const firstInitial = "j";
  const lastInitial = "d";
  const year = new Date().getFullYear();
  const studentId = "42";
  const admissionNo = "adm001";

  switch (pattern) {
    case "firstname.lastinitial":
      return `${first}.${lastInitial}`;
    case "firstinitial.lastname":
      return `${firstInitial}.${last}`;
    case "firstname":
      return first;
    case "firstname.lastname.year":
      return `${first}.${last}.${year}`;
    case "firstname.studentid":
      return `${first}.${studentId}`;
    case "admissionno":
      return admissionNo;
    case "custom":
      if (customPattern) {
        return customPattern
          .replace(/\{firstname\}/g, first)
          .replace(/\{lastname\}/g, last)
          .replace(/\{firstinitial\}/g, firstInitial)
          .replace(/\{lastinitial\}/g, lastInitial)
          .replace(/\{studentid\}/g, studentId)
          .replace(/\{year\}/g, String(year))
          .replace(/\{admissionno\}/g, admissionNo);
      }
      return `${first}.${last}`;
    case "firstname.lastname":
    default:
      return `${first}.${last}`;
  }
}

