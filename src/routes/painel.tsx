import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { TopBar } from "@/components/andom/TopBar";
import { Timer } from "@/components/andom/Timer";
import { Inbox, CheckCircle2, Send, XCircle, Pencil } from "lucide-react";
import { PcpQueue } from "@/components/andom/PcpQueue";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const Route = createFileRoute("/painel")({ component: PainelPage });

type Profile = { id: string; station_name: string; role: "almoxarifado" | "qualidade" | "producao" | "admin" };
type Call = {
  id: string;
  station_name: string;
  reason: string;
  color: string;
  sector: string;
  started_at: string;
  status: string;
  acknowledged_at: string | null;
  observation: string | null;
  pcp_status: string | null;
  pcp_observation: string | null;
};

function PainelPage() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [calls, setCalls] = useState<Call[]>([]);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const beepCycleRef = useRef<number | null>(null);
  const beepTimeoutsRef = useRef<number[]>([]);
  const [pcpDialog, setPcpDialog] = useState<null | { id: string; edit: boolean }>(null);
  const [pcpText, setPcpText] = useState("");

  useEffect(() => {
    const unlock = () => {
      try {
        const Ctx = (window.AudioContext || (window as any).webkitAudioContext);
        if (!Ctx) return;
        if (!audioCtxRef.current) audioCtxRef.current = new Ctx();
        audioCtxRef.current.resume().catch(() => {});
        const o = audioCtxRef.current.createOscillator();
        const g = audioCtxRef.current.createGain();
        g.gain.value = 0.0001;
        o.connect(g).connect(audioCtxRef.current.destination);
        o.start(); o.stop(audioCtxRef.current.currentTime + 0.05);
      } catch {}
    };
    const events = ["pointerdown", "keydown", "touchstart", "click"];
    events.forEach((e) => window.addEventListener(e, unlock, { once: true }));
    return () => events.forEach((e) => window.removeEventListener(e, unlock));
  }, []);

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
    const i = window.setInterval(refresh, 3 * 60 * 1000);
    return () => { supabase.removeChannel(ch); window.clearInterval(i); };
  }, [profile]);

  // Intermittent beep when there are active calls.
  // Plays short beeps during 10 seconds, then waits 3 minutes, and repeats.
  const pendingCount = calls.filter((c) => !c.acknowledged_at).length;
  useEffect(() => {
    if (!profile) return;
    if (pendingCount === 0) return;

    const ensureCtx = () => {
      if (!audioCtxRef.current) {
        const Ctx = (window.AudioContext || (window as any).webkitAudioContext);
        if (Ctx) audioCtxRef.current = new Ctx();
      }
      return audioCtxRef.current;
    };

    const beep = (durationMs: number) => {
      const ctx = ensureCtx();
      if (!ctx) return;
      if (ctx.state === "suspended") ctx.resume().catch(() => {});
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "square";
      osc.frequency.value = 880;
      gain.gain.value = 0.15;
      osc.connect(gain).connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + durationMs / 1000);
    };

    const burst = () => {
      // 10 seconds of intermittent beeps: 300ms on / 300ms off
      beepTimeoutsRef.current.forEach((t) => window.clearTimeout(t));
      beepTimeoutsRef.current = [];
      const total = 10_000;
      const step = 600;
      for (let t = 0; t < total; t += step) {
        const id = window.setTimeout(() => beep(300), t);
        beepTimeoutsRef.current.push(id);
      }
    };

    burst();
    beepCycleRef.current = window.setInterval(burst, 3 * 60 * 1000);

    return () => {
      if (beepCycleRef.current) window.clearInterval(beepCycleRef.current);
      beepTimeoutsRef.current.forEach((t) => window.clearTimeout(t));
      beepTimeoutsRef.current = [];
    };
  }, [profile, pendingCount === 0]);

  if (!profile) return null;

  async function acknowledge(id: string) {
    if (!profile) return;
    const { error } = await supabase
      .from("calls")
      .update({ acknowledged_at: new Date().toISOString(), acknowledged_by: profile.id })
      .eq("id", id);
    if (error) toast.error(error.message);
    else toast.success("Marcado como em atendimento");
  }

  const canPcp = profile.role === "almoxarifado" || profile.role === "admin";

  async function submitPcp() {
    if (!pcpDialog) return;
    const d = pcpDialog;
    const { error } = d.edit
      ? await supabase.rpc("update_pcp_observation", { p_call_id: d.id, p_observation: pcpText })
      : await supabase.rpc("send_to_pcp", { p_call_id: d.id, p_observation: pcpText });
    if (error) return toast.error(error.message);
    toast.success(d.edit ? "Observação do PCP atualizada" : "Chamado enviado ao PCP");
    setPcpDialog(null);
    refresh();
  }

  async function cancelPcp(id: string) {
    const { error } = await supabase.rpc("cancel_pcp", { p_call_id: id });
    if (error) toast.error(error.message);
    else { toast.success("Chamado ao PCP cancelado"); refresh(); }
  }

  return (
    <div className="min-h-screen">
      <TopBar
        title={`Painel ${profile.station_name}`}
        subtitle={`${calls.length} chamado(s) em aberto`}
      />
      <div className="flex flex-col lg:flex-row">
      <main className="flex-1 p-6">
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
                className={`rounded-2xl p-8 shadow-2xl ${c.acknowledged_at ? "bg-[oklch(0.35_0.08_240)] text-white" : c.color === "red" ? "andom-blink-red" : c.color === "yellow" ? "andom-blink-yellow" : "andom-blink-orange"}`}
              >
                <div className="text-xs uppercase tracking-[0.25em] opacity-80">{c.sector}</div>
                <div className="text-4xl font-black tracking-tight leading-tight mt-1">{c.station_name}</div>
                <div className="text-base font-semibold mt-2 opacity-95">{c.reason}</div>
                {c.observation && (
                  <div className="mt-3 bg-black/25 rounded-lg p-3 text-sm whitespace-pre-wrap">
                    <div className="text-[10px] uppercase tracking-widest opacity-80 mb-1">Observação</div>
                    {c.observation}
                  </div>
                )}
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
                {canPcp && c.sector === "almoxarifado" && (
                  <div className="mt-4 border-t border-white/20 pt-3 space-y-2">
                    {c.pcp_status === "aguardando" || c.pcp_status === "recebido" ? (
                      <>
                        <div className="inline-flex items-center gap-2 bg-white/20 rounded-md px-3 py-1 text-sm font-semibold">
                          {c.pcp_status === "recebido" ? <><CheckCircle2 className="w-4 h-4" /> Recebido pelo PCP</> : <><Send className="w-4 h-4" /> Aguardando PCP</>}
                        </div>
                        {c.pcp_observation && (
                          <div className="bg-black/25 rounded-lg p-2 text-sm whitespace-pre-wrap">
                            <div className="text-[10px] uppercase tracking-widest opacity-80 mb-1">Observação ao PCP</div>
                            {c.pcp_observation}
                          </div>
                        )}
                        <div className="flex flex-wrap gap-2">
                          <Button size="sm" variant="secondary" className="gap-2" onClick={() => { setPcpText(c.pcp_observation ?? ""); setPcpDialog({ id: c.id, edit: true }); }}>
                            <Pencil className="w-4 h-4" /> Editar observação
                          </Button>
                          <Button size="sm" variant="destructive" className="gap-2" onClick={() => cancelPcp(c.id)}>
                            <XCircle className="w-4 h-4" /> Cancelar PCP
                          </Button>
                        </div>
                      </>
                    ) : (
                      <Button size="sm" variant="secondary" className="gap-2 font-bold" onClick={() => { setPcpText(""); setPcpDialog({ id: c.id, edit: false }); }}>
                        <Send className="w-4 h-4" /> PCP
                      </Button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
      <PcpQueue />
      </div>

      <Dialog open={!!pcpDialog} onOpenChange={(o) => { if (!o) setPcpDialog(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{pcpDialog?.edit ? "Editar observação ao PCP" : "Enviar chamado ao PCP"}</DialogTitle>
          </DialogHeader>
          <Textarea value={pcpText} onChange={(e) => setPcpText(e.target.value)} placeholder="Observação para o PCP (opcional)" rows={5} maxLength={500} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setPcpDialog(null)}>Cancelar</Button>
            <Button onClick={submitPcp}>{pcpDialog?.edit ? "Salvar" : "Enviar ao PCP"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}