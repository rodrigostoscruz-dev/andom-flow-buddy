import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { TopBar } from "@/components/andom/TopBar";
import { Timer } from "@/components/andom/Timer";
import { PcpQueue } from "@/components/andom/PcpQueue";
import { Button } from "@/components/ui/button";
import { Inbox, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/pcp")({
  head: () => ({
    meta: [
      { title: "PCP — Andon" },
      { name: "description", content: "Chamados encaminhados pelo Almoxarifado ao PCP." },
      { property: "og:title", content: "PCP — Andon" },
      { property: "og:description", content: "Chamados encaminhados pelo Almoxarifado ao PCP." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PcpPage,
});

type Call = {
  id: string;
  station_name: string;
  reason: string;
  started_at: string;
  observation: string | null;
  pcp_status: string | null;
  pcp_observation: string | null;
};

function PcpPage() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [calls, setCalls] = useState<Call[]>([]);

  async function refresh() {
    const { data } = await supabase
      .from("calls")
      .select("*")
      .eq("status", "ativo")
      .in("pcp_status", ["aguardando", "recebido"])
      .order("pcp_sent_at", { ascending: true });
    setCalls((data as Call[]) || []);
  }

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return navigate({ to: "/login" });
      const { data: p } = await supabase.from("profiles").select("role").eq("id", session.user.id).single();
      if (!p) return navigate({ to: "/login" });
      if (p.role !== "pcp" && p.role !== "admin") return navigate({ to: "/" });
      setReady(true);
      refresh();
    })();
  }, [navigate]);

  useEffect(() => {
    if (!ready) return;
    const ch = supabase
      .channel("pcp-page")
      .on("postgres_changes", { event: "*", schema: "public", table: "calls" }, () => refresh())
      .subscribe();
    const i = window.setInterval(refresh, 20_000);
    return () => { supabase.removeChannel(ch); window.clearInterval(i); };
  }, [ready]);

  async function receive(id: string) {
    const { error } = await supabase.rpc("pcp_receive", { p_call_id: id });
    if (error) toast.error(error.message);
    else { toast.success("Chamado marcado como recebido"); refresh(); }
  }

  if (!ready) return null;

  return (
    <div className="min-h-screen">
      <TopBar title="PCP" subtitle={`${calls.length} chamado(s) do Almoxarifado`} />
      <div className="flex flex-col lg:flex-row">
        <main className="flex-1 p-6">
          {calls.length === 0 ? (
            <div className="text-center py-24 text-muted-foreground">
              <Inbox className="w-16 h-16 mx-auto mb-4 opacity-40" />
              <p className="text-lg">Nenhum chamado no momento</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {calls.map((c) => (
                <div key={c.id} className={`rounded-2xl p-6 shadow-2xl ${c.pcp_status === "recebido" ? "bg-[oklch(0.35_0.08_240)] text-white" : "andom-blink-orange"}`}>
                  <div className="text-xs uppercase tracking-[0.25em] opacity-80">Almoxarifado → PCP</div>
                  <div className="text-3xl font-black mt-1">{c.station_name}</div>
                  <div className="font-semibold mt-1">{c.reason}</div>
                  {c.pcp_observation && (
                    <div className="mt-3 bg-black/25 rounded-lg p-3 text-sm whitespace-pre-wrap">
                      <div className="text-[10px] uppercase tracking-widest opacity-80 mb-1">Observação do Almoxarifado</div>
                      {c.pcp_observation}
                    </div>
                  )}
                  {c.observation && (
                    <div className="mt-2 bg-black/15 rounded-lg p-3 text-sm whitespace-pre-wrap">
                      <div className="text-[10px] uppercase tracking-widest opacity-80 mb-1">Observação do posto</div>
                      {c.observation}
                    </div>
                  )}
                  <div className="text-2xl font-bold mt-4"><Timer startedAt={c.started_at} /></div>
                  {c.pcp_status === "recebido" ? (
                    <div className="mt-3 inline-flex items-center gap-2 bg-white/20 rounded-md px-3 py-1 text-sm">
                      <CheckCircle2 className="w-4 h-4" /> Recebido
                    </div>
                  ) : (
                    <Button onClick={() => receive(c.id)} variant="secondary" className="mt-3 gap-2 font-bold">
                      <CheckCircle2 className="w-4 h-4" /> Recebido
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </main>
        <PcpQueue />
      </div>
    </div>
  );
}
