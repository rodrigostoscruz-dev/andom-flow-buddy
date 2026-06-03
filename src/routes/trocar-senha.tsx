import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export const Route = createFileRoute("/trocar-senha")({ component: TrocarSenhaPage });

function TrocarSenhaPage() {
  const navigate = useNavigate();
  const [stationName, setStationName] = useState("");
  const [forced, setForced] = useState(false);
  const [pw1, setPw1] = useState("");
  const [pw2, setPw2] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return navigate({ to: "/login" });
      const { data } = await supabase
        .from("profiles")
        .select("station_name, must_change_password")
        .eq("id", session.user.id)
        .single();
      if (data) {
        setStationName(data.station_name);
        setForced(!!data.must_change_password);
      }
    })();
  }, [navigate]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!/^\d{6}$/.test(pw1)) return toast.error("A senha deve conter exatamente 6 dígitos numéricos");
    if (pw1 !== pw2) return toast.error("As senhas não conferem");
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password: pw1 });
    if (error) { setLoading(false); return toast.error(error.message); }
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      const { error: pErr } = await supabase
        .from("profiles")
        .update({ must_change_password: false })
        .eq("id", session.user.id);
      if (pErr) { setLoading(false); return toast.error(pErr.message); }
    }
    setLoading(false);
    toast.success("Senha alterada");
    navigate({ to: "/" });
  }

  return (
    <div className="min-h-screen grid place-items-center p-6 bg-gradient-to-br from-background to-[oklch(0.22_0.04_240)]">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/5 backdrop-blur p-8 shadow-2xl">
        <div className="mb-6">
          <div className="text-xs uppercase tracking-[0.3em] text-primary/80">{stationName || "Conta"}</div>
          <h1 className="text-3xl font-black tracking-tight">Trocar senha</h1>
          {forced && (
            <p className="text-sm text-yellow-400 mt-2">Defina uma nova senha pessoal antes de continuar.</p>
          )}
        </div>
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <Label>Nova senha</Label>
            <Input type="password" inputMode="numeric" pattern="\d{6}" maxLength={6}
              value={pw1} onChange={(e) => setPw1(e.target.value.replace(/\D/g, ""))}
              className="mt-1 bg-background/60 border-white/15" />
          </div>
          <div>
            <Label>Confirmar nova senha</Label>
            <Input type="password" inputMode="numeric" pattern="\d{6}" maxLength={6}
              value={pw2} onChange={(e) => setPw2(e.target.value.replace(/\D/g, ""))}
              className="mt-1 bg-background/60 border-white/15" />
          </div>
          <p className="text-xs text-muted-foreground">A senha deve conter exatamente 6 dígitos numéricos.</p>
          <Button type="submit" disabled={loading} className="w-full h-11 text-base font-semibold">
            {loading ? "Salvando…" : "Salvar nova senha"}
          </Button>
          {!forced && (
            <Button type="button" variant="ghost" className="w-full" onClick={() => navigate({ to: "/" })}>
              Cancelar
            </Button>
          )}
        </form>
      </div>
    </div>
  );
}