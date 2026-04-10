import type { Metadata } from "next";
import type { ReactNode } from "react";
import { RegistrarServiceWorker } from "@/components/pwa/RegistrarServiceWorker";
import { Toast } from "@/components/ui/Toast";
import "./globals.css";

export const metadata: Metadata = {
  title: "CasitaApp",
  description: "App de gastos domesticos para dos usuarios con Next.js y Supabase.",
  manifest: "/manifest.webmanifest",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="es">
      <body>
        <RegistrarServiceWorker />
        {children}
        <Toast />
      </body>
    </html>
  );
}
