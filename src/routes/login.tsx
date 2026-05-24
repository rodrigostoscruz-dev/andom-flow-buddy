import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { STATIONS, signInWithStation } from "@/lib/andom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export const Route = createFileRoute("/login")({ component: LoginPage });

function LoginPage() {
  const navigate = useNavigate();
  const [station, setStation] = useState("cabeca");
  const [password, setPassword] = useState("andom123");
  const [loading, setLoading] = useState(false);

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
        <div className="mb-6">
          <div className="text-xs uppercase tracking-[0.3em] text-primary/80">Projeto</div>
          <h1 className="text-4xl font-black tracking-tight">ANDOM</h1>
          <p className="text-sm text-muted-foreground mt-1">Sinalização da produção</p>
        </div>
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <Label className="text-foreground/90">Posto / Setor</Label>
            <select
              value={station}
              onChange={(e) => setStation(e.target.value)}
              className="mt-1 w-full h-10 rounded-md bg-background/60 border border-white/15 px-3 text-foreground"
            >
              <optgroup label="Produção">
                {STATIONS.filter((s) => s.role === "producao").map((s) => (
                  <option key={s.key} value={s.key}>{s.name}</option>
                ))}
              </optgroup>
              <optgroup label="Setores">
                {STATIONS.filter((s) => s.role === "almoxarifado" || s.role === "qualidade").map((s) => (
                  <option key={s.key} value={s.key}>{s.name}</option>
                ))}
              </optgroup>
              <optgroup label="Administrador">
                {STATIONS.filter((s) => s.role === "admin").map((s) => (
                  <option key={s.key} value={s.key}>{s.name}</option>
                ))}
              </optgroup>
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
          <p className="text-xs text-muted-foreground text-center">Senha padrão: <code className="text-foreground">andom123</code></p>
        </form>
      </div>
    </div>
  );
}