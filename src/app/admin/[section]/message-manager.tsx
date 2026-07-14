"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Mail, Search } from "lucide-react";

type Message = {
  id: number;
  parentId: number;
  parentName: string;
  recipient: string;
  subject: string;
  message: string;
  status: string;
  createdAt: string;
};

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function statusColor(status: string) {
  const s = status.toLowerCase();
  if (s === "read") return "bg-emerald-100 text-emerald-700";
  if (s === "replied") return "bg-blue-100 text-blue-700";
  if (s === "archived") return "bg-slate-100 text-slate-600";
  return "bg-amber-100 text-amber-700";
}

export function MessageManager() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const filteredMessages = useMemo(() => {
    let list = messages;
    if (statusFilter !== "all") {
      list = list.filter((m) => m.status === statusFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (m) =>
          m.subject.toLowerCase().includes(q) ||
          m.parentName.toLowerCase().includes(q) ||
          m.recipient.toLowerCase().includes(q) ||
          m.message.toLowerCase().includes(q)
      );
    }
    return list;
  }, [messages, searchQuery, statusFilter]);

  const loadMessages = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/messages", { cache: "no-store" });
      const payload = await response.json().catch(() => ({}));
      if (response.ok) {
        setMessages(payload.messages ?? []);
      } else {
        setStatus(payload?.error ?? "Failed to load messages.");
      }
    } catch {
      setStatus("Failed to load messages.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => void loadMessages(), 0);
    return () => clearTimeout(timer);
  }, [loadMessages]);

  const selectedMessage = selectedId
    ? messages.find((m) => m.id === selectedId) ?? null
    : null;

  if (loading) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
        Loading messages...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {status ? (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {status}
        </div>
      ) : null}

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-md flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            placeholder="Search by subject, parent, recipient..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <select
          className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="all">All Status</option>
          <option value="sent">Sent</option>
          <option value="read">Read</option>
          <option value="replied">Replied</option>
          <option value="archived">Archived</option>
        </select>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white lg:col-span-1">
          <div className="max-h-[32rem] overflow-y-auto divide-y divide-slate-100">
            {filteredMessages.length === 0 ? (
              <div className="p-6 text-center text-sm text-slate-500">
                <Mail className="mx-auto mb-2 h-8 w-8 text-slate-300" />
                No messages found.
              </div>
            ) : (
              filteredMessages.map((m) => (
                <button
                  key={m.id}
                  onClick={() => setSelectedId(m.id)}
                  className={`w-full px-4 py-3 text-left transition-colors ${
                    selectedId === m.id
                      ? "bg-blue-50"
                      : "hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-sm font-medium text-slate-900">
                      {m.subject}
                    </span>
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${statusColor(
                        m.status
                      )}`}
                    >
                      {m.status}
                    </span>
                  </div>
                  <div className="mt-1 text-xs text-slate-500">
                    From {m.parentName} → {m.recipient}
                  </div>
                  <div className="mt-0.5 text-xs text-slate-400">
                    {formatDate(m.createdAt)}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6 lg:col-span-2">
          {selectedMessage ? (
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">
                  {selectedMessage.subject}
                </h3>
                <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-slate-500">
                  <span>
                    <strong className="text-slate-700">From:</strong>{" "}
                    {selectedMessage.parentName}
                  </span>
                  <span>
                    <strong className="text-slate-700">To:</strong>{" "}
                    {selectedMessage.recipient}
                  </span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${statusColor(
                      selectedMessage.status
                    )}`}
                  >
                    {selectedMessage.status}
                  </span>
                </div>
                <div className="mt-1 text-xs text-slate-400">
                  {formatDate(selectedMessage.createdAt)}
                </div>
              </div>
              <div className="rounded-lg border border-slate-100 bg-slate-50 p-4 text-sm text-slate-700 whitespace-pre-wrap">
                {selectedMessage.message}
              </div>
            </div>
          ) : (
            <div className="flex h-full min-h-[16rem] flex-col items-center justify-center text-center text-slate-400">
              <Mail className="mb-3 h-10 w-10 text-slate-300" />
              <p className="text-sm">Select a message to view its contents.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
