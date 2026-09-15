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

// Horário de trabalho: conta apenas entre 08:00 e 17:31 (America/Sao_Paulo).
const WORK_TZ = "America/Sao_Paulo";
const WORK_START_MS = 8 * 3600 * 1000;
const WORK_END_MS = (17 * 3600 + 31 * 60) * 1000;
const DAY_MS = 86400000;

function wallClockMs(date: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: WORK_TZ,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(date);
  const g = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? 0);
  return Date.UTC(g("year"), g("month") - 1, g("day"), g("hour") % 24, g("minute"), g("second"));
}

function isWeekday(dayStartMs: number) {
  const dow = new Date(dayStartMs).getUTCDay(); // 0 = domingo, 6 = sábado
  return dow >= 1 && dow <= 5;
}

export function workingSeconds(start: string | number | Date, end: string | number | Date) {
  const s = wallClockMs(new Date(start));
  const e = wallClockMs(new Date(end));
  if (!(e > s)) return 0;
  let total = 0;
  const lastDay = Math.floor(e / DAY_MS) * DAY_MS;
  for (let day = Math.floor(s / DAY_MS) * DAY_MS; day <= lastDay; day += DAY_MS) {
    if (!isWeekday(day)) continue;
    total += Math.max(0, Math.min(e, day + WORK_END_MS) - Math.max(s, day + WORK_START_MS));
  }
  return Math.floor(total / 1000);
}

export function formatDuration(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${String(m).padStart(2, "0")}m ${String(s).padStart(2, "0")}s`;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}