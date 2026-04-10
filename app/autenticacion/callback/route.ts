import { NextResponse } from "next/server";
import { crearClienteSupabaseServidor } from "@/lib/supabase/servidor";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const error = url.searchParams.get("error") || url.searchParams.get("error_description");

  if (error) {
    return NextResponse.redirect(new URL(`/ingresar?error=${encodeURIComponent(error)}`, url.origin));
  }

  if (!code) {
    return NextResponse.redirect(new URL("/ingresar?error=No se recibio codigo", url.origin));
  }

  const cliente = await crearClienteSupabaseServidor();
  const { error: errorSesion } = await cliente.auth.exchangeCodeForSession(code);

  if (errorSesion) {
    return NextResponse.redirect(new URL(`/ingresar?error=${encodeURIComponent(errorSesion.message)}`, url.origin));
  }

  return NextResponse.redirect(new URL("/nueva-compra", url.origin));
}
