import { Link, useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { LogOut, FileSpreadsheet } from "lucide-react";

export function TopBar({ title, subtitle, showReport }: { title: string; subtitle?: string; showReport?: boolean }) {
  const navigate = useNavigate();
  async function logout() {
    await supabase.auth.signOut();
    navigate({ to: "/login" });
  }
  return (
    <header className="border-b border-white/10 bg-background/80 backdrop-blur sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center gap-4">
        <div className="flex-1">
          <div className="text-[10px] uppercase tracking-[0.3em] text-primary/80">Projeto Andom</div>
          <h1 className="text-xl font-bold leading-tight">{title}</h1>
          {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
        </div>
        {showReport && (
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