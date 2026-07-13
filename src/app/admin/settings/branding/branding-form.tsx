"use client";

import { useState } from "react";
import Image from "next/image";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const schema = z.object({
  schoolName: z.string().min(2),
  address: z.string().min(3),
  email: z.string().email(),
  phone: z.string().min(7),
  website: z.string().optional(),
  motto: z.string().optional(),
  logoUrl: z.string().optional(),
  primaryColor: z.string().min(4),
  secondaryColor: z.string().min(4),
  reportCardTheme: z.string().optional(),
  invoiceTheme: z.string().optional(),
  receiptTheme: z.string().optional(),
  bankName: z.string().optional(),
  bankAccountName: z.string().optional(),
  bankAccountNumber: z.string().optional(),
  bankInstructions: z.string().optional(),
  principalSignature: z.string().optional(),
  teacherSignature: z.string().optional(),
  schoolStamp: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

export function BrandingForm({ defaults }: { defaults: FormValues }) {
  const [message, setMessage] = useState("");
  const [uploadingField, setUploadingField] = useState<string | null>(null);

  const { register, handleSubmit, formState, setValue, control } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: defaults,
  });

  const logoUrl = useWatch({ control, name: "logoUrl" });
  const principalSignature = useWatch({ control, name: "principalSignature" });
  const teacherSignature = useWatch({ control, name: "teacherSignature" });
  const schoolStamp = useWatch({ control, name: "schoolStamp" });

  const uploadImageFor = async (field: keyof Pick<FormValues, "logoUrl" | "principalSignature" | "teacherSignature" | "schoolStamp">, file: File) => {
    setUploadingField(field);
    setMessage(`Uploading ${field}...`);

    const formData = new FormData();
    formData.set("file", file);
    formData.set("folder", field === "logoUrl" ? "logos" : "signatures");

    const response = await fetch("/api/admin/uploads", {
      method: "POST",
      body: formData,
    });

    const payload = await response.json().catch(() => ({}));

    if (!response.ok || !payload?.url) {
      setMessage(payload?.error ?? "Upload failed.");
      setUploadingField(null);
      return;
    }

    setValue(field, payload.url, { shouldDirty: true, shouldValidate: true });
    setMessage("Upload complete.");
    setUploadingField(null);
  };

  const onFileChange = (field: keyof Pick<FormValues, "logoUrl" | "principalSignature" | "teacherSignature" | "schoolStamp">) => async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    await uploadImageFor(field, file);
  };

  const onSubmit = async (values: FormValues) => {
    setMessage("Saving...");
    const response = await fetch("/api/admin/branding", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    setMessage(response.ok ? "Saved successfully." : "Could not save settings.");
  };

  return (
    <form className="grid grid-cols-1 gap-4 md:grid-cols-2" onSubmit={handleSubmit(onSubmit)}>
      <div>
        <label className="mb-1 block text-sm font-medium">School Name</label>
        <Input {...register("schoolName")} />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium">Email</label>
        <Input {...register("email")} />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium">Phone</label>
        <Input {...register("phone")} />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium">Website</label>
        <Input {...register("website")} />
      </div>
      <div className="md:col-span-2">
        <label className="mb-1 block text-sm font-medium">Address</label>
        <Input {...register("address")} />
      </div>
      <div className="md:col-span-2">
        <label className="mb-1 block text-sm font-medium">Motto</label>
        <Input {...register("motto")} />
      </div>
      <div className="md:col-span-2">
        <label className="mb-1 block text-sm font-medium">School Logo</label>
        <div className="grid gap-2 md:grid-cols-[1fr_auto]">
          <Input {...register("logoUrl")} placeholder="Uploaded logo URL" />
          <Input type="file" accept="image/png,image/jpeg,image/webp" onChange={onFileChange("logoUrl")} disabled={uploadingField === "logoUrl"} className="max-w-[280px]" />
        </div>
        {logoUrl ? <Image src={logoUrl} alt="School logo preview" width={56} height={56} unoptimized className="mt-2 h-14 w-14 rounded border border-slate-200 bg-white p-1 object-contain" /> : null}
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium">Primary Color</label>
        <div className="flex items-center gap-2">
          <input
            type="color"
            {...register("primaryColor")}
            className="h-10 w-10 cursor-pointer rounded border border-slate-200 bg-white p-1"
          />
          <Input {...register("primaryColor")} className="flex-1 font-mono text-sm" />
        </div>
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium">Secondary Color</label>
        <div className="flex items-center gap-2">
          <input
            type="color"
            {...register("secondaryColor")}
            className="h-10 w-10 cursor-pointer rounded border border-slate-200 bg-white p-1"
          />
          <Input {...register("secondaryColor")} className="flex-1 font-mono text-sm" />
        </div>
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium">Principal Signature</label>
        <Input {...register("principalSignature")} placeholder="Uploaded signature URL" />
        <Input type="file" accept="image/png,image/jpeg,image/webp" onChange={onFileChange("principalSignature")} disabled={uploadingField === "principalSignature"} className="mt-2" />
        {principalSignature ? <Image src={principalSignature} alt="Principal signature preview" width={140} height={56} unoptimized className="mt-2 h-14 w-auto rounded border border-slate-200 bg-white p-1 object-contain" /> : null}
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium">Teacher Signature</label>
        <Input {...register("teacherSignature")} placeholder="Uploaded signature URL" />
        <Input type="file" accept="image/png,image/jpeg,image/webp" onChange={onFileChange("teacherSignature")} disabled={uploadingField === "teacherSignature"} className="mt-2" />
        {teacherSignature ? <Image src={teacherSignature} alt="Teacher signature preview" width={140} height={56} unoptimized className="mt-2 h-14 w-auto rounded border border-slate-200 bg-white p-1 object-contain" /> : null}
      </div>
      <div className="md:col-span-2">
        <label className="mb-1 block text-sm font-medium">School Stamp</label>
        <div className="grid gap-2 md:grid-cols-[1fr_auto]">
          <Input {...register("schoolStamp")} placeholder="Uploaded stamp URL" />
          <Input type="file" accept="image/png,image/jpeg,image/webp" onChange={onFileChange("schoolStamp")} disabled={uploadingField === "schoolStamp"} className="max-w-[280px]" />
        </div>
        {schoolStamp ? <Image src={schoolStamp} alt="School stamp preview" width={64} height={64} unoptimized className="mt-2 h-16 w-16 rounded border border-slate-200 bg-white p-1 object-contain" /> : null}
      </div>
      <div className="md:col-span-2">
        <Button type="submit" disabled={formState.isSubmitting}>
          {formState.isSubmitting ? "Saving..." : "Save School Branding"}
        </Button>
        <p className="mt-2 text-sm text-slate-600">{message}</p>
      </div>
    </form>
  );
}
