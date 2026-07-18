"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  StudentConfig,
  defaultStudentConfig,
  generateNumber,
} from "@/lib/student-config";
import {
  CheckCircle,
  AlertCircle,
  RefreshCw,
  FileText,
  QrCode,
  IdCard,
  ArrowRightLeft,
  ClipboardList,
} from "lucide-react";
import { cn } from "@/lib/utils";

type TabId = "registration" | "attendance" | "studentId" | "transfers" | "services";

interface Tab {
  id: TabId;
  label: string;
  icon: React.ElementType;
  description: string;
}

const tabs: Tab[] = [
  {
    id: "registration",
    label: "Registration & Admission",
    icon: FileText,
    description: "Configure registration and admission number formats",
  },
  {
    id: "attendance",
    label: "Attendance",
    icon: QrCode,
    description: "Configure attendance tracking and QR code settings",
  },
  {
    id: "studentId",
    label: "Student ID",
    icon: IdCard,
    description: "Configure unique student identification fields",
  },
  {
    id: "transfers",
    label: "Transfers",
    icon: ArrowRightLeft,
    description: "Configure student transfer approval workflows",
  },
  {
    id: "services",
    label: "Service Requests",
    icon: ClipboardList,
    description: "Configure student service request settings",
  },
];

export function StudentSettingsClient() {
  const [activeTab, setActiveTab] = useState<TabId>("registration");
  const [config, setConfig] = useState<StudentConfig>(defaultStudentConfig);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  // Load configuration
  useEffect(() => {
    async function loadConfig() {
      try {
        const res = await fetch("/api/admin/settings/students");
        if (res.ok) {
          const data = await res.json();
          setConfig(data.config);
        }
      } catch {
        // Use default config on error
      } finally {
        setLoading(false);
      }
    }
    loadConfig();
  }, []);

  // Compute previews when config changes
  const preview = useMemo(() => ({
    registration: generateNumber(
      config.registration.registrationPrefix,
      config.registration.registrationDigits,
      config.registration.registrationSuffix,
      config.registration.registrationNextNumber
    ),
    admission: generateNumber(
      config.registration.admissionPrefix,
      config.registration.admissionDigits,
      config.registration.admissionSuffix,
      config.registration.admissionNextNumber
    ),
    serviceRequest: generateNumber(
      config.services.serviceRequestPrefix,
      config.services.serviceRequestDigits,
      "",
      config.services.serviceRequestNextNumber
    ),
  }), [config]);

  function updateConfig(section: keyof StudentConfig, updates: object) {
    setConfig((prev) => ({
      ...prev,
      [section]: {
        ...(prev[section] as object),
        ...updates,
      },
    } as StudentConfig));
  }

  async function saveConfig() {
    setSaving(true);
    setMessage("");

    try {
      const res = await fetch("/api/admin/settings/students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });

      if (res.ok) {
        const data = await res.json();
        setConfig(data.config);
        setMessage("Settings saved successfully!");
      } else {
        const error = await res.json();
        setMessage(error.error || "Failed to save settings");
      }
    } catch {
      setMessage("An error occurred while saving");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Student Settings</h2>
          <p className="text-sm text-slate-500">
            Configure registration, attendance, and student management settings
          </p>
        </div>
        <Button onClick={saveConfig} disabled={saving} className="bg-indigo-600 hover:bg-indigo-700">
          {saving ? (
            <>
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <CheckCircle className="mr-2 h-4 w-4" />
              Save
            </>
          )}
        </Button>
      </div>

      {/* Message */}
      {message && (
        <div
          className={cn(
            "rounded-lg border px-4 py-3 text-sm flex items-center gap-2",
            message.includes("success")
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border-rose-200 bg-rose-50 text-rose-700"
          )}
        >
          {message.includes("success") ? (
            <CheckCircle className="h-4 w-4" />
          ) : (
            <AlertCircle className="h-4 w-4" />
          )}
          {message}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-4">
        {/* Sidebar Tabs */}
        <div className="space-y-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "w-full rounded-lg px-4 py-3 text-left transition-all",
                  isActive
                    ? "bg-indigo-50 border border-indigo-200"
                    : "bg-white border border-slate-200 hover:border-indigo-200 hover:bg-slate-50"
                )}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      "rounded-lg p-2",
                      isActive ? "bg-indigo-100 text-indigo-600" : "bg-slate-100 text-slate-500"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                  <div>
                    <p
                      className={cn(
                        "text-sm font-medium",
                        isActive ? "text-indigo-900" : "text-slate-700"
                      )}
                    >
                      {tab.label}
                    </p>
                    <p className="text-xs text-slate-500 line-clamp-1">{tab.description}</p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div className="lg:col-span-3">
          <div className="rounded-xl border border-slate-200 bg-white p-6">
            {/* Registration & Admission */}
            {activeTab === "registration" && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-base font-semibold text-slate-900">Registration & Admission</h3>
                  <p className="text-sm text-slate-500">
                    Configure how student registration and admission numbers are generated
                  </p>
                </div>

                {/* Provisional Admission Toggle */}
                <div className="rounded-lg border border-slate-200 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-slate-900">Enable Provisional Admission</p>
                      <p className="text-sm text-slate-500">
                        Allow students to be provisionally admitted before final approval
                      </p>
                    </div>
                    <Switch
                      checked={config.registration.enableProvisionalAdmission}
                      onCheckedChange={(checked: boolean) =>
                        updateConfig("registration", { enableProvisionalAdmission: checked })
                      }
                    />
                  </div>
                </div>

                {/* Registration Number Format */}
                <div className="space-y-4">
                  <h4 className="font-medium text-slate-900">Registration Number Format</h4>
                  <div className="grid gap-4 md:grid-cols-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Prefix</label>
                      <Input
                        value={config.registration.registrationPrefix}
                        onChange={(e) =>
                          updateConfig("registration", { registrationPrefix: e.target.value })
                        }
                        placeholder="REG-"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Digits</label>
                      <Input
                        type="number"
                        min={1}
                        max={10}
                        value={config.registration.registrationDigits}
                        onChange={(e) =>
                          updateConfig("registration", {
                            registrationDigits: parseInt(e.target.value) || 4,
                          })
                        }
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Suffix</label>
                      <Input
                        value={config.registration.registrationSuffix}
                        onChange={(e) =>
                          updateConfig("registration", { registrationSuffix: e.target.value })
                        }
                        placeholder="e.g., /2024"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Next Number</label>
                      <Input
                        type="number"
                        min={1}
                        value={config.registration.registrationNextNumber}
                        onChange={(e) =>
                          updateConfig("registration", {
                            registrationNextNumber: parseInt(e.target.value) || 1,
                          })
                        }
                      />
                    </div>
                  </div>
                  <p className="text-sm text-slate-500">
                    Preview: <span className="font-mono text-indigo-600">{preview.registration}</span>
                  </p>
                </div>

                {/* Admission Number Format */}
                <div className="space-y-4">
                  <h4 className="font-medium text-slate-900">Admission Number Format</h4>
                  <div className="grid gap-4 md:grid-cols-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Prefix</label>
                      <Input
                        value={config.registration.admissionPrefix}
                        onChange={(e) =>
                          updateConfig("registration", { admissionPrefix: e.target.value })
                        }
                        placeholder="ADM-"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Digits</label>
                      <Input
                        type="number"
                        min={1}
                        max={10}
                        value={config.registration.admissionDigits}
                        onChange={(e) =>
                          updateConfig("registration", {
                            admissionDigits: parseInt(e.target.value) || 4,
                          })
                        }
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Suffix</label>
                      <Input
                        value={config.registration.admissionSuffix}
                        onChange={(e) =>
                          updateConfig("registration", { admissionSuffix: e.target.value })
                        }
                        placeholder="e.g., /2024"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Next Number</label>
                      <Input
                        type="number"
                        min={1}
                        value={config.registration.admissionNextNumber}
                        onChange={(e) =>
                          updateConfig("registration", {
                            admissionNextNumber: parseInt(e.target.value) || 1,
                          })
                        }
                      />
                    </div>
                  </div>
                  <p className="text-sm text-slate-500">
                    Preview: <span className="font-mono text-indigo-600">{preview.admission}</span>
                  </p>
                </div>
              </div>
            )}

            {/* Attendance */}
            {activeTab === "attendance" && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-base font-semibold text-slate-900">Attendance Configuration</h3>
                  <p className="text-sm text-slate-500">
                    Configure how attendance is tracked and managed
                  </p>
                </div>

                <div className="grid gap-4">
                  <div className="rounded-lg border border-slate-200 p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-slate-900">Enable QR Code Attendance</p>
                        <p className="text-sm text-slate-500">
                          Allow students to mark attendance using QR codes
                        </p>
                      </div>
                      <Switch
                        checked={config.attendance.enableQrCodeAttendance}
                        onCheckedChange={(checked: boolean) =>
                          updateConfig("attendance", { enableQrCodeAttendance: checked })
                        }
                      />
                    </div>
                  </div>

                  {config.attendance.enableQrCodeAttendance && (
                    <div className="rounded-lg border border-slate-200 p-4 bg-slate-50">
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        QR Code Regenerate Interval (seconds)
                      </label>
                      <p className="text-sm text-slate-500 mb-2">
                        Set to 0 for static QR codes. Recommended: 60-300 seconds for security.
                      </p>
                      <Input
                        type="number"
                        min={0}
                        max={3600}
                        value={config.attendance.qrCodeRegenerateSeconds}
                        onChange={(e) =>
                          updateConfig("attendance", {
                            qrCodeRegenerateSeconds: parseInt(e.target.value) || 0,
                          })
                        }
                        className="w-48"
                      />
                    </div>
                  )}

                  <div className="rounded-lg border border-slate-200 p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-slate-900">Notify Parents on Absence</p>
                        <p className="text-sm text-slate-500">
                          Automatically notify parents when student is marked absent
                        </p>
                      </div>
                      <Switch
                        checked={config.attendance.notifyParentsOnAbsence}
                        onCheckedChange={(checked: boolean) =>
                          updateConfig("attendance", { notifyParentsOnAbsence: checked })
                        }
                      />
                    </div>
                  </div>

                  <div className="rounded-lg border border-slate-200 p-4">
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Days to Mark Attendance in Past
                    </label>
                    <p className="text-sm text-slate-500 mb-2">
                      How many days back teachers can retroactively mark attendance
                    </p>
                    <Input
                      type="number"
                      min={0}
                      max={30}
                      value={config.attendance.daysToMarkAttendanceInPast}
                      onChange={(e) =>
                        updateConfig("attendance", {
                          daysToMarkAttendanceInPast: parseInt(e.target.value) || 0,
                        })
                      }
                      className="w-48"
                    />
                  </div>

                  <div className="rounded-lg border border-slate-200 p-4">
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Attendance Timeout (minutes)
                    </label>
                    <p className="text-sm text-slate-500 mb-2">
                      Automatically mark attendance session as closed after this duration
                    </p>
                    <Input
                      type="number"
                      min={5}
                      max={120}
                      value={config.attendance.attendanceTimeoutMinutes}
                      onChange={(e) =>
                        updateConfig("attendance", {
                          attendanceTimeoutMinutes: parseInt(e.target.value) || 30,
                        })
                      }
                      className="w-48"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Student ID */}
            {activeTab === "studentId" && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-base font-semibold text-slate-900">Student ID Configuration</h3>
                  <p className="text-sm text-slate-500">
                    Configure unique student identification fields
                  </p>
                </div>

                <div className="grid gap-4">
                  <div className="rounded-lg border border-slate-200 p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-slate-900">Enable Unique ID Field</p>
                        <p className="text-sm text-slate-500">
                          Add a custom unique identifier field for each student
                        </p>
                      </div>
                      <Switch
                        checked={config.studentId.enableUniqueIdField}
                        onCheckedChange={(checked: boolean) =>
                          updateConfig("studentId", { enableUniqueIdField: checked })
                        }
                      />
                    </div>
                  </div>

                  {config.studentId.enableUniqueIdField && (
                    <div className="space-y-4 rounded-lg border border-slate-200 p-4 bg-slate-50">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          ID Label
                        </label>
                        <p className="text-sm text-slate-500 mb-2">
                          What to call this ID (e.g., &quot;Student ID&quot;, &quot;Roll Number&quot;, &quot;Matric Number&quot;)
                        </p>
                        <Input
                          value={config.studentId.uniqueIdLabel}
                          onChange={(e) =>
                            updateConfig("studentId", { uniqueIdLabel: e.target.value })
                          }
                          placeholder="Student ID"
                        />
                      </div>

                      <div className="rounded-lg border border-slate-200 p-4 bg-white">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-slate-900">Require Unique ID</p>
                            <p className="text-sm text-slate-500">
                              Make the unique ID mandatory during student registration
                            </p>
                          </div>
                          <Switch
                            checked={config.studentId.requireUniqueId}
                            onCheckedChange={(checked: boolean) =>
                              updateConfig("studentId", { requireUniqueId: checked })
                            }
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          Auto-Generate Format (Optional)
                        </label>
                        <p className="text-sm text-slate-500 mb-2">
                          Leave empty for manual entry. Use pattern like &quot;STU-{'{YEAR}'}-{'{NUMBER}'}&quot; for auto-generation.
                        </p>
                        <Input
                          value={config.studentId.autoGenerateFormat}
                          onChange={(e) =>
                            updateConfig("studentId", { autoGenerateFormat: e.target.value })
                          }
                          placeholder="STU-2024-0001 (use {YEAR} and {NUMBER} as placeholders)"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Transfers */}
            {activeTab === "transfers" && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-base font-semibold text-slate-900">Student Transfers</h3>
                  <p className="text-sm text-slate-500">
                    Configure how student transfers are managed and approved
                  </p>
                </div>

                <div className="grid gap-4">
                  <div className="rounded-lg border border-slate-200 p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-slate-900">Require Approval for Transfers</p>
                        <p className="text-sm text-slate-500">
                          Student transfers must be approved by an administrator
                        </p>
                      </div>
                      <Switch
                        checked={config.transfers.requireApprovalForTransfers}
                        onCheckedChange={(checked: boolean) =>
                          updateConfig("transfers", { requireApprovalForTransfers: checked })
                        }
                      />
                    </div>
                  </div>

                  <div className="rounded-lg border border-slate-200 p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-slate-900">Auto-Approve Internal Transfers</p>
                        <p className="text-sm text-slate-500">
                          Automatically approve transfers within the same school
                        </p>
                      </div>
                      <Switch
                        checked={config.transfers.autoApproveInternalTransfers}
                        onCheckedChange={(checked: boolean) =>
                          updateConfig("transfers", { autoApproveInternalTransfers: checked })
                        }
                      />
                    </div>
                  </div>

                  <div className="rounded-lg border border-slate-200 p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-slate-900">Notify Parents on Transfer Request</p>
                        <p className="text-sm text-slate-500">
                          Send notification to parents when a transfer is requested
                        </p>
                      </div>
                      <Switch
                        checked={config.transfers.notifyParentsOnTransferRequest}
                        onCheckedChange={(checked: boolean) =>
                          updateConfig("transfers", { notifyParentsOnTransferRequest: checked })
                        }
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Services */}
            {activeTab === "services" && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-base font-semibold text-slate-900">Service Requests</h3>
                  <p className="text-sm text-slate-500">
                    Configure student service request settings
                  </p>
                </div>

                <div className="grid gap-4">
                  <div className="rounded-lg border border-slate-200 p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-slate-900">Enable Service Requests</p>
                        <p className="text-sm text-slate-500">
                          Allow students and parents to submit service requests
                        </p>
                      </div>
                      <Switch
                        checked={config.services.enableServiceRequests}
                        onCheckedChange={(checked: boolean) =>
                          updateConfig("services", { enableServiceRequests: checked })
                        }
                      />
                    </div>
                  </div>

                  {config.services.enableServiceRequests && (
                    <>
                      <div className="rounded-lg border border-slate-200 p-4 bg-slate-50">
                        <h4 className="font-medium text-slate-900 mb-4">Service Request Number Format</h4>
                        <div className="grid gap-4 md:grid-cols-3">
                          <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Prefix</label>
                            <Input
                              value={config.services.serviceRequestPrefix}
                              onChange={(e) =>
                                updateConfig("services", { serviceRequestPrefix: e.target.value })
                              }
                              placeholder="SR-"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Digits</label>
                            <Input
                              type="number"
                              min={1}
                              max={10}
                              value={config.services.serviceRequestDigits}
                              onChange={(e) =>
                                updateConfig("services", {
                                  serviceRequestDigits: parseInt(e.target.value) || 4,
                                })
                              }
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Next Number</label>
                            <Input
                              type="number"
                              min={1}
                              value={config.services.serviceRequestNextNumber}
                              onChange={(e) =>
                                updateConfig("services", {
                                  serviceRequestNextNumber: parseInt(e.target.value) || 1,
                                })
                              }
                            />
                          </div>
                        </div>
                        <p className="text-sm text-slate-500 mt-2">
                          Preview: <span className="font-mono text-indigo-600">{preview.serviceRequest}</span>
                        </p>
                      </div>

                      <div className="rounded-lg border border-slate-200 p-4 bg-slate-50">
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                          Available Service Types
                        </label>
                        <p className="text-sm text-slate-500 mb-2">
                          Comma-separated list of service types students can request
                        </p>
                        <Input
                          value={config.services.availableServiceTypes.join(", ")}
                          onChange={(e) =>
                            updateConfig("services", {
                              availableServiceTypes: e.target.value
                                .split(",")
                                .map((s) => s.trim())
                                .filter(Boolean),
                            })
                          }
                          placeholder="Document Request, Certificate Request, General Inquiry"
                        />
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
