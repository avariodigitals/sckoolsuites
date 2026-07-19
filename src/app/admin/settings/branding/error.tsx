"use client";

import { useEffect } from "react";

export default function BrandingError({ error }: { error: Error & { digest?: string } }) {
  useEffect(() => {
    console.error("[branding/error.tsx]", error);
  }, [error]);

  return (
    <div className="flex min-h-[50vh] items-center justify-center p-8">
      <div className="max-w-md text-center">
        <h2 className="text-lg font-semibold text-slate-900">Branding Settings Unavailable</h2>
        <p className="mt-2 text-sm text-slate-600">
          Something went wrong loading the branding page.
        </p>
        {error?.message && (
          <p className="mt-2 rounded bg-slate-100 px-3 py-2 text-xs text-slate-700">
            {error.message}
          </p>
        )}
        <button
          onClick={() => window.location.reload()}
          className="mt-4 rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
        >
          Refresh Page
        </button>
      </div>
    </div>
  );
}
