import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { RotateCcw } from "lucide-react";

type Call = {
  id: string;
  station_name: string;
  sector: "almoxarifado" | "qualidade";
  reason: string;
  observation: string | null;
  ended_at: string | null;
};

type Stage = "aguardando" | "atendimento";

export function AdminClosedCalls() {
  const [calls, setCalls] = useState<Call[]>([]);
  const [stages, setStages] = useState<Record<string, Stage>>({});

  async function load() {
    const { data } = await supabase
      .from("calls")
      .select("id, station_name, sector, reason, observation, ended_at")
      .eq("status", "encerrado")
      .order("ended_at", { ascending: false })
      .limit(20);
    setCalls((data as Call[]) ?? []);
  }

  useEffect(() => {
    load();
    const ch = supabase
      .channel("admin-closed-calls")
      .on("postgres_changes", { event: "*", schema: "public", table: "calls" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  async function reopen(c: Call) {
    const stage = stages[c.id] ?? "aguardando";
    const label = stage === "aguardando" ? "Aguardando" : "Em atendimento";
    if (!confirm(`Reabrir o chamado de "${c.station_name}" (${c.reason}) na etapa "${label}"?`)) return;
    const { error } = await supabase.rpc("admin_reopen_call", { p_call_id: c.id, p_stage: stage });
    if (error) return toast.error(error.message);
    toast.success("Chamado reaberto");
    load();
  }

  return (
    <section className="rounded-2xl border border-white/10 bg-white/5 p-6">
      <h2 className="text-lg font-bold mb-1">Chamados encerrados recentemente</h2>
      <p className="text-xs text-muted-foreground mb-4">Reabra um chamado fechado por engano e escolha em qual etapa ele volta.</p>
      {calls.length === 0 ? (
        <p className="text-muted-foreground text-sm">Nenhum chamado encerrado.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-muted-foreground border-b border-white/10">
              <tr><th className="p-2">Posto</th><th className="p-2">Setor</th><th className="p-2">Motivo</th><th className="p-2">Encerrado em</th><th className="p-2">Voltar para</th><th className="p-2 text-right">Ação</th></tr>
            </thead>
            <tbody>
              {calls.map((c) => (
                <tr key={c.id} className="border-b border-white/5">
                  <td className="p-2 font-medium">{c.station_name}</td>
                  <td className="p-2">{c.sector === "almoxarifado" ? "Almoxarifado" : "Qualidade"}</td>
                  <td className="p-2">{c.reason}</td>
                  <td className="p-2 text-muted-foreground">{c.ended_at ? new Date(c.ended_at).toLocaleString("pt-BR") : "—"}</td>
                  <td className="p-2">
                    <select
                      value={stages[c.id] ?? "aguardando"}
                      onChange={(e) => setStages((s) => ({ ...s, [c.id]: e.target.value as Stage }))}
                      className="h-8 rounded-md bg-background/60 border border-white/15 px-2"
                    >
                      <option value="aguardando">Aguardando</option>
                      <option value="atendimento">Em atendimento</option>
                    </select>
                  </td>
                  <td className="p-2 text-right">
                    <Button size="sm" variant="outline" onClick={() => reopen(c)} className="gap-1">
                      <RotateCcw className="w-3 h-3" /> Reabrir
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
