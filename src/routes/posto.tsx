import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { REASONS } from "@/lib/andom";
import { TopBar } from "@/components/andom/TopBar";
import { Timer } from "@/components/andom/Timer";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { AlertCircle, Package, Boxes, ShieldCheck, PackageX, X, CheckCircle2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Pencil } from "lucide-react";

export const Route = createFileRoute("/posto")({ component: PostoPage });

type Profile = { id: string; station_name: string; role: string };
type Call = {
  id: string;
  reason: string;
  color: string;
  sector: "almoxarifado" | "qualidade";
  started_at: string;
  status: string;
  acknowledged_at: string | null;
  observation: string | null;
};

const ICONS: Record<string, any> = {
  parado: AlertCircle,
  "abast-posto": Package,
  "abast-kanban": Boxes,
  qualidade: ShieldCheck,
  "separacao-errada": PackageX,
};

function PostoPage() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [active, setActive] = useState<Call[]>([]);
  const [obsDialog, setObsDialog] = useState<null | {
    sector: "almoxarifado" | "qualidade";
    reasonId: string;
    label: string;
    color: "red" | "orange" | "yellow";
  }>(null);
  const [obsText, setObsText] = useState("");
  const [editObs, setEditObs] = useState<null | { id: string; reason: string }>(null);
  const [editText, setEditText] = useState("");

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return navigate({ to: "/login" });
      const { data: p } = await supabase.from("profiles").select("*").eq("id", session.user.id).single();
      if (!p) return navigate({ to: "/login" });
      if (p.role !== "producao") return navigate({ to: "/painel" });
      setProfile(p as Profile);
      await refresh(p.id);
    })();
  }, [navigate]);

  async function refresh(stationId: string) {
    const { data } = await supabase
      .from("calls")
      .select("*")
      .eq("station_id", stationId)
      .eq("status", "ativo")
      .order("started_at", { ascending: false });
    setActive((data as Call[]) || []);
  }

  useEffect(() => {
    if (!profile) return;
    const ch = supabase
      .channel("posto-calls-" + profile.id)
      .on("postgres_changes", { event: "*", schema: "public", table: "calls", filter: `station_id=eq.${profile.id}` },
        () => refresh(profile.id))
      .subscribe();
    const i = window.setInterval(() => refresh(profile.id), 3 * 60 * 1000);
    return () => { supabase.removeChannel(ch); window.clearInterval(i); };
  }, [profile]);

  async function call(
    sector: "almoxarifado" | "qualidade",
    reasonId: string,
    label: string,
    color: "red" | "orange" | "yellow",
    observation?: string,
  ) {
    if (!profile) return;
    const { error } = await supabase.from("calls").insert({
      station_id: profile.id,
      station_name: profile.station_name,
      sector,
      reason: label,
      color,
      observation: observation?.trim() ? observation.trim() : null,
    });
    if (error) toast.error(error.message);
    else toast.success("Chamado enviado");
  }

  function handleReasonClick(
    sector: "almoxarifado" | "qualidade",
    reasonId: string,
    label: string,
    color: "red" | "orange" | "yellow",
  ) {
    setObsText("");
    setObsDialog({ sector, reasonId, label, color });
  }


  async function saveObservation() {
    if (!editObs || !profile) return;
    const { error } = await supabase
      .from("calls")
      .update({ observation: editText.trim() ? editText.trim() : null })
      .eq("id", editObs.id)
      .eq("station_id", profile.id);
    if (error) toast.error(error.message);
    else {
      toast.success("Observação atualizada");
      setEditObs(null);
      refresh(profile.id);
    }
  }

  async function close(id: string) {
    const { error } = await supabase.from("calls").update({ status: "encerrado", ended_at: new Date().toISOString() }).eq("id", id);
    if (error) toast.error(error.message);
    else toast.success("Chamado encerrado");
  }

  if (!profile) return null;

  return (
    <div className="min-h-screen">
      <TopBar title={profile.station_name} subtitle="Posto de produção" />
      <main className="max-w-7xl mx-auto p-6 space-y-8">
        {/* Active calls / blinking panels */}
        {active.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-sm uppercase tracking-widest text-muted-foreground">Chamados ativos</h2>
            <div className="grid gap-3 md:grid-cols-2">
              {active.map((c) => (
                <div
                  key={c.id}
                  className={`rounded-2xl p-6 shadow-xl ${c.acknowledged_at ? "bg-[oklch(0.35_0.08_240)] text-white" : c.color === "red" ? "andom-blink-red" : c.color === "yellow" ? "andom-blink-yellow" : "andom-blink-orange"}`}
                >
                  <div className="flex items-start gap-4">
                    <div className="flex-1">
                      <div className="text-xs uppercase tracking-widest opacity-80">{c.sector}</div>
                      <div className="text-2xl font-black leading-tight">{profile.station_name}</div>
                      <div className="text-sm font-medium mt-1">{c.reason}</div>
                      <div className="text-3xl font-bold mt-3"><Timer startedAt={c.started_at} /></div>
                      {c.observation && (
                        <div className="mt-2 text-sm bg-black/20 rounded-md px-2 py-1 whitespace-pre-wrap">{c.observation}</div>
                      )}
                      <Button
                        onClick={() => { setEditText(c.observation ?? ""); setEditObs({ id: c.id, reason: c.reason }); }}
                        size="sm"
                        variant="secondary"
                        className="mt-3 gap-2 font-semibold"
                      >
                        <Pencil className="w-4 h-4" /> {c.observation ? "Editar observação" : "Adicionar observação"}
                      </Button>
                      {c.acknowledged_at && (
                        <div className="mt-2 inline-flex items-center gap-2 bg-white/20 rounded-md px-2 py-1 text-xs">
                          <CheckCircle2 className="w-3 h-3" /> Setor a caminho
                        </div>
                      )}
                    </div>
                    <Button onClick={() => close(c.id)} size="lg" variant="secondary" className="gap-2 font-bold">
                      <X className="w-5 h-5" /> Encerrar
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Call buttons */}
        <section>
          <h2 className="text-sm uppercase tracking-widest text-muted-foreground mb-3">Almoxarifado</h2>
          <div className="grid gap-3 md:grid-cols-3">
            {REASONS.almoxarifado.map((r) => {
              const Icon = ICONS[r.id];
              const bg = r.color === "red"
                ? "bg-[oklch(0.55_0.25_27)] hover:bg-[oklch(0.6_0.25_27)]"
                : r.color === "yellow"
                ? "bg-[oklch(0.82_0.17_85)] hover:bg-[oklch(0.88_0.17_85)] text-[oklch(0.15_0.05_50)]"
                : "bg-[oklch(0.72_0.18_55)] hover:bg-[oklch(0.78_0.18_55)] text-[oklch(0.15_0.05_50)]";
              return (
                <button
                  key={r.id}
                  onClick={() => handleReasonClick("almoxarifado", r.id, r.label, r.color)}
                  className={`${bg} text-white rounded-2xl p-6 text-left shadow-lg transition-all hover:scale-[1.02] active:scale-[0.98]`}
                >
                  <Icon className="w-8 h-8 mb-3" />
                  <div className="font-bold text-lg leading-tight">{r.label}</div>
                </button>
              );
            })}
          </div>
        </section>
        <section>
          <h2 className="text-sm uppercase tracking-widest text-muted-foreground mb-3">Qualidade</h2>
          <div className="grid gap-3 md:grid-cols-3">
            {REASONS.qualidade.map((r) => {
              const Icon = ICONS[r.id];
              return (
                <button
                  key={r.id}
                  onClick={() => handleReasonClick("qualidade", r.id, r.label, r.color)}
                  className="bg-[oklch(0.55_0.25_27)] hover:bg-[oklch(0.6_0.25_27)] text-white rounded-2xl p-6 text-left shadow-lg transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                  <Icon className="w-8 h-8 mb-3" />
                  <div className="font-bold text-lg leading-tight">{r.label}</div>
                </button>
              );
            })}
          </div>
        </section>
      </main>

      <Dialog open={!!obsDialog} onOpenChange={(open) => { if (!open) setObsDialog(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Observação — {obsDialog?.label}</DialogTitle>
          </DialogHeader>
          <Textarea
            value={obsText}
            onChange={(e) => setObsText(e.target.value)}
            placeholder="Descreva o que está acontecendo (opcional)"
            rows={5}
            maxLength={500}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setObsDialog(null)}>Cancelar</Button>
            <Button
              onClick={() => {
                if (!obsDialog) return;
                const d = obsDialog;
                setObsDialog(null);
                call(d.sector, d.reasonId, d.label, d.color, obsText);
              }}
            >
              Enviar chamado
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editObs} onOpenChange={(open) => { if (!open) setEditObs(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar observação — {editObs?.reason}</DialogTitle>
          </DialogHeader>
          <Textarea
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            placeholder="Descreva o que está acontecendo"
            rows={5}
            maxLength={500}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditObs(null)}>Cancelar</Button>
            <Button onClick={saveObservation}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}