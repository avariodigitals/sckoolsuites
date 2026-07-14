"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Trash2, Send, Eye, EyeOff, X } from "lucide-react";

type SurveyQuestion = {
  id?: number;
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

export function SurveyManager() {
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [questions, setQuestions] = useState<SurveyQuestion[]>([{ text: "", type: "text", options: null, order: 0, required: true }]);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  const fetchSurveys = useCallback(async () => {
    try {
      const res = await fetch("/api/surveys", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setSurveys(data.surveys || []);
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
          if (active) setSurveys(data.surveys || []);
        }
      } catch {
        // silently fail
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, []);

  const addQuestion = () => {
    setQuestions([...questions, { text: "", type: "text", options: null, order: questions.length, required: true }]);
  };

  const removeQuestion = (i: number) => {
    setQuestions(questions.filter((_, idx) => idx !== i).map((q, idx) => ({ ...q, order: idx })));
  };

  const updateQuestion = (i: number, field: keyof SurveyQuestion, value: any) => {
    setQuestions(questions.map((q, idx) => {
      if (idx !== i) return q;
      const updated = { ...q, [field]: value };
      if (field === "type" && value === "choice" && !q.options) {
        updated.options = [""];
      }
      if (field === "type" && value !== "choice") {
        updated.options = null;
      }
      return updated;
    }));
  };

  const updateOption = (qi: number, oi: number, value: string) => {
    setQuestions(questions.map((q, idx) => {
      if (idx !== qi || !q.options) return q;
      return { ...q, options: q.options.map((opt, i) => i === oi ? value : opt) };
    }));
  };

  const addOption = (qi: number) => {
    setQuestions(questions.map((q, idx) => {
      if (idx !== qi || !q.options) return q;
      return { ...q, options: [...q.options, ""] };
    }));
  };

  const removeOption = (qi: number, oi: number) => {
    setQuestions(questions.map((q, idx) => {
      if (idx !== qi || !q.options) return q;
      return { ...q, options: q.options.filter((_, i) => i !== oi) };
    }));
  };

  const createSurvey = async () => {
    if (!title.trim()) { setMsg("Title is required"); return; }
    if (questions.some((q) => !q.text.trim())) { setMsg("All questions must have text"); return; }

    setSaving(true);
    setMsg("");
    try {
      const res = await fetch("/api/surveys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          status: "PUBLISHED",
          questions: questions.map((q) => ({
            text: q.text,
            type: q.type,
            options: q.type === "choice" ? q.options?.filter(Boolean) : null,
            required: q.required,
          })),
        }),
      });
      if (res.ok) {
        setMsg("Survey created and published.");
        setTitle("");
        setDescription("");
        setQuestions([{ text: "", type: "text", options: null, order: 0, required: true }]);
        setShowForm(false);
        fetchSurveys();
      } else {
        const data = await res.json().catch(() => ({}));
        setMsg(data?.error ?? "Failed to create survey");
      }
    } catch {
      setMsg("An error occurred.");
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (survey: Survey) => {
    const newStatus = survey.status === "PUBLISHED" ? "CLOSED" : "PUBLISHED";
    try {
      await fetch(`/api/surveys/${survey.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      fetchSurveys();
    } catch {
      // silently fail
    }
  };

  const deleteSurvey = async (surveyId: number) => {
    if (!confirm("Delete this survey and all responses?")) return;
    try {
      await fetch(`/api/surveys/${surveyId}`, { method: "DELETE" });
      fetchSurveys();
    } catch {
      // silently fail
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-900">Surveys</h3>
        <button
          onClick={() => setShowForm(!showForm)}
          className="inline-flex items-center gap-2 rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          <Plus className="h-4 w-4" />
          New Survey
        </button>
      </div>

      {msg && (
        <div className={`rounded-lg border px-3 py-2 text-sm ${msg.includes("created") ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-rose-200 bg-rose-50 text-rose-700"}`}>
          {msg}
        </div>
      )}

      {showForm && (
        <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-slate-900">Create Survey</h4>
            <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600"><X className="h-4 w-4" /></button>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">Title</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Parent Satisfaction Survey" className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">Description (optional)</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} placeholder="Brief description of the survey purpose" className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm" />
          </div>

          <div className="space-y-3">
            <label className="block text-xs font-medium text-slate-500">Questions</label>
            {questions.map((q, qi) => (
              <div key={qi} className="rounded-lg border border-slate-200 bg-white p-3 space-y-2">
                <div className="flex items-start gap-2">
                  <input value={q.text} onChange={(e) => updateQuestion(qi, "text", e.target.value)} placeholder={`Question ${qi + 1}`} className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm" />
                  <button onClick={() => removeQuestion(qi)} className="mt-1 text-rose-500 hover:text-rose-700"><Trash2 className="h-4 w-4" /></button>
                </div>
                <div className="flex items-center gap-3">
                  <select value={q.type} onChange={(e) => updateQuestion(qi, "type", e.target.value)} className="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs">
                    <option value="text">Text Answer</option>
                    <option value="rating">Rating (1-5)</option>
                    <option value="choice">Multiple Choice</option>
                  </select>
                  <label className="flex items-center gap-1 text-xs text-slate-600">
                    <input type="checkbox" checked={q.required} onChange={(e) => updateQuestion(qi, "required", e.target.checked)} className="rounded" />
                    Required
                  </label>
                </div>
                {q.type === "choice" && q.options && (
                  <div className="space-y-1.5 pl-2">
                    {q.options.map((opt, oi) => (
                      <div key={oi} className="flex items-center gap-2">
                        <input value={opt} onChange={(e) => updateOption(qi, oi, e.target.value)} placeholder={`Option ${oi + 1}`} className="flex-1 rounded-md border border-slate-200 px-2 py-1 text-xs" />
                        <button onClick={() => removeOption(qi, oi)} className="text-rose-400 hover:text-rose-600"><X className="h-3 w-3" /></button>
                      </div>
                    ))}
                    <button onClick={() => addOption(qi)} className="text-xs text-indigo-600 hover:text-indigo-700">+ Add option</button>
                  </div>
                )}
              </div>
            ))}
            <button onClick={addQuestion} className="text-sm text-indigo-600 hover:text-indigo-700">+ Add question</button>
          </div>

          <button onClick={createSurvey} disabled={saving} className="inline-flex items-center gap-2 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50">
            <Send className="h-4 w-4" />
            {saving ? "Publishing..." : "Publish Survey"}
          </button>
        </div>
      )}

      {loading ? (
        <p className="text-sm text-slate-500">Loading surveys...</p>
      ) : surveys.length === 0 ? (
        <p className="text-sm text-slate-500">No surveys yet. Create one to gather feedback from parents.</p>
      ) : (
        <div className="space-y-2">
          {surveys.map((s) => (
            <div key={s.id} className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-900">{s.title}</p>
                  {s.description && <p className="text-sm text-slate-600 mt-0.5">{s.description}</p>}
                  <div className="mt-1 flex items-center gap-3 text-xs text-slate-400">
                    <span>{s.questionCount} questions</span>
                    <span>{s.responseCount} responses</span>
                    <span className={`rounded px-1.5 py-0.5 font-medium ${s.status === "PUBLISHED" ? "bg-emerald-100 text-emerald-700" : s.status === "CLOSED" ? "bg-slate-100 text-slate-600" : "bg-amber-100 text-amber-700"}`}>{s.status}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <button onClick={() => toggleStatus(s)} title={s.status === "PUBLISHED" ? "Close survey" : "Reopen survey"} className="rounded-md border border-slate-200 bg-white p-1.5 text-slate-600 hover:bg-slate-50">
                    {s.status === "PUBLISHED" ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                  <button onClick={() => deleteSurvey(s.id)} title="Delete survey" className="rounded-md border border-rose-200 bg-rose-50 p-1.5 text-rose-600 hover:bg-rose-100">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
