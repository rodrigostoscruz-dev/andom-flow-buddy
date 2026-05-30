import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  const navigate = useNavigate();
  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return navigate({ to: "/login" });
      const { data: profile } = await supabase.from("profiles").select("role").eq("id", session.user.id).single();
      if (!profile) return navigate({ to: "/login" });
      const r = profile.role;
      if (r === "producao") navigate({ to: "/posto" });
      else if (r === "admin") navigate({ to: "/admin" });
      else if (r === "almoxarifado" || r === "qualidade") navigate({ to: "/painel" });
      else navigate({ to: "/coordenador" });
    })();
  }, [navigate]);
  return (
    <div className="min-h-screen grid place-items-center text-muted-foreground">
      Carregando…
    </div>
  );
}
