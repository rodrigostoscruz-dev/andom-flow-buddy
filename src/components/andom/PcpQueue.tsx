import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Timer } from "@/components/andom/Timer";
import { ClipboardList, CheckCircle2, Clock } from "lucide-react";

type QueueItem = {
  id: string;
  station_name: string;
  reason: string;
  started_at: string;
  pcp_status: string;
  pcp_observation: string | null;
  pcp_sent_at: string | null;
};

export function PcpQueue() {
  const [items, setItems] = useState<QueueItem[]>([]);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      const { data } = await supabase.rpc("pcp_queue");
      if (alive) setItems((data as QueueItem[]) || []);
    };
    load();
    const ch = supabase
      .channel("pcp-queue-" + Math.random().toString(36).slice(2))
      .on("postgres_changes", { event: "*", schema: "public", table: "calls" }, () => load())
      .subscribe();
    const i = window.setInterval(load, 20_000);
    return () => { alive = false; supabase.removeChannel(ch); window.clearInterval(i); };
  }, []);

  return (
    <aside className="w-full lg:w-80 shrink-0 lg:border-l border-white/10 lg:min-h-[calc(100vh-73px)] p-4 space-y-3 bg-card/30">
      <div className="flex items-center gap-2 text-sm uppercase tracking-widest text-muted-foreground">
        <ClipboardList className="w-4 h-4" /> Em espera no PCP ({items.length})
      </div>
      {items.length === 0 && <p className="text-sm text-muted-foreground">Nenhum chamado no PCP.</p>}
      {items.map((c) => (
        <div key={c.id} className="rounded-xl border border-white/10 bg-card p-3 text-sm">
          <div className="font-bold">{c.station_name}</div>
          <div className="text-muted-foreground">{c.reason}</div>
          {c.pcp_observation && (
            <div className="mt-2 rounded-md bg-muted/50 px-2 py-1 whitespace-pre-wrap">{c.pcp_observation}</div>
          )}
          <div className="mt-2 flex items-center justify-between">
            <span className="font-semibold"><Timer startedAt={c.started_at} /></span>
            {c.pcp_status === "recebido" ? (
              <span className="inline-flex items-center gap-1 text-xs text-primary"><CheckCircle2 className="w-3 h-3" /> Recebido</span>
            ) : (
              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground"><Clock className="w-3 h-3" /> Aguardando</span>
            )}
          </div>
        </div>
      ))}
    </aside>
  );
}
