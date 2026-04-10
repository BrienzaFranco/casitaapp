import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Inter, Space_Grotesk } from "next/font/google";
import { RegistrarServiceWorker } from "@/components/pwa/RegistrarServiceWorker";
import { Toast } from "@/components/ui/Toast";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
  display: "swap",
});

export const metadata: Metadata = {
  title: "CasitaApp",
  description: "App de gastos domesticos para dos usuarios con Next.js y Supabase.",
  manifest: "/manifest.webmanifest",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="es">
      <body className={`${inter.variable} ${spaceGrotesk.variable} font-body`}>
        <RegistrarServiceWorker />
        {children}
        <Toast />
      </body>
    </html>
  );
}
