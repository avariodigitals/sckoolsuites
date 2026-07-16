import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans, Sora } from "next/font/google";
import { SessionProvider } from "next-auth/react";
import { InactivityTimer } from "@/components/inactivity-timer";
import { ConfirmDialogProvider } from "@/components/ui/confirm-dialog";
import { PushNotificationManager } from "@/components/push-notification-manager";
import "./globals.css";

const sora = Sora({
  variable: "--font-display",
  subsets: ["latin"],
});

const plusJakarta = Plus_Jakarta_Sans({
  variable: "--font-body",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Sckool Suite",
  description: "Nigerian-first School ERP + LMS",
  manifest: "/manifest.json",
  icons: {
    icon: "/icon-192.png",
    shortcut: "/icon-192.png",
    apple: "/apple-touch-icon.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Sckool Suite",
  },
};

export const viewport: Viewport = {
  themeColor: "#0B1F4D",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${sora.variable} ${plusJakarta.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        <SessionProvider>
          <ConfirmDialogProvider>
            {children}
            <InactivityTimer />
            <PushNotificationManager />
          </ConfirmDialogProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
