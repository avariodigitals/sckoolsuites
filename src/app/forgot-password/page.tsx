import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { roleDefaultRoute } from "@/lib/constants";
import { ForgotPasswordForm } from "./forgot-password-form";

export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ request?: string }>;
}) {
  const session = await auth();
  if (session?.user?.role) {
    redirect(roleDefaultRoute[session.user.role] ?? "/");
  }

  const { request } = await searchParams;

  return (
    <div
      className="relative flex min-h-screen items-center justify-center px-4 py-12 sm:px-6 lg:px-8"
      style={{
        backgroundColor: "#f0f4f8",
        backgroundImage:
          "radial-gradient(circle at 1px 1px, rgba(99,102,241,0.12) 1px, transparent 0)",
        backgroundSize: "24px 24px",
      }}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          background:
            "linear-gradient(135deg, rgba(199,210,254,0.15) 0%, rgba(241,245,249,0.05) 50%, rgba(209,250,229,0.12) 100%)",
        }}
      />
      <div className="relative w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-slate-800">Forgot Password</h1>
          <p className="mt-2 text-sm text-slate-600">
            Reset your password using email verification
          </p>
        </div>

        <div className="rounded-2xl bg-white/90 p-8 shadow-lg ring-1 ring-slate-900/5 backdrop-blur-sm">
          <ForgotPasswordForm initialRequestId={request} />
        </div>

        <div className="text-center">
          <a
            href="/login"
            className="text-sm text-indigo-600 hover:text-indigo-700 hover:underline"
          >
            Back to login
          </a>
        </div>
      </div>
    </div>
  );
}
