import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { TopBar } from "@/components/andom/TopBar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Plus, Trash2, Save, X } from "lucide-react";
import {
  adminListStations,
  adminCreateStation,
  adminUpdateStation,
  adminDeleteStation,
  adminResetAllPasswords,
} from "@/lib/admin.functions";
import { ROLE_LABELS, ROLE_OPTIONS, type Role } from "@/lib/andom";
import { AdminOpenCalls } from "@/components/andom/AdminOpenCalls";

export const Route = createFileRoute("/admin")({ component: AdminPage });

type Station = {
  id: string;
  station_key: string;
  station_name: string;
  role: Role;
};

function AdminPage() {
  const navigate = useNavigate();
  const list = useServerFn(adminListStations);
  const create = useServerFn(adminCreateStation);
  const update = useServerFn(adminUpdateStation);
  const del = useServerFn(adminDeleteStation);
  const resetAll = useServerFn(adminResetAllPasswords);

  const [items, setItems] = useState<Station[]>([]);
  const [loading, setLoading] = useState(true);

  const [newKey, setNewKey] = useState("");
  const [newName, setNewName] = useState("");
  const [newRole, setNewRole] = useState<Role>("producao");
  const [newPass, setNewPass] = useState("");

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editRole, setEditRole] = useState<Role>("producao");
  const [editPass, setEditPass] = useState("");

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return navigate({ to: "/login" });
      const { data: p } = await supabase.from("profiles").select("role").eq("id", session.user.id).single();
      if (!p || p.role !== "admin") return navigate({ to: "/" });
      await refresh();
    })();
  }, [navigate]);

  async function refresh() {
    setLoading(true);
    try {
      const data = (await list()) as Station[];
      setItems(data);
    } catch (e: any) {
      toast.error(e.message ?? "Erro ao carregar");
    } finally {
      setLoading(false);
    }
  }

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newKey || !newName || !newPass) return toast.error("Preencha todos os campos");
    try {
      await create({ data: { stationKey: newKey.trim(), stationName: newName.trim(), role: newRole, password: newPass } });
      toast.success("Posto cadastrado");
      setNewKey(""); setNewName(""); setNewPass(""); setNewRole("producao");
      await refresh();
    } catch (e: any) { toast.error(e.message); }
  }

  function startEdit(s: Station) {
    setEditingId(s.id); setEditName(s.station_name); setEditRole(s.role); setEditPass("");
  }

  async function saveEdit(id: string) {
    try {
      await update({ data: { id, stationName: editName.trim(), role: editRole, password: editPass || undefined } });
      toast.success("Atualizado");
      setEditingId(null);
      await refresh();
    } catch (e: any) { toast.error(e.message); }
  }

  async function onDelete(id: string, name: string) {
    if (!confirm(`Excluir "${name}"?`)) return;
    try {
      await del({ data: { id } });
      toast.success("Excluído");
      await refresh();
    } catch (e: any) { toast.error(e.message); }
  }

  async function onResetAll() {
    if (!confirm("Resetar TODAS as senhas? Admin: 260194 | Demais usuários: 123456")) return;
    try {
      const r = (await resetAll()) as { count: number };
      toast.success(`${r.count} senha(s) resetada(s)`);
    } catch (e: any) { toast.error(e.message); }
  }

  return (
    <div className="min-h-screen">
      <TopBar title="Administração" subtitle="Cadastro de postos, setores e senhas" />
      <main className="max-w-6xl mx-auto p-6 space-y-8">
        <AdminOpenCalls />
        <section className="rounded-2xl border border-white/10 bg-white/5 p-4 flex items-center justify-between gap-4">
          <div>
            <h3 className="font-bold">Resetar senhas padrão</h3>
            <p className="text-xs text-muted-foreground">Admin volta para <code>260194</code> e todos os demais para <code>123456</code>.</p>
          </div>
          <Button variant="outline" onClick={onResetAll}>Resetar todas</Button>
        </section>
        <section className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2"><Plus className="w-5 h-5" /> Novo posto/setor</h2>
          <form onSubmit={onCreate} className="grid gap-3 md:grid-cols-5">
            <div>
              <Label>Chave (login)</Label>
              <Input value={newKey} onChange={(e) => setNewKey(e.target.value.toLowerCase())} placeholder="ex: cabeca" />
            </div>
            <div>
              <Label>Nome de exibição</Label>
              <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="ex: Cabeça" />
            </div>
            <div>
              <Label>Perfil</Label>
              <select value={newRole} onChange={(e) => setNewRole(e.target.value as Role)}
                className="mt-1 w-full h-10 rounded-md bg-background/60 border border-white/15 px-3">
                {ROLE_OPTIONS.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
              </select>
            </div>
            <div>
              <Label>Senha</Label>
              <Input type="text" value={newPass} onChange={(e) => setNewPass(e.target.value)} placeholder="mín 6 caracteres" />
            </div>
            <div className="flex items-end">
              <Button type="submit" className="w-full">Adicionar</Button>
            </div>
          </form>
          <p className="text-xs text-muted-foreground mt-2">A "chave" é usada no login: <code>chave@andom.app</code>. Apenas letras minúsculas, números, "-" ou "_".</p>
        </section>

        <section className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <h2 className="text-lg font-bold mb-4">Postos cadastrados ({items.length})</h2>
          {loading ? <p className="text-muted-foreground">Carregando…</p> : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-muted-foreground border-b border-white/10">
                  <tr><th className="p-2">Chave</th><th className="p-2">Nome</th><th className="p-2">Perfil</th><th className="p-2">Nova senha</th><th className="p-2 text-right">Ações</th></tr>
                </thead>
                <tbody>
                  {items.map((s) => (
                    <tr key={s.id} className="border-b border-white/5">
                      <td className="p-2 font-mono text-xs">{s.station_key}</td>
                      <td className="p-2">
                        {editingId === s.id ? (
                          <Input value={editName} onChange={(e) => setEditName(e.target.value)} className="h-8" />
                        ) : s.station_name}
                      </td>
                      <td className="p-2">
                        {editingId === s.id ? (
                          <select value={editRole} onChange={(e) => setEditRole(e.target.value as Role)}
                            className="h-8 rounded-md bg-background/60 border border-white/15 px-2">
                            {ROLE_OPTIONS.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
                          </select>
                        ) : ROLE_LABELS[s.role]}
                      </td>
                      <td className="p-2">
                        {editingId === s.id ? (
                          <Input value={editPass} onChange={(e) => setEditPass(e.target.value)} placeholder="(deixar vazio para manter)" className="h-8" />
                        ) : <span className="text-muted-foreground">—</span>}
                      </td>
                      <td className="p-2 text-right whitespace-nowrap">
                        {editingId === s.id ? (
                          <>
                            <Button size="sm" onClick={() => saveEdit(s.id)} className="gap-1 mr-2"><Save className="w-3 h-3" />Salvar</Button>
                            <Button size="sm" variant="ghost" onClick={() => setEditingId(null)} className="gap-1"><X className="w-3 h-3" /></Button>
                          </>
                        ) : (
                          <>
                            <Button size="sm" variant="outline" onClick={() => startEdit(s)} className="mr-2">Editar</Button>
                            <Button size="sm" variant="destructive" onClick={() => onDelete(s.id, s.station_name)} className="gap-1"><Trash2 className="w-3 h-3" /></Button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}