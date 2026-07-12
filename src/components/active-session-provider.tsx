"use client";

import { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";

interface Session {
  id: string;
  name: string;
  isCurrent: boolean;
  status: string;
}

interface Term {
  id: string;
  name: string;
  sessionId: string;
  isCurrent: boolean;
  status: string;
}

interface ActiveSessionContextValue {
  activeSession: Session | null;
  activeTerm: Term | null;
  sessions: Session[];
  terms: Term[];
  loading: boolean;
  setActiveSession: (sessionId: string) => Promise<void>;
  setActiveTerm: (termId: string) => Promise<void>;
}

const ActiveSessionContext = createContext<ActiveSessionContextValue | null>(null);

export function useActiveSession() {
  const ctx = useContext(ActiveSessionContext);
  if (!ctx) {
    throw new Error("useActiveSession must be used within ActiveSessionProvider");
  }
  return ctx;
}

export function ActiveSessionProvider({ children }: { children: React.ReactNode }) {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [terms, setTerms] = useState<Term[]>([]);
  const [activeSession, setActiveSessionState] = useState<Session | null>(null);
  const [activeTerm, setActiveTermState] = useState<Term | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch academic setup (all sessions + terms) and user context
  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const [setupRes, contextRes] = await Promise.all([
          fetch("/api/admin/academic/sessions", { cache: "no-store" }),
          fetch("/api/context/session-term", { cache: "no-store" }),
        ]);

        if (cancelled) return;

        let allSessions: Session[] = [];
        let allTerms: Term[] = [];
        let currentSession: Session | null = null;
        let currentTerm: Term | null = null;

        if (setupRes.ok) {
          const setup = await setupRes.json();
          allSessions = (setup.sessions ?? []).map((s: any) => ({
            id: String(s.id),
            name: s.name,
            isCurrent: s.isCurrent ?? false,
            status: s.status ?? "DRAFT",
          }));
          allTerms = (setup.terms ?? []).map((t: any) => ({
            id: String(t.id),
            name: t.name,
            sessionId: String(t.sessionId ?? t.session?.id),
            isCurrent: t.isCurrent ?? false,
            status: t.status ?? "DRAFT",
          }));
        }

        if (contextRes.ok) {
          const context = await contextRes.json();
          if (context.session) {
            currentSession = {
              id: String(context.session.id),
              name: context.session.name,
              isCurrent: context.session.isCurrent ?? false,
              status: context.session.status ?? "DRAFT",
            };
          }
          if (context.term) {
            currentTerm = {
              id: String(context.term.id),
              name: context.term.name,
              sessionId: String(context.term.sessionId ?? context.term.session?.id),
              isCurrent: context.term.isCurrent ?? false,
              status: context.term.status ?? "DRAFT",
            };
          }
        }

        if (!currentSession && allSessions.length > 0) {
          currentSession = allSessions.find((s) => s.isCurrent) ?? allSessions[0];
        }
        if (!currentTerm && allTerms.length > 0 && currentSession) {
          currentTerm =
            allTerms.find((t) => t.isCurrent && t.sessionId === currentSession!.id) ??
            allTerms.find((t) => t.sessionId === currentSession!.id) ??
            allTerms[0];
        }

        if (!cancelled) {
          setSessions(allSessions);
          setTerms(allTerms);
          setActiveSessionState(currentSession);
          setActiveTermState(currentTerm);
        }
      } catch {
        // silently fail
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => { cancelled = true; };
  }, []);

  const setActiveSession = useCallback(async (sessionId: string) => {
    const session = sessions.find((s) => s.id === sessionId) ?? null;
    const sessionTerms = terms.filter((t) => t.sessionId === sessionId);
    const term = sessionTerms.find((t) => t.isCurrent) ?? sessionTerms[0] ?? null;

    setActiveSessionState(session);
    setActiveTermState(term);

    try {
      await fetch("/api/context/session-term", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, termId: term?.id }),
      });
      window.location.reload();
    } catch {
      // silently fail
    }
  }, [sessions, terms]);

  const setActiveTerm = useCallback(async (termId: string) => {
    const term = terms.find((t) => t.id === termId) ?? null;
    setActiveTermState(term);

    try {
      await fetch("/api/context/session-term", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: activeSession?.id, termId }),
      });
      window.location.reload();
    } catch {
      // silently fail
    }
  }, [terms, activeSession]);

  const value = useMemo(
    () => ({
      activeSession,
      activeTerm,
      sessions,
      terms,
      loading,
      setActiveSession,
      setActiveTerm,
    }),
    [activeSession, activeTerm, sessions, terms, loading, setActiveSession, setActiveTerm]
  );

  return (
    <ActiveSessionContext.Provider value={value}>
      {children}
    </ActiveSessionContext.Provider>
  );
}
