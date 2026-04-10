"use client";

import { Toaster } from "sonner";

export function Toast() {
  return (
    <Toaster
      richColors
      position="top-center"
      toastOptions={{
        style: {
          fontFamily: "var(--font-inter)",
          fontSize: "13px",
          borderRadius: "0.5rem",
          border: "1px solid var(--outline-variant)",
          background: "var(--surface-container-lowest)",
        },
      }}
    />
  );
}
