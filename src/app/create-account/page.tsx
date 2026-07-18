import { CreateAccountForm } from "@/app/create-account/create-account-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function CreateAccountPage() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_10%_20%,rgba(14,159,110,0.3),transparent_40%),radial-gradient(circle_at_90%_0%,rgba(11,31,77,0.55),transparent_45%)]" />
      <div className="relative mx-auto max-w-4xl px-4 py-10">
        <Card className="border-slate-200/20 bg-white/95 backdrop-blur">
          <CardHeader>
            <p className="text-xs uppercase tracking-wide text-slate-500">Sckool Suite Onboarding</p>
            <CardTitle className="text-2xl sm:text-3xl">Create Your School Workspace</CardTitle>
            <CardDescription>Set up your school account and start running admissions, learning, and fees in one place.</CardDescription>
          </CardHeader>
          <CardContent>
            <CreateAccountForm />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
