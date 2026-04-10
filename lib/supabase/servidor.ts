import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function crearClienteSupabaseServidor() {
  const almacenCookies = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return almacenCookies.getAll();
        },
        setAll(cookiesASetear) {
          cookiesASetear.forEach(({ name, value, options }) => {
            almacenCookies.set(name, value, options);
          });
        },
      },
    },
  );
}
