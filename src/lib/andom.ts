import { supabase } from "@/integrations/supabase/client";

export type Role =
  | "producao"
  | "almoxarifado"
  | "qualidade"
  | "admin"
  | "coord_qualidade"
  | "coord_almoxarifado"
  | "gerente_supply"
  | "diretor_industrial";

export const ROLE_LABELS: Record<Role, string> = {
  producao: "Produção",
  almoxarifado: "Almoxarifado",
  qualidade: "Qualidade",
  admin: "Administrador",
  coord_qualidade: "Coordenador Qualidade",
  coord_almoxarifado: "Coordenador Almoxarifado",
  gerente_supply: "Gerente Supply Chain",
  diretor_industrial: "Diretor Industrial",
};

export const ROLE_OPTIONS: Role[] = [
  "producao",
  "almoxarifado",
  "qualidade",
  "coord_qualidade",
  "coord_almoxarifado",
  "gerente_supply",
  "diretor_industrial",
  "admin",
];

export const REASONS = {
  almoxarifado: [
    { id: "parado", label: "Posto Parado", color: "red" as const },
    { id: "abast-posto", label: "Aguardando abastecimento de posto", color: "orange" as const },
    { id: "abast-kanban", label: "Aguardando abastecimento de kanban", color: "orange" as const },
    { id: "separacao-errada", label: "Separação Errada", color: "yellow" as const },
  ],
  qualidade: [
    { id: "qualidade", label: "Aguardando qualidade", color: "red" as const },
  ],
};

export async function signInWithStation(stationKey: string, password: string) {
  const email = `${stationKey}@andom.app`;
  return supabase.auth.signInWithPassword({ email, password });
}

export function formatDuration(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${String(m).padStart(2, "0")}m ${String(s).padStart(2, "0")}s`;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}