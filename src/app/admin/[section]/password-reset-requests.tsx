"use client";

import { useState, useEffect, useCallback } from "react";
import { Check, X, Clock, Mail, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type ResetRequest = {
  id: string;
  email: string;
  userId: number;
  userName: string;
  roleName: string;
  status: string;
  createdAt: string;
  otpVerifiedAt: string;
  approvedAt?: string;
  approvedBy?: number;
  rejectedAt?: string;
  rejectedBy?: number;
  rejectionReason?: string;
  completedAt?: string;
};

const statusConfig: Record<string, { label: string; color: string; icon: typeof Clock }> = {
  pending_admin_approval: { label: "Pending Approval", color: "text-amber-600 bg-amber-50 border-amber-200", icon: Clock },
  approved: { label: "Approved", color: "text-green-600 bg-green-50 border-green-200", icon: Check },
  rejected: { label: "Rejected", color: "text-red-600 bg-red-50 border-red-200", icon: X },
  completed: { label: "Completed", color: "text-slate-600 bg-slate-50 border-slate-200", icon: Check },
};

export function PasswordResetRequests() {
  const [requests, setRequests] = useState<ResetRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [actioning, setActioning] = useState<string | null>(null);

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/password-reset-requests");
      if (res.ok) {
        const data = await res.json();
        setRequests(data.requests || []);
      }
    } catch {
      // ignore
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/admin/password-reset-requests");
        if (res.ok && !cancelled) {
          const data = await res.json();
          setRequests(data.requests || []);
        }
      } catch {
        // ignore
      }
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  const handleApprove = async (id: string) => {
    setActioning(id);
    try {
      await fetch(`/api/admin/password-reset-requests/${id}/approve`, { method: "POST" });
      await fetchRequests();
    } catch {
      // ignore
    }
    setActioning(null);
  };

  const handleReject = async (id: string) => {
    setActioning(id);
    try {
      await fetch(`/api/admin/password-reset-requests/${id}/reject`, { method: "POST" });
      await fetchRequests();
    } catch {
      // ignore
    }
    setActioning(null);
  };

  const pending = requests.filter((r) => r.status === "pending_admin_approval");
  const others = requests.filter((r) => r.status !== "pending_admin_approval");

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-slate-500">
          Loading password reset requests...
        </CardContent>
      </Card>
    );
  }

  if (requests.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-slate-500">
          No password reset requests.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {pending.length > 0 && (
        <Card className="border-amber-200">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base text-amber-800">
              <Shield className="h-5 w-5" />
              Pending Approval ({pending.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {pending.map((req) => (
              <RequestRow
                key={req.id}
                req={req}
                onApprove={() => handleApprove(req.id)}
                onReject={() => handleReject(req.id)}
                actioning={actioning === req.id}
              />
            ))}
          </CardContent>
        </Card>
      )}

      {others.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-slate-700">History</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {others.map((req) => (
              <RequestRow key={req.id} req={req} />
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function RequestRow({
  req,
  onApprove,
  onReject,
  actioning,
}: {
  req: ResetRequest;
  onApprove?: () => void;
  onReject?: () => void;
  actioning?: boolean;
}) {
  const config = statusConfig[req.status] || statusConfig.pending_admin_approval;
  const StatusIcon = config.icon;

  return (
    <div className="flex items-center justify-between rounded-lg border border-slate-200 p-3">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-full bg-slate-100">
          <Mail className="h-4 w-4 text-slate-500" />
        </div>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-slate-800">{req.userName}</span>
            <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${config.color}`}>
              <StatusIcon className="h-3 w-3" />
              {config.label}
            </span>
          </div>
          <div className="text-xs text-slate-500">{req.email}</div>
          <div className="text-xs text-slate-400">
            Requested: {new Date(req.createdAt).toLocaleString()}
          </div>
          {req.rejectionReason && (
            <div className="text-xs text-red-500">Reason: {req.rejectionReason}</div>
          )}
        </div>
      </div>

      {onApprove && onReject && (
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            className="gap-1 border-green-200 text-green-700 hover:bg-green-50"
            disabled={actioning}
            onClick={onApprove}
          >
            <Check className="h-4 w-4" /> Approve
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="gap-1 border-red-200 text-red-700 hover:bg-red-50"
            disabled={actioning}
            onClick={onReject}
          >
            <X className="h-4 w-4" /> Reject
          </Button>
        </div>
      )}
    </div>
  );
}
