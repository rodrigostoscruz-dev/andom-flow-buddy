import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { TopBar } from "@/components/andom/TopBar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Download } from "lucide-react";
import { formatDuration } from "@/lib/andom";

export const Route = createFileRoute("/relatorio")({ component: RelatorioPage });

type Call = {
  id: string;
  station_name: string;
  sector: string;
  reason: string;
  status: string;
  started_at: string;
  ended_at: string | null;
  duration_seconds: number | null;
};

function todayISO() { return new Date().toISOString().slice(0, 10); }
function daysAgoISO(n: number) { const d = new Date(); d.setDate(d.getDate() - n); return d.toISOString().slice(0, 10); }

function RelatorioPage() {
  const navigate = useNavigate();
  const [from, setFrom] = useState(daysAgoISO(7));
  const [to, setTo] = useState(todayISO());
  const [rows, setRows] = useState<Call[]>([]);
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return navigate({ to: "/login" });
      const { data: p } = await supabase.from("profiles").select("role").eq("id", session.user.id).single();
      if (!p || p.role === "producao") return navigate({ to: "/" });
      setRole(p.role);
    })();
  }, [navigate]);

  async function load() {
    const fromIso = new Date(from + "T00:00:00").toISOString();
    const toIso = new Date(to + "T23:59:59").toISOString();
    const { data } = await supabase
      .from("calls")
      .select("*")
      .gte("started_at", fromIso)
      .lte("started_at", toIso)
      .order("started_at", { ascending: false });
    setRows((data as Call[]) || []);
  }

  useEffect(() => { if (role) load(); /* eslint-disable-next-line */ }, [role]);

  function exportCSV() {
    const headers = ["Posto", "Setor", "Motivo", "Status", "Início", "Fim", "Duração (s)", "Duração"];
    const lines = rows.map((r) => [
      r.station_name,
      r.sector,
      r.reason,
      r.status,
      new Date(r.started_at).toLocaleString("pt-BR"),
      r.ended_at ? new Date(r.ended_at).toLocaleString("pt-BR") : "",
      r.duration_seconds ?? "",
      r.duration_seconds != null ? formatDuration(r.duration_seconds) : "",
    ]);
    const csv = [headers, ...lines]
      .map((row) => row.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(";"))
      .join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `andom_${from}_a_${to}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (!role) return null;

  return (
    <div className="min-h-screen">
      <TopBar title="Relatório de chamados" subtitle="Exportar para planilha (CSV / Excel)" />
      <main className="max-w-7xl mx-auto p-6 space-y-6">
        <div className="flex flex-wrap items-end gap-3 rounded-xl border border-white/10 bg-white/5 p-4">
          <div>
            <Label className="text-xs">De</Label>
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="bg-background/60 border-white/15" />
          </div>
          <div>
            <Label className="text-xs">Até</Label>
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="bg-background/60 border-white/15" />
          </div>
          <Button onClick={load} variant="outline" className="border-white/15">Filtrar</Button>
          <div className="flex-1" />
          <Button onClick={exportCSV} className="gap-2"><Download className="w-4 h-4" /> Exportar CSV</Button>
        </div>

        <div className="rounded-xl border border-white/10 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-white/5 text-left">
              <tr>
                <th className="px-4 py-3">Posto</th>
                <th className="px-4 py-3">Setor</th>
                <th className="px-4 py-3">Motivo</th>
                <th className="px-4 py-3">Início</th>
                <th className="px-4 py-3">Fim</th>
                <th className="px-4 py-3">Duração</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t border-white/10">
                  <td className="px-4 py-3 font-semibold">{r.station_name}</td>
                  <td className="px-4 py-3 capitalize">{r.sector}</td>
                  <td className="px-4 py-3">{r.reason}</td>
                  <td className="px-4 py-3 text-muted-foreground">{new Date(r.started_at).toLocaleString("pt-BR")}</td>
                  <td className="px-4 py-3 text-muted-foreground">{r.ended_at ? new Date(r.ended_at).toLocaleString("pt-BR") : "—"}</td>
                  <td className="px-4 py-3 font-mono">{r.duration_seconds != null ? formatDuration(r.duration_seconds) : "—"}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded text-xs font-semibold ${r.status === "ativo" ? "bg-red-500/20 text-red-300" : "bg-emerald-500/20 text-emerald-300"}`}>
                      {r.status}
                    </span>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">Nenhum registro no período</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}