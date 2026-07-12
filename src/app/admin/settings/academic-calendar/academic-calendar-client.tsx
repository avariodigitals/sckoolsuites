"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { humanizeEnum } from "@/lib/utils";

type SessionDto = {
  id: string;
  name: string;
  isCurrent: boolean;
  status: "DRAFT" | "ACTIVE" | "CLOSED" | "ARCHIVED";
  startDate: string | null;
  endDate: string | null;
};

type TermDto = {
  id: string;
  name: string;
  isCurrent: boolean;
  status: "DRAFT" | "ACTIVE" | "CLOSED" | "ARCHIVED";
  sessionId: string;
  startDate: string | null;
  endDate: string | null;
  resumptionDate: string | null;
};

export function AcademicCalendarClient({
  initialSessions,
  initialTerms,
  initialSessionId,
  initialTermId,
}: {
  initialSessions: SessionDto[];
  initialTerms: TermDto[];
  initialSessionId?: string;
  initialTermId?: string;
}) {
  const [sessions, setSessions] = useState<SessionDto[]>(initialSessions);
  const [terms, setTerms] = useState<TermDto[]>(initialTerms);
  const [selectedSessionId, setSelectedSessionId] = useState(initialSessionId ?? "");
  const [selectedTermId, setSelectedTermId] = useState(initialTermId ?? "");
  const [message, setMessage] = useState("");

  async function loadSetup() {
    const response = await fetch("/api/admin/academic/sessions");
    const data = await response.json();
    const newSessions: SessionDto[] = data.sessions ?? [];
    const newTerms: TermDto[] = data.terms ?? [];
    setSessions(newSessions);
    setTerms(newTerms);

    // Preserve current selections if they still exist; otherwise fall back to isCurrent
    const sessionStillValid = newSessions.some((s: SessionDto) => s.id === selectedSessionId);
    const termStillValid = newTerms.some((t: TermDto) => t.id === selectedTermId);

    if (!sessionStillValid) {
      const activeSession = newSessions.find((item: SessionDto) => item.isCurrent);
      if (activeSession) setSelectedSessionId(activeSession.id);
    }
    if (!termStillValid) {
      const activeTerm = newTerms.find((item: TermDto) => item.isCurrent);
      if (activeTerm) setSelectedTermId(activeTerm.id);
    }
  }

  const visibleTerms = useMemo(
    () => terms.filter((term) => !selectedSessionId || term.sessionId === selectedSessionId),
    [terms, selectedSessionId]
  );

  async function createSession(formData: FormData) {
    const payload = {
      name: String(formData.get("name") ?? ""),
      startDate: String(formData.get("startDate") ?? "") || undefined,
      endDate: String(formData.get("endDate") ?? "") || undefined,
      status: String(formData.get("status") ?? "DRAFT"),
    };

    const response = await fetch("/api/admin/academic/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    setMessage(response.ok ? "Session created." : "Could not create session.");
    await loadSetup();
  }

  async function createTerm(formData: FormData) {
    const payload = {
      sessionId: String(formData.get("sessionId") ?? ""),
      name: String(formData.get("name") ?? "First Term"),
      startDate: String(formData.get("startDate") ?? "") || undefined,
      endDate: String(formData.get("endDate") ?? "") || undefined,
      resumptionDate: String(formData.get("resumptionDate") ?? "") || undefined,
      breakDates: String(formData.get("breakDates") ?? "")
        .split(",")
        .map((d) => d.trim())
        .filter(Boolean),
      status: String(formData.get("status") ?? "DRAFT"),
    };

    const response = await fetch("/api/admin/academic/terms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    setMessage(response.ok ? "Term created." : "Could not create term.");
    await loadSetup();
  }

  async function activateSession(id: string) {
    const response = await fetch(`/api/admin/academic/sessions/${id}/activate`, { method: "POST" });
    setMessage(response.ok ? "Active session updated." : "Could not activate session.");
    await loadSetup();
  }

  async function activateTerm(id: string) {
    const response = await fetch(`/api/admin/academic/terms/${id}/activate`, { method: "POST" });
    setMessage(response.ok ? "Active term updated." : "Could not activate term.");
    await loadSetup();
  }

  async function updateSessionStatus(id: string, status: string) {
    const response = await fetch(`/api/admin/academic/sessions/${id}/status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });

    setMessage(response.ok ? "Session status updated." : "Could not update session status.");
    await loadSetup();
  }

  async function updateTermStatus(id: string, status: string) {
    const response = await fetch(`/api/admin/academic/terms/${id}/status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });

    setMessage(response.ok ? "Term status updated." : "Could not update term status.");
    await loadSetup();
  }

  async function saveUserContext() {
    const response = await fetch("/api/context/session-term", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId: selectedSessionId || undefined, termId: selectedTermId || undefined }),
    });

    if (response.ok) {
      setMessage("Viewing context updated. Reloading…");
      window.location.reload();
    } else {
      setMessage("Could not update viewing context.");
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-600">{message}</p>

      <Card>
        <CardHeader>
          <CardTitle>Academic Context</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-3">
          <select
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
            value={selectedSessionId}
            onChange={(event) => {
              setSelectedSessionId(event.target.value);
              setSelectedTermId("");
            }}
          >
            <option value="">Select session</option>
            {sessions.map((session) => (
              <option key={session.id} value={session.id}>{session.name}</option>
            ))}
          </select>

          <select
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
            value={selectedTermId}
            onChange={(event) => setSelectedTermId(event.target.value)}
          >
            <option value="">Select term</option>
            {visibleTerms.map((term) => (
              <option key={term.id} value={term.id}>{term.name}</option>
            ))}
          </select>

          <Button onClick={saveUserContext}>Save Viewing Context</Button>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Create Session</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="space-y-2" action={createSession}>
              <Input name="name" placeholder="2026/2027" required />
              <div className="grid grid-cols-2 gap-2">
                <Input name="startDate" type="date" />
                <Input name="endDate" type="date" />
              </div>
              <select name="status" className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm">
                <option value="DRAFT">Draft</option>
                <option value="ACTIVE">Active</option>
                <option value="CLOSED">Closed</option>
                <option value="ARCHIVED">Archived</option>
              </select>
              <Button type="submit">Create Session</Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Create Term</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="space-y-2" action={createTerm}>
              <select name="sessionId" className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" required>
                <option value="">Select session</option>
                {sessions.map((session) => (
                  <option key={session.id} value={session.id}>{session.name}</option>
                ))}
              </select>
              <Input name="name" placeholder="Term name (e.g. Harmattan, Spring, Term 1)" required />
              <div className="grid grid-cols-2 gap-2">
                <Input name="startDate" type="date" />
                <Input name="endDate" type="date" />
              </div>
              <Input name="resumptionDate" type="date" />
              <Input name="breakDates" placeholder="2026-02-15, 2026-02-20" />
              <select name="status" className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm">
                <option value="DRAFT">Draft</option>
                <option value="ACTIVE">Active</option>
                <option value="CLOSED">Closed</option>
                <option value="ARCHIVED">Archived</option>
              </select>
              <Button type="submit">Create Term</Button>
            </form>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Sessions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {sessions.map((session) => (
              <div key={session.id} className="flex items-center justify-between rounded-md border border-slate-200 p-3 text-sm">
                <div>
                  <p className="font-medium">{session.name}</p>
                  <div className="mt-1 flex gap-2">
                    <Badge>{humanizeEnum(session.status)}</Badge>
                    {session.isCurrent ? <Badge className="bg-green-50 text-green-700">Active Context</Badge> : null}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <select
                    className="rounded-md border border-slate-300 px-2 py-1 text-xs"
                    defaultValue={session.status}
                    onChange={(event) => updateSessionStatus(session.id, event.target.value)}
                  >
                    <option value="DRAFT">Draft</option>
                    <option value="ACTIVE">Active</option>
                    <option value="CLOSED">Closed</option>
                    <option value="ARCHIVED">Archived</option>
                  </select>
                  <Button variant="outline" size="sm" onClick={() => activateSession(session.id)}>
                    Set Active
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Terms</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {terms.map((term) => {
              const parentSession = sessions.find((s) => s.id === term.sessionId);
              return (
                <div key={term.id} className="flex items-center justify-between rounded-md border border-slate-200 p-3 text-sm">
                  <div>
                    <p className="font-medium">{term.name}</p>
                    <p className="text-[11px] text-slate-500">{parentSession?.name ?? "Unknown session"}</p>
                    <div className="mt-1 flex gap-2">
                      <Badge>{humanizeEnum(term.status)}</Badge>
                      {term.isCurrent ? <Badge className="bg-green-50 text-green-700">Active Context</Badge> : null}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <select
                      className="rounded-md border border-slate-300 px-2 py-1 text-xs"
                      defaultValue={term.status}
                      onChange={(event) => updateTermStatus(term.id, event.target.value)}
                    >
                      <option value="DRAFT">Draft</option>
                      <option value="ACTIVE">Active</option>
                      <option value="CLOSED">Closed</option>
                      <option value="ARCHIVED">Archived</option>
                    </select>
                    <Button variant="outline" size="sm" onClick={() => activateTerm(term.id)}>
                      Set Active
                    </Button>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
