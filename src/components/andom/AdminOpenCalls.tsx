import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Timer } from "@/components/andom/Timer";

type Call = {
  id: string;
  station_name: string;
  sector: "almoxarifado" | "qualidade";
  reason: string;
  color: string;
  observation: string | null;
  started_at: string;
  acknowledged_at: string | null;
};

export function AdminOpenCalls() {
  const [calls, setCalls] = useState<Call[]>([]);

  async function load() {
    const { data } = await supabase
      .from("calls")
      .select("id, station_name, sector, reason, color, observation, started_at, acknowledged_at")
      .eq("status", "ativo")
      .order("started_at");
    setCalls((data as Call[]) ?? []);
  }

  useEffect(() => {
    load();
    const ch = supabase
      .channel("admin-open-calls")
      .on("postgres_changes", { event: "*", schema: "public", table: "calls" }, () => load())
      .subscribe();
    const t = setInterval(load, 30000);
    return () => { supabase.removeChannel(ch); clearInterval(t); };
  }, []);

  return (
    <section className="rounded-2xl border border-white/10 bg-white/5 p-6">
      <h2 className="text-lg font-bold mb-4">Chamados abertos ({calls.length})</h2>
      {calls.length === 0 ? (
        <p className="text-muted-foreground text-sm">Nenhum chamado aberto no momento.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-muted-foreground border-b border-white/10">
              <tr><th className="p-2">Posto</th><th className="p-2">Setor</th><th className="p-2">Motivo</th><th className="p-2">Observação</th><th className="p-2">Status</th><th className="p-2">Tempo</th></tr>
            </thead>
            <tbody>
              {calls.map((c) => (
                <tr key={c.id} className="border-b border-white/5">
                  <td className="p-2 font-medium">{c.station_name}</td>
                  <td className="p-2">{c.sector === "almoxarifado" ? "Almoxarifado" : "Qualidade"}</td>
                  <td className="p-2">{c.reason}</td>
                  <td className="p-2 text-muted-foreground max-w-xs">{c.observation || "—"}</td>
                  <td className="p-2">
                    {c.acknowledged_at ? (
                      <span className="rounded-full px-2 py-1 text-xs font-semibold bg-primary/20 text-primary">Em atendimento</span>
                    ) : (
                      <span className="rounded-full px-2 py-1 text-xs font-semibold bg-destructive/20 text-destructive">Aguardando</span>
                    )}
                  </td>
                  <td className="p-2"><Timer startedAt={c.started_at} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
