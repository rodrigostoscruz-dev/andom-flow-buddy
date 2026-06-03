import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { TopBar } from "@/components/andom/TopBar";
import { Timer } from "@/components/andom/Timer";
import { Inbox, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ROLE_LABELS, type Role } from "@/lib/andom";
import { toast } from "sonner";

export const Route = createFileRoute("/coordenador")({ component: CoordenadorPage });

const ESCALATION_ROLES: Role[] = [
  "coord_qualidade",
  "coord_almoxarifado",
  "gerente_supply",
  "diretor_industrial",
];

type Profile = { id: string; station_name: string; role: Role };
type Call = {
  id: string;
  station_name: string;
  reason: string;
  color: string;
  sector: string;
  started_at: string;
  status: string;
  acknowledged_at: string | null;
};

function CoordenadorPage() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [calls, setCalls] = useState<Call[]>([]);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const beepCycleRef = useRef<number | null>(null);
  const beepTimeoutsRef = useRef<number[]>([]);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return navigate({ to: "/login" });
      const { data: p } = await supabase.from("profiles").select("*").eq("id", session.user.id).single();
      if (!p) return navigate({ to: "/login" });
      if (!ESCALATION_ROLES.includes(p.role as Role)) return navigate({ to: "/" });
      setProfile(p as Profile);
      await refresh();
    })();
  }, [navigate]);

  async function refresh() {
    const { data } = await supabase
      .from("calls").select("*").eq("status", "ativo")
      .order("started_at", { ascending: true });
    setCalls((data as Call[]) || []);
  }

  useEffect(() => {
    if (!profile) return;
    const ch = supabase
      .channel("coord-" + profile.id)
      .on("postgres_changes", { event: "*", schema: "public", table: "calls" }, () => refresh())
      .subscribe();
    const i = window.setInterval(refresh, 60_000); // refresh visibility windows
    return () => { supabase.removeChannel(ch); window.clearInterval(i); };
  }, [profile]);

  useEffect(() => {
    if (!profile || calls.length === 0) return;
    const ensureCtx = () => {
      if (!audioCtxRef.current) {
        const Ctx = (window.AudioContext || (window as any).webkitAudioContext);
        if (Ctx) audioCtxRef.current = new Ctx();
      }
      return audioCtxRef.current;
    };
    const beep = (ms: number) => {
      const ctx = ensureCtx(); if (!ctx) return;
      if (ctx.state === "suspended") ctx.resume().catch(() => {});
      const osc = ctx.createOscillator(); const gain = ctx.createGain();
      osc.type = "square"; osc.frequency.value = 880; gain.gain.value = 0.15;
      osc.connect(gain).connect(ctx.destination);
      osc.start(); osc.stop(ctx.currentTime + ms / 1000);
    };
    const burst = () => {
      beepTimeoutsRef.current.forEach((t) => window.clearTimeout(t));
      beepTimeoutsRef.current = [];
      for (let t = 0; t < 10_000; t += 600) {
        beepTimeoutsRef.current.push(window.setTimeout(() => beep(300), t));
      }
    };
    burst();
    beepCycleRef.current = window.setInterval(burst, 3 * 60 * 1000);
    return () => {
      if (beepCycleRef.current) window.clearInterval(beepCycleRef.current);
      beepTimeoutsRef.current.forEach((t) => window.clearTimeout(t));
      beepTimeoutsRef.current = [];
    };
  }, [profile, calls.length === 0]);

  async function acknowledge(id: string) {
    if (!profile) return;
    const { error } = await supabase.from("calls")
      .update({ acknowledged_at: new Date().toISOString(), acknowledged_by: profile.id })
      .eq("id", id);
    if (error) toast.error(error.message);
    else toast.success("Marcado como em atendimento");
  }

  if (!profile) return null;

  return (
    <div className="min-h-screen">
      <TopBar title={ROLE_LABELS[profile.role]} subtitle={`${calls.length} chamado(s) em escalonamento`} />
      <main className="max-w-7xl mx-auto p-6">
        {calls.length === 0 ? (
          <div className="text-center py-24 text-muted-foreground">
            <Inbox className="w-16 h-16 mx-auto mb-4 opacity-40" />
            <p className="text-lg">Nenhum chamado escalonado para você no momento</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {calls.map((c) => (
              <div key={c.id}
                className={`rounded-2xl p-8 shadow-2xl ${c.acknowledged_at ? "bg-[oklch(0.35_0.08_240)] text-white" : c.color === "red" ? "andom-blink-red" : c.color === "yellow" ? "andom-blink-yellow" : "andom-blink-orange"}`}>
                <div className="text-xs uppercase tracking-[0.25em] opacity-80">{c.sector}</div>
                <div className="text-4xl font-black tracking-tight leading-tight mt-1">{c.station_name}</div>
                <div className="text-base font-semibold mt-2 opacity-95">{c.reason}</div>
                <div className="text-3xl font-bold mt-6"><Timer startedAt={c.started_at} /></div>
                {c.acknowledged_at ? (
                  <div className="mt-4 inline-flex items-center gap-2 bg-white/20 rounded-md px-3 py-1 text-sm">
                    <CheckCircle2 className="w-4 h-4" /> Em atendimento
                  </div>
                ) : (
                  <Button onClick={() => acknowledge(c.id)} variant="secondary" className="mt-4 gap-2 font-bold">
                    <CheckCircle2 className="w-4 h-4" /> Em Atendimento
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}