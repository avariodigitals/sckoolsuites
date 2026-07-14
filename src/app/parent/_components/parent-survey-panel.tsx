"use client";

import { useState, useEffect, useCallback } from "react";
import { Send, CheckCircle2, Star } from "lucide-react";

type SurveyQuestion = {
  id: number;
  text: string;
  type: "text" | "rating" | "choice";
  options: string[] | null;
  order: number;
  required: boolean;
};

type Survey = {
  id: number;
  title: string;
  description: string | null;
  status: string;
  questionCount: number;
  responseCount: number;
  hasResponded: boolean;
  createdAt: string;
  questions?: SurveyQuestion[];
};

export function ParentSurveyPanel() {
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSurvey, setActiveSurvey] = useState<Survey | null>(null);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState("");

  const fetchSurveys = useCallback(async () => {
    try {
      const res = await fetch("/api/surveys", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setSurveys((data.surveys || []).filter((s: Survey) => s.status === "PUBLISHED"));
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch("/api/surveys", { cache: "no-store" });
        if (res.ok) {
          const data = await res.json();
          if (active) setSurveys((data.surveys || []).filter((s: Survey) => s.status === "PUBLISHED"));
        }
      } catch {
        // silently fail
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, []);

  const openSurvey = (survey: Survey) => {
    setActiveSurvey(survey);
    setAnswers({});
    setMsg("");
  };

  const submitSurvey = async () => {
    if (!activeSurvey?.questions) return;
    const missing = activeSurvey.questions.filter((q) => q.required && !answers[q.id]?.trim());
    if (missing.length) {
      setMsg(`Please answer all required questions (${missing.length} remaining).`);
      return;
    }

    setSubmitting(true);
    setMsg("");
    try {
      const res = await fetch(`/api/surveys/${activeSurvey.id}/respond`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers }),
      });
      if (res.ok) {
        setMsg("Survey submitted. Thank you for your feedback!");
        setActiveSurvey(null);
        fetchSurveys();
      } else {
        const data = await res.json().catch(() => ({}));
        setMsg(data?.error ?? "Failed to submit survey.");
      }
    } catch {
      setMsg("An error occurred.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <p className="text-sm text-slate-500">Loading surveys...</p>;
  }

  if (activeSurvey) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-slate-900">{activeSurvey.title}</h3>
            {activeSurvey.description && <p className="text-sm text-slate-600 mt-0.5">{activeSurvey.description}</p>}
          </div>
          <button onClick={() => setActiveSurvey(null)} className="text-sm text-slate-500 hover:text-slate-700">Cancel</button>
        </div>

        {msg && (
          <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{msg}</div>
        )}

        <div className="space-y-4">
          {activeSurvey.questions?.map((q, qi) => (
            <div key={q.id} className="rounded-lg border border-slate-200 bg-white p-4">
              <label className="block text-sm font-medium text-slate-900">
                {qi + 1}. {q.text}
                {q.required && <span className="text-rose-500"> *</span>}
              </label>
              <div className="mt-2">
                {q.type === "text" && (
                  <textarea
                    value={answers[q.id] ?? ""}
                    onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })}
                    rows={3}
                    placeholder="Type your answer..."
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  />
                )}
                {q.type === "rating" && (
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button
                        key={n}
                        onClick={() => setAnswers({ ...answers, [q.id]: String(n) })}
                        className={`p-1 ${Number(answers[q.id]) >= n ? "text-amber-400" : "text-slate-300"} hover:text-amber-400`}
                      >
                        <Star className={`h-6 w-6 ${Number(answers[q.id]) >= n ? "fill-current" : ""}`} />
                      </button>
                    ))}
                  </div>
                )}
                {q.type === "choice" && q.options && (
                  <div className="space-y-1.5">
                    {q.options.map((opt, oi) => (
                      <label key={oi} className="flex items-center gap-2 text-sm text-slate-700">
                        <input
                          type="radio"
                          name={`q-${q.id}`}
                          value={opt}
                          checked={answers[q.id] === opt}
                          onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })}
                          className="rounded-full"
                        />
                        {opt}
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={submitSurvey}
          disabled={submitting}
          className="inline-flex items-center gap-2 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          <Send className="h-4 w-4" />
          {submitting ? "Submitting..." : "Submit Survey"}
        </button>
      </div>
    );
  }

  const available = surveys.filter((s) => !s.hasResponded);
  const completed = surveys.filter((s) => s.hasResponded);

  if (surveys.length === 0) {
    return <p className="text-sm text-slate-500">No active surveys at this time.</p>;
  }

  return (
    <div className="space-y-4">
      {available.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Available Surveys</p>
          {available.map((s) => (
            <div key={s.id} className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-900">{s.title}</p>
                  {s.description && <p className="text-sm text-slate-600 mt-0.5">{s.description}</p>}
                  <p className="mt-1 text-xs text-slate-400">{s.questionCount} questions</p>
                </div>
                <button
                  onClick={() => openSurvey(s)}
                  className="shrink-0 rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700"
                >
                  Start
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {completed.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Completed</p>
          {completed.map((s) => (
            <div key={s.id} className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-4">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                <p className="font-medium text-slate-900">{s.title}</p>
              </div>
              <p className="mt-1 text-xs text-slate-400">Thank you for your response.</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
