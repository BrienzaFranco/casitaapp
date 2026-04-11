"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

let cliente: SupabaseClient | null = null;

export function crearClienteSupabase() {
  if (!cliente) {
    cliente = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: {
          flowType: "pkce",
          detectSessionInUrl: false,
          persistSession: true,
          autoRefreshToken: true,
        },
      },
    );
  }

  return cliente;
}

/**
 * Retry wrapper for Supabase queries that may fail due to auth lock contention.
 * Retries up to 2 times with a 200ms backoff on lock/abort errors.
 */
export async function queryConReintento<T>(
  fn: () => Promise<{ data: T | null; error: unknown }>,
  intentos = 2,
): Promise<{ data: T | null; error: unknown }> {
  let ultimoError: unknown = null;
  for (let i = 0; i < intentos; i++) {
    try {
      const result = await fn();
      if (result.error) {
        const msg = result.error instanceof Error ? result.error.message : String(result.error ?? "");
        if (msg.includes("Lock") || msg.includes("Abort") || msg.includes("steal")) {
          ultimoError = result.error;
          await new Promise(r => setTimeout(r, 200 * (i + 1)));
          continue;
        }
      }
      return result;
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error ?? "");
      if (msg.includes("Lock") || msg.includes("Abort") || msg.includes("steal")) {
        ultimoError = error;
        await new Promise(r => setTimeout(r, 200 * (i + 1)));
        continue;
      }
      throw error;
    }
  }
  return { data: null, error: ultimoError };
}
