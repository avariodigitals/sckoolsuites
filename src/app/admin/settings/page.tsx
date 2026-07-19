import { SetupRequiredScreen } from "@/components/setup-required-screen";
import { DashboardHeader } from "@/components/modern-dashboard";
import { requireRole } from "@/lib/auth-guards";
import { getCurrentSchoolByUser } from "@/lib/data";
import { BrandingForm } from "./branding/branding-form";
import { EmailSettingsForm } from "./email/email-settings-form";
import { EmailProviderForm } from "./email-provider-form";
import { ImportWizard } from "../[section]/import-wizard";

export default async function SettingsPage() {
  const user = await requireRole(["SUPER_ADMIN", "SCHOOL_ADMIN", "HEAD_OF_SCHOOL", "PRINCIPAL"]);
  const profile = await getCurrentSchoolByUser(user.id);

  if (!profile?.school) {
    return (
      <SetupRequiredScreen
        title="School Profile Missing"
        message="Your admin account does not have a school profile yet. Please complete school setup first."
        actionHref="/admin/settings/school"
        actionLabel="Create School"
      />
    );
  }

  const canBulkImport = ["SUPER_ADMIN", "SCHOOL_ADMIN"].includes(user.role);

  return (
    <div className="space-y-6">
      <DashboardHeader
        title="Branding & School Settings"
        subtitle="Customize school branding, colors, logos, and document templates."
      />

      {canBulkImport && (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-6 py-4">
            <h2 className="text-lg font-semibold text-slate-900">Bulk Import</h2>
            <p className="text-sm text-slate-500">Import students, parents, and staff in bulk from Excel files</p>
          </div>
          <div className="p-6">
            <ImportWizard section="students" />
          </div>
        </div>
      )}

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-slate-900">School Branding</h2>
          <p className="text-sm text-slate-500">Manage your school&apos;s visual identity and document templates</p>
        </div>
        <div className="p-6">
          <BrandingForm
            defaults={{
              schoolName: profile.school.name,
              address: profile.school.address,
              email: profile.school.email,
              phone: profile.school.phone,
              website: profile.school.website ?? "",
              motto: profile.school.motto ?? "",
              logoUrl: profile.school.branding?.logoUrl ?? "",
              primaryColor: profile.school.branding?.primaryColor ?? "#0B1F4D",
              secondaryColor: profile.school.branding?.secondaryColor ?? "#0E9F6E",
              reportCardTheme: profile.school.branding?.reportCardTheme ?? "classic",
              invoiceTheme: profile.school.branding?.invoiceTheme ?? "clean",
              receiptTheme: profile.school.branding?.receiptTheme ?? "simple",
              bankName: profile.school.branding?.bankName ?? "",
              bankAccountName: profile.school.branding?.bankAccountName ?? "",
              bankAccountNumber: profile.school.branding?.bankAccountNumber ?? "",
              bankInstructions: profile.school.branding?.bankInstructions ?? "",
              principalSignature: profile.school.branding?.principalSignature ?? "",
              teacherSignature: profile.school.branding?.teacherSignature ?? "",
              schoolStamp: profile.school.branding?.schoolStamp ?? "",
            }}
          />
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-slate-900">Student Email Provider</h2>
          <p className="text-sm text-slate-500">
            Configure automatic student email creation on your school&apos;s domain (cPanel, Google Workspace, Microsoft 365, Zoho Mail)
          </p>
        </div>
        <div className="p-6">
          <EmailProviderForm />
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-slate-900">Email & Notifications</h2>
          <p className="text-sm text-slate-500">Configure SMTP, templates, and view email delivery logs</p>
        </div>
        <div className="p-6">
          <EmailSettingsForm />
        </div>
      </div>
    </div>
  );
}
