import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const ROLES = [
  "producao",
  "almoxarifado",
  "qualidade",
  "admin",
  "coord_qualidade",
  "coord_almoxarifado",
  "gerente_supply",
  "diretor_industrial",
] as const;

async function assertAdmin(userId: string) {
  const { data, error } = await supabaseAdmin
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .single();
  if (error || !data || data.role !== "admin") {
    throw new Error("Acesso negado: requer perfil de administrador.");
  }
}

function emailFor(stationKey: string) {
  return `${stationKey}@andom.app`;
}

export const adminListStations = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);
    const { data, error } = await supabaseAdmin
      .from("profiles")
      .select("id, station_key, station_name, role, created_at")
      .order("role")
      .order("station_name");
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const adminCreateStation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        stationKey: z.string().min(1).max(50).regex(/^[a-z0-9_-]+$/),
        stationName: z.string().min(1).max(120),
        role: z.enum(ROLES),
        password: z.string().min(6).max(120),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email: emailFor(data.stationKey),
      password: data.password,
      email_confirm: true,
    });
    if (error || !created.user) throw new Error(error?.message ?? "Falha ao criar usuário");
    const { error: pErr } = await supabaseAdmin.from("profiles").insert({
      id: created.user.id,
      station_key: data.stationKey,
      station_name: data.stationName,
      role: data.role,
    });
    if (pErr) {
      await supabaseAdmin.auth.admin.deleteUser(created.user.id);
      throw new Error(pErr.message);
    }
    return { id: created.user.id };
  });

export const adminUpdateStation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        id: z.string().uuid(),
        stationName: z.string().min(1).max(120),
        role: z.enum(ROLES),
        password: z.string().min(6).max(120).optional().or(z.literal("")),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { error } = await supabaseAdmin
      .from("profiles")
      .update({ station_name: data.stationName, role: data.role })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    if (data.password && data.password.length >= 6) {
      const { error: aErr } = await supabaseAdmin.auth.admin.updateUserById(data.id, {
        password: data.password,
      });
      if (aErr) throw new Error(aErr.message);
    }
    return { ok: true };
  });

export const adminDeleteStation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
