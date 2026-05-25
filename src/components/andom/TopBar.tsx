import { Link, useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { LogOut, FileSpreadsheet } from "lucide-react";
import { useEffect, useState } from "react";

export function TopBar({ title, subtitle }: { title: string; subtitle?: string; showReport?: boolean }) {
  const navigate = useNavigate();
  const [role, setRole] = useState<string | null>(null);
  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const { data } = await supabase.from("profiles").select("role").eq("id", session.user.id).single();
      setRole(data?.role ?? null);
    })();
  }, []);
  async function logout() {
    await supabase.auth.signOut();
    navigate({ to: "/login" });
  }
  return (
    <header className="border-b border-white/10 bg-background/80 backdrop-blur sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center gap-4">
        <div className="flex-1">
          <div className="text-[10px] uppercase tracking-[0.3em] text-primary/80">Projeto Andon</div>
          <h1 className="text-xl font-bold leading-tight">{title}</h1>
          {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
        </div>
        {role === "admin" && (
          <Link to="/relatorio">
            <Button variant="outline" size="sm" className="gap-2 border-white/15">
              <FileSpreadsheet className="w-4 h-4" /> Relatório
            </Button>
          </Link>
        )}
        <Button onClick={logout} variant="ghost" size="sm" className="gap-2">
          <LogOut className="w-4 h-4" /> Sair
        </Button>
      </div>
    </header>
  );
}