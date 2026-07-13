"use client";

import { useState } from "react";
import { AlertCircle, RefreshCw } from "lucide-react";

interface DatabaseNotReadyProps {
  error?: string;
}

export function DatabaseNotReady({ error }: DatabaseNotReadyProps) {
  const [retrying, setRetrying] = useState(false);

  const handleRetry = () => {
    setRetrying(true);
    window.location.reload();
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-100">
            <AlertCircle className="h-8 w-8 text-amber-600" />
          </div>
          <h1 className="mt-6 text-2xl font-bold tracking-tight text-slate-900">
            Database Not Ready
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            The system is initializing the database. This usually takes a few seconds on first launch.
          </p>
        </div>

        <div className="rounded-2xl bg-white p-6 shadow-lg ring-1 ring-slate-900/5">
          {error && (
            <pre className="mb-4 max-h-32 overflow-auto rounded-lg bg-slate-50 p-3 text-xs text-slate-600">
              {error}
            </pre>
          )}
          <button
            onClick={handleRetry}
            disabled={retrying}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${retrying ? "animate-spin" : ""}`} />
            {retrying ? "Retrying..." : "Retry"}
          </button>
        </div>

        <p className="text-center text-xs text-slate-500">
          If this persists, ensure your <code className="rounded bg-slate-100 px-1">DATABASE_URL</code> is correctly configured.
        </p>
      </div>
    </div>
  );
}
