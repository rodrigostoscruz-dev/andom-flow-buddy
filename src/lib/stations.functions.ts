import { createServerFn } from "@tanstack/react-start";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const listStations = createServerFn({ method: "GET" }).handler(async () => {
  const { data, error } = await supabaseAdmin
    .from("profiles")
    .select("station_key, station_name, role")
    .order("role", { ascending: true })
    .order("station_name", { ascending: true });
  if (error) throw new Error(error.message);
  return data ?? [];
});