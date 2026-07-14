"use client";

import { useState, useTransition } from "react";
import { useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Mail, Lock, ArrowRight, Eye, EyeOff } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { loginAction } from "@/app/login/actions";

const schema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type FormValues = z.infer<typeof schema>;

export function LoginForm() {
  const [pending, startTransition] = useTransition();
  const [showPassword, setShowPassword] = useState(false);
  const searchParams = useSearchParams();
  const timedOut = searchParams.get("reason") === "inactivity";
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  const onSubmit = (values: FormValues) => {
    const formData = new FormData();
    formData.set("email", values.email);
    formData.set("password", values.password);

    startTransition(async () => {
      const result = await loginAction(formData);
      if (!result.ok) {
        setError("root", { message: result.message });
      }
    });
  };

  return (
    <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
      {timedOut && (
        <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-sm text-amber-700">
          Your session expired due to inactivity. Please sign in again.
        </div>
      )}
      <div className="space-y-2">
        <label className="text-sm font-medium text-slate-700">Email address</label>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
          <Input 
            type="email" 
            placeholder="admin@school.com" 
            className="h-12 pl-10"
            {...register("email")} 
          />
        </div>
        {errors.email && (
          <p className="text-xs text-red-600">{errors.email.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-slate-700">Password</label>
        <div 
          className="relative"
          onMouseLeave={() => setShowPassword(false)}
        >
          <Lock className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
          <Input 
            type={showPassword ? "text" : "password"} 
            placeholder="••••••••" 
            className="h-12 pl-10 pr-10"
            {...register("password")} 
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none"
            tabIndex={-1}
          >
            {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
          </button>
        </div>
        {errors.password && (
          <p className="text-xs text-red-600">{errors.password.message}</p>
        )}
      </div>

      {errors.root && (
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
          {errors.root.message}
        </div>
      )}

      <Button 
        type="submit" 
        className="h-12 w-full gap-2 bg-indigo-600 text-base font-semibold hover:bg-indigo-700" 
        disabled={pending}
      >
        {pending ? "Signing in..." : "Sign In"}
        {!pending && <ArrowRight className="h-4 w-4" />}
      </Button>

      <div className="text-center">
        <a
          href="/forgot-password"
          className="text-sm text-indigo-600 hover:text-indigo-700 hover:underline"
        >
          Forgot password?
        </a>
      </div>
    </form>
  );
}
