import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function naira(value: number) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatDate(input: Date | string | null | undefined) {
  if (!input) return "-";

  const date = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(date.getTime())) return "-";

  return new Intl.DateTimeFormat("en-NG", {
    dateStyle: "medium",
  }).format(date);
}

export function humanizeEnum(value: string | null | undefined) {
  if (!value) return "-";
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function getCloudinaryInlineUrl(url: string): string {
  if (!url) return url;
  if (!url.includes("cloudinary.com")) return url;
  return `/api/cloudinary/preview?url=${encodeURIComponent(url)}`;
}
