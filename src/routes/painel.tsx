import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { TopBar } from "@/components/andom/TopBar";
import { Timer } from "@/components/andom/Timer";
import { Inbox } from "lucide-react";

export const Route = createFileRoute("/painel")({ component: PainelPage });

type Profile = { id: string; station_name: string; role: "almoxarifado" | "qualidade" | "producao" };
type Call = {
  id: string;
  station_name: string;
  reason: string;
  color: string;
  sector: string;
  started_at: string;
  status: string;
};

function PainelPage() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [calls, setCalls] = useState<Call[]>([]);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return navigate({ to: "/login" });
      const { data: p } = await supabase.from("profiles").select("*").eq("id", session.user.id).single();
      if (!p) return navigate({ to: "/login" });
      if (p.role === "producao") return navigate({ to: "/posto" });
      setProfile(p as Profile);
      await refresh();
    })();
  }, [navigate]);

  async function refresh() {
    const { data } = await supabase
      .from("calls")
      .select("*")
      .eq("status", "ativo")
      .order("started_at", { ascending: true });
    setCalls((data as Call[]) || []);
  }

  useEffect(() => {
    if (!profile) return;
    const ch = supabase
      .channel("painel-" + profile.role)
      .on("postgres_changes", { event: "*", schema: "public", table: "calls" }, () => refresh())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [profile]);

  if (!profile) return null;

  return (
    <div className="min-h-screen">
      <TopBar
        title={`Painel ${profile.station_name}`}
        subtitle={`${calls.length} chamado(s) em aberto`}
        showReport
      />
      <main className="max-w-7xl mx-auto p-6">
        {calls.length === 0 ? (
          <div className="text-center py-24 text-muted-foreground">
            <Inbox className="w-16 h-16 mx-auto mb-4 opacity-40" />
            <p className="text-lg">Nenhum chamado no momento</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {calls.map((c) => (
              <div
                key={c.id}
                className={`rounded-2xl p-8 shadow-2xl ${c.color === "red" ? "andom-blink-red" : "andom-blink-orange"}`}
              >
                <div className="text-xs uppercase tracking-[0.25em] opacity-80">{c.sector}</div>
                <div className="text-4xl font-black tracking-tight leading-tight mt-1">{c.station_name}</div>
                <div className="text-base font-semibold mt-2 opacity-95">{c.reason}</div>
                <div className="text-3xl font-bold mt-6"><Timer startedAt={c.started_at} /></div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}