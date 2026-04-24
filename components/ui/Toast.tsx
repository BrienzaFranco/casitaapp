"use client";

import { Toaster } from "sonner";

export function Toast() {
  return (
    <Toaster
      position="top-center"
      toastOptions={{
        style: {
          fontFamily: "var(--font-inter)",
          fontSize: "13px",
          borderRadius: "0.75rem",
          border: "1px solid var(--outline-variant)",
          background: "var(--surface-container-lowest)",
          color: "var(--on-surface)",
        },
      }}
    />
  );
}
