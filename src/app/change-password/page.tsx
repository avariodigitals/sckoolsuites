import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { ChangePasswordForm } from "@/app/change-password/change-password-form";

export default async function ChangePasswordPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

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
      <div className="relative w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-slate-900">Change Your Password</h1>
          <p className="mt-2 text-sm text-slate-600">
            For security, please set a new password before continuing.
          </p>
        </div>

        <div className="rounded-2xl bg-white/90 p-8 shadow-lg ring-1 ring-slate-900/5 backdrop-blur-sm">
          <ChangePasswordForm />
        </div>
      </div>
    </div>
  );
}
