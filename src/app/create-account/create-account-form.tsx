"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { createAccountAction } from "@/app/create-account/actions";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const schema = z.object({
  schoolName: z.string().min(2),
  schoolEmail: z.string().email(),
  schoolPhone: z.string().min(7),
  schoolAddress: z.string().min(4),
  adminName: z.string().min(2),
  adminEmail: z.string().email(),
  adminPassword: z.string().min(8),
});

type FormValues = z.infer<typeof schema>;

export function CreateAccountForm() {
  const [status, setStatus] = useState<string>("");
  const [pending, startTransition] = useTransition();
  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = (values: FormValues) => {
    setStatus("Creating your school workspace...");
    startTransition(async () => {
      const response = await createAccountAction(values);
      setStatus(response.message);
    });
  };

  return (
    <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium">School Name</label>
          <Input {...register("schoolName")} />
          {errors.schoolName ? <p className="mt-1 text-xs text-red-600">{errors.schoolName.message}</p> : null}
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">School Email</label>
          <Input {...register("schoolEmail")} />
          {errors.schoolEmail ? <p className="mt-1 text-xs text-red-600">{errors.schoolEmail.message}</p> : null}
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">School Phone</label>
          <Input {...register("schoolPhone")} />
          {errors.schoolPhone ? <p className="mt-1 text-xs text-red-600">{errors.schoolPhone.message}</p> : null}
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">School Address</label>
          <Input {...register("schoolAddress")} />
          {errors.schoolAddress ? <p className="mt-1 text-xs text-red-600">{errors.schoolAddress.message}</p> : null}
        </div>
      </div>
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium">Admin Full Name</label>
          <Input {...register("adminName")} />
          {errors.adminName ? <p className="mt-1 text-xs text-red-600">{errors.adminName.message}</p> : null}
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Admin Email</label>
          <Input {...register("adminEmail")} />
          {errors.adminEmail ? <p className="mt-1 text-xs text-red-600">{errors.adminEmail.message}</p> : null}
        </div>
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium">Password</label>
        <Input type="password" {...register("adminPassword")} />
        {errors.adminPassword ? <p className="mt-1 text-xs text-red-600">{errors.adminPassword.message}</p> : null}
      </div>
      <Button type="submit" disabled={pending} className="w-full">{pending ? "Creating..." : "Create School Account"}</Button>
      <p className="text-sm text-slate-600">{status}</p>
      <p className="text-sm text-slate-600">Already have an account? <Link href="/login" className="font-medium text-[var(--brand-primary)] underline">Sign in</Link></p>
    </form>
  );
}
