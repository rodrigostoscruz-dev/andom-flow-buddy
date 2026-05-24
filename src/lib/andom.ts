import { supabase } from "@/integrations/supabase/client";

export type Role = "producao" | "almoxarifado" | "qualidade";

export const STATIONS = [
  { key: "cabeca", name: "Cabeça", role: "producao" as Role },
  { key: "transportador", name: "Transportador", role: "producao" as Role },
  { key: "mesa-saida", name: "Mesa de Saída", role: "producao" as Role },
  { key: "eletrica", name: "Elétrica", role: "producao" as Role },
  { key: "ponte", name: "Ponte", role: "producao" as Role },
  { key: "plother-icf", name: "Plother/ICF", role: "producao" as Role },
  { key: "integracao", name: "Integração", role: "producao" as Role },
  { key: "almoxarifado", name: "Almoxarifado", role: "almoxarifado" as Role },
  { key: "qualidade", name: "Qualidade", role: "qualidade" as Role },
];

export const REASONS = {
  almoxarifado: [
    { id: "parado", label: "Posto Parado", color: "red" as const },
    { id: "abast-posto", label: "Aguardando abastecimento de posto", color: "orange" as const },
    { id: "abast-kanban", label: "Aguardando abastecimento de kanban", color: "orange" as const },
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