import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import rcLogo from "@/assets/rc-solutech-logo.png.asset.json";
import { signInWithStation, ROLE_LABELS, type Role } from "@/lib/andom";
import { useServerFn } from "@tanstack/react-start";
import { listStations } from "@/lib/stations.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export const Route = createFileRoute("/login")({ component: LoginPage });

type StationRow = { station_key: string; station_name: string; role: Role };

function LoginPage() {
  const navigate = useNavigate();
  const [station, setStation] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [stations, setStations] = useState<StationRow[]>([]);
  const fetchStations = useServerFn(listStations);

  useEffect(() => {
    (async () => {
      try {
        const data = (await fetchStations()) as StationRow[];
        setStations(data);
        if (data.length > 0) setStation(data[0].station_key);
      } catch (e) {
        console.error(e);
      }
    })();
  }, [fetchStations]);

  const GROUP_LABELS: Record<string, string> = {
    producao: "Produção",
    almoxarifado: "Almoxarifado",
    qualidade: "Qualidade",
    admin: "Administrador",
  };
  const GROUP_ORDER = ["producao", "almoxarifado", "qualidade", "admin"];
  function groupOf(role: Role): string {
    if (role === "almoxarifado" || role === "coord_almoxarifado" || role === "gerente_supply" || role === "diretor_industrial") return "almoxarifado";
    if (role === "qualidade" || role === "coord_qualidade") return "qualidade";
    if (role === "admin") return "admin";
    return "producao";
  }
  const grouped = stations.reduce<Record<string, StationRow[]>>((acc, s) => {
    const g = groupOf(s.role);
    (acc[g] ||= []).push(s);
    return acc;
  }, {});

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await signInWithStation(station, password);
    setLoading(false);
    if (error) return toast.error("Falha no login: " + error.message);
    navigate({ to: "/" });
  }

  return (
    <div className="min-h-screen grid place-items-center p-6 bg-gradient-to-br from-background to-[oklch(0.22_0.04_240)]">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/5 backdrop-blur p-8 shadow-2xl">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <div className="text-xs uppercase tracking-[0.3em] text-primary/80">Projeto</div>
            <h1 className="text-4xl font-black tracking-tight">ANDON</h1>
            <p className="text-sm text-muted-foreground mt-1">Sinalização da produção</p>
          </div>
          <img
            src={rcLogo.url}
            alt="RC SoluTech - desenvolvedora"
            className="h-28 w-28 rounded-lg object-contain bg-white ring-1 ring-white/15 shrink-0"
            title="Desenvolvido por RC SoluTech"
          />
        </div>
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <Label className="text-foreground/90">Posto / Setor</Label>
            <select
              value={station}
              onChange={(e) => setStation(e.target.value)}
              className="mt-1 w-full h-10 rounded-md bg-background/60 border border-white/15 px-3 text-foreground"
            >
              {GROUP_ORDER.filter((g) => grouped[g]?.length).map((g) => (
                <optgroup key={g} label={GROUP_LABELS[g]}>
                  {grouped[g].map((s) => (
                    <option key={s.station_key} value={s.station_key}>
                      {s.station_name}
                      {s.role !== g && s.role !== "producao" ? ` — ${ROLE_LABELS[s.role]}` : ""}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>
          <div>
            <Label className="text-foreground/90">Senha</Label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 bg-background/60 border-white/15"
            />
          </div>
          <Button type="submit" disabled={loading} className="w-full h-11 text-base font-semibold">
            {loading ? "Entrando…" : "Entrar"}
          </Button>
          <p className="text-xs text-muted-foreground text-center">Cada posto/setor tem uma senha definida pelo administrador.</p>
        </form>
      </div>
    </div>
  );
}