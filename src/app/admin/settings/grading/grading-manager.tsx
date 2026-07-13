"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Award, Plus, Trash2, Save, AlertCircle, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";

type GradeBand = { id: string; min: string; grade: string; gpa: string };
type GradingConfig = {
  caWeight: string;
  examWeight: string;
  passMark: string;
  gradeBands: GradeBand[];
};

export function GradingManager() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [config, setConfig] = useState<GradingConfig>({
    caWeight: "40",
    examWeight: "60",
    passMark: "50",
    gradeBands: [
      { id: "1", min: "70", grade: "A", gpa: "5" },
      { id: "2", min: "60", grade: "B", gpa: "4" },
      { id: "3", min: "50", grade: "C", gpa: "3" },
      { id: "4", min: "45", grade: "D", gpa: "2" },
      { id: "5", min: "0", grade: "F", gpa: "0" },
    ],
  });

  useEffect(() => {
    async function loadConfig() {
      try {
        const res = await fetch("/api/admin/settings/grading");
        if (res.ok) {
          const data = await res.json();
          if (data.config) {
            setConfig(prev => ({
              ...prev,
              ...data.config,
              gradeBands: data.config.gradeBands?.length ? data.config.gradeBands : prev.gradeBands,
            }));
          }
        }
      } catch (error) {
        console.error("Failed to load grading config:", error);
      } finally {
        setLoading(false);
      }
    }
    loadConfig();
  }, []);

  function updateBand(id: string, field: keyof GradeBand, value: string) {
    setConfig(prev => ({
      ...prev,
      gradeBands: prev.gradeBands.map(b => b.id === id ? { ...b, [field]: value } : b),
    }));
  }

  function addBand() {
    const newId = String(Date.now());
    setConfig(prev => ({
      ...prev,
      gradeBands: [...prev.gradeBands, { id: newId, min: "", grade: "", gpa: "" }],
    }));
  }

  function removeBand(id: string) {
    setConfig(prev => ({
      ...prev,
      gradeBands: prev.gradeBands.filter(b => b.id !== id),
    }));
  }

  async function saveConfig() {
    setSaving(true);
    setMessage("");
    try {
      const res = await fetch("/api/admin/settings/grading", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ config }),
      });
      if (res.ok) {
        setMessage("Grading configuration saved successfully!");
      } else {
        const error = await res.json();
        setMessage(error.error || "Failed to save");
      }
    } catch {
      setMessage("An error occurred");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="text-slate-500">Loading...</div></div>;
  }

  return (
    <div className="space-y-6">
      {message && (
        <div className={cn(
          "rounded-lg border px-4 py-3 text-sm flex items-center gap-2",
          message.includes("success") 
            ? "border-emerald-200 bg-emerald-50 text-emerald-700" 
            : "border-rose-200 bg-rose-50 text-rose-700"
        )}>
          {message.includes("success") ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
          {message}
        </div>
      )}

      <div className="rounded-xl bg-white p-6 border border-slate-200 space-y-6">
        {/* Assessment Structure */}
        <div>
          <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <Award className="h-5 w-5 text-indigo-600" />
            Assessment Structure
          </h3>
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">CA Weight (%)</label>
              <Input 
                type="number"
                min="0"
                max="100"
                value={config.caWeight} 
                onChange={(e) => setConfig(prev => ({ ...prev, caWeight: e.target.value }))}
              />
              <p className="text-xs text-slate-500 mt-1">Continuous Assessment percentage</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Exam Weight (%)</label>
              <Input 
                type="number"
                min="0"
                max="100"
                value={config.examWeight} 
                onChange={(e) => setConfig(prev => ({ ...prev, examWeight: e.target.value }))}
              />
              <p className="text-xs text-slate-500 mt-1">Examination percentage</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Pass Mark (%)</label>
              <Input 
                type="number"
                min="0"
                max="100"
                value={config.passMark} 
                onChange={(e) => setConfig(prev => ({ ...prev, passMark: e.target.value }))}
              />
              <p className="text-xs text-slate-500 mt-1">Minimum score to pass</p>
            </div>
          </div>
        </div>

        {/* Grade Bands */}
        <div className="pt-6 border-t border-slate-100">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-semibold text-slate-900">Grade Bands</h4>
            <Button type="button" variant="outline" size="sm" onClick={addBand}>
              <Plus className="h-4 w-4 mr-1" />
              Add Grade
            </Button>
          </div>
          
          <div className="space-y-2">
            {config.gradeBands.map((band) => (
              <div key={band.id} className="grid gap-2 md:grid-cols-4 items-center p-3 rounded-lg border border-slate-200 bg-slate-50">
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Min Score (%)</label>
                  <Input 
                    type="number"
                    min="0"
                    max="100"
                    value={band.min} 
                    onChange={(e) => updateBand(band.id, "min", e.target.value)}
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Grade</label>
                  <Input 
                    value={band.grade} 
                    onChange={(e) => updateBand(band.id, "grade", e.target.value)}
                    placeholder="A"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">GPA Points</label>
                  <Input 
                    type="number"
                    min="0"
                    max="5"
                    step="0.1"
                    value={band.gpa} 
                    onChange={(e) => updateBand(band.id, "gpa", e.target.value)}
                    placeholder="5.0"
                  />
                </div>
                <div className="flex justify-end">
                  <Button 
                    type="button" 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => removeBand(band.id)}
                    disabled={config.gradeBands.length <= 1}
                    className="text-rose-600 hover:text-rose-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end pt-4 border-t border-slate-100">
          <Button onClick={saveConfig} disabled={saving} className="bg-indigo-600 hover:bg-indigo-700">
            <Save className="h-4 w-4 mr-2" />
            {saving ? "Saving..." : "Save Grading Config"}
          </Button>
        </div>
      </div>
    </div>
  );
}
