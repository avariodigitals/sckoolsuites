"use client";

import { useEffect, useState, useCallback, createContext, useContext } from "react";
import { AlertTriangle, HelpCircle, Info, CheckCircle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

type ConfirmVariant = "default" | "danger" | "warning" | "info" | "success";

type ConfirmOptions = {
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: ConfirmVariant;
};

type ConfirmContextValue = (options: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmContextValue>(() => Promise.resolve(false));

export function useConfirm() {
  return useContext(ConfirmContext);
}

const variantConfig: Record<ConfirmVariant, { icon: typeof AlertTriangle; iconBg: string; iconColor: string; confirmClass: string }> = {
  default: { icon: HelpCircle, iconBg: "bg-slate-100", iconColor: "text-slate-600", confirmClass: "bg-slate-900 hover:bg-slate-800 text-white" },
  danger: { icon: XCircle, iconBg: "bg-rose-50", iconColor: "text-rose-600", confirmClass: "bg-rose-600 hover:bg-rose-700 text-white" },
  warning: { icon: AlertTriangle, iconBg: "bg-amber-50", iconColor: "text-amber-600", confirmClass: "bg-amber-600 hover:bg-amber-700 text-white" },
  info: { icon: Info, iconBg: "bg-blue-50", iconColor: "text-blue-600", confirmClass: "bg-blue-600 hover:bg-blue-700 text-white" },
  success: { icon: CheckCircle, iconBg: "bg-emerald-50", iconColor: "text-emerald-600", confirmClass: "bg-emerald-600 hover:bg-emerald-700 text-white" },
};

export function ConfirmDialogProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const [resolver, setResolver] = useState<((value: boolean) => void) | null>(null);

  const confirm = useCallback<ConfirmContextValue>((opts) => {
    setOptions(opts);
    setOpen(true);
    return new Promise<boolean>((resolve) => {
      setResolver(() => resolve);
    });
  }, []);

  const handleConfirm = () => {
    setOpen(false);
    resolver?.(true);
    setResolver(null);
  };

  const handleCancel = useCallback(() => {
    setOpen(false);
    resolver?.(false);
    setResolver(null);
  }, [resolver]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, handleCancel]);

  const variant = options?.variant ?? "default";
  const cfg = variantConfig[variant];
  const Icon = cfg.icon;

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {open && options && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            onClick={handleCancel}
          />
          <div className="relative z-10 w-full max-w-md rounded-2xl bg-white shadow-xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6">
              <div className="flex items-start gap-4">
                <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${cfg.iconBg}`}>
                  <Icon className={`h-5 w-5 ${cfg.iconColor}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-base font-semibold text-slate-900">
                    {options.title ?? "Confirm Action"}
                  </h3>
                  <p className="mt-1.5 text-sm text-slate-600 leading-relaxed">
                    {options.message}
                  </p>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 border-t border-slate-100 bg-slate-50 px-6 py-4">
              <Button
                variant="outline"
                size="sm"
                onClick={handleCancel}
              >
                {options.cancelLabel ?? "Cancel"}
              </Button>
              <Button
                size="sm"
                onClick={handleConfirm}
                className={cfg.confirmClass}
              >
                {options.confirmLabel ?? "Confirm"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}
