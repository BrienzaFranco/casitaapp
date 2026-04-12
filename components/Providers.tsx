"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useState, type ReactNode } from "react";

/**
 * Suppress known cosmetic warnings from third-party libraries:
 * - Recharts "width(-1) and height(-1)" — false-positive on resize/F12
 * - Supabase gotrue-js lock errors — harmless, the SDK retries internally
 */
function SuppressCosmeticWarnings() {
  useEffect(() => {
    const originalError = console.error;
    const originalWarn = console.warn;
    const suppressedPatterns = [
      /The width\(-1\) and height\(-1\) of chart should be greater than 0/,
      /Lock "lock:sb-.*" was not released within \d+ms/,
      /Lock broken by another request with the 'steal' option/,
      /forcefully acquiring the lock to recover/i,
      /orphaned lock from a component unmount/i,
      /AbortError.*Lock broken/i,
      /AbortError.*steal/i,
    ];

    function shouldSuppress(message: string) {
      return suppressedPatterns.some(pattern => pattern.test(message));
    }

    // Intercept console.error and console.warn
    console.error = (...args: unknown[]) => {
      const message = args.map(a => String(a ?? "")).join(" ");
      if (shouldSuppress(message)) return;
      originalError(...args);
    };

    console.warn = (...args: unknown[]) => {
      const message = args.map(a => String(a ?? "")).join(" ");
      if (shouldSuppress(message)) return;
      originalWarn(...args);
    };

    // Intercept unhandled promise rejections for these known errors
    function handleUnhandledRejection(e: PromiseRejectionEvent) {
      const message = String(e.reason ?? "");
      if (shouldSuppress(message)) {
        e.preventDefault();
      }
    }

    window.addEventListener("unhandledrejection", handleUnhandledRejection);

    return () => {
      console.error = originalError;
      console.warn = originalWarn;
      window.removeEventListener("unhandledrejection", handleUnhandledRejection);
    };
  }, []);

  return null;
}

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 1000 * 60 * 5, // 5 min
            refetchOnWindowFocus: true,
            retry: 2,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <SuppressCosmeticWarnings />
      {children}
    </QueryClientProvider>
  );
}
