"use client";

export default function BrandingError() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center p-8">
      <div className="max-w-md text-center">
        <h2 className="text-lg font-semibold text-slate-900">Branding Settings Unavailable</h2>
        <p className="mt-2 text-sm text-slate-600">
          Something went wrong loading the branding page. This may be a temporary database issue.
          Please refresh the page or try again later.
        </p>
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
