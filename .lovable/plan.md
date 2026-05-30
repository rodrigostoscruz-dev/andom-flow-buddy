## Visão geral

Adicionar 4 novos perfis de coordenação/direção com escalonamento automático por tempo, uma tela de Administrador para cadastrar postos/setores e senhas, mudar a regra de alarme para 30 min (em vez de 3 min), e adicionar um botão "Em Atendimento" para Almoxarifado/Qualidade sinalizarem que viram o chamado.

---

## 1. Banco de dados (migração)

- Estender o enum `user_role` com: `coord_qualidade`, `coord_almoxarifado`, `gerente_supply`, `diretor_industrial`.
- Estender o enum `call_sector` se necessário (já tem `almoxarifado` e `qualidade`, então OK).
- Tabela `calls`: adicionar colunas:
  - `acknowledged_at timestamptz` (quando o setor clicou em "Em Atendimento")
  - `acknowledged_by uuid` (id do usuário que reconheceu)
- Atualizar a policy `calls_select_scoped` para incluir os novos perfis:
  - `coord_qualidade` vê chamados de qualidade ativos com `started_at < now() - interval '30 min'`
  - `coord_almoxarifado` vê chamados de almoxarifado ativos com `started_at < now() - interval '60 min'`
  - `gerente_supply` vê chamados de almoxarifado ativos com `started_at < now() - interval '24h'`
  - `diretor_industrial` vê chamados de almoxarifado ativos com `started_at < now() - interval '72h'`
  - admin vê tudo (já existe)
- Permitir UPDATE de `acknowledged_at` para os perfis de setor/coordenação/admin via nova policy.
- Permitir ao admin gerenciar `profiles` (UPDATE para station_name, role; INSERT/DELETE via funções RPC com `security definer` que também criam o usuário em `auth.users`).

Observação: para o ADM criar usuários novos (auth.users + profile + senha), criar uma função `security definer` `admin_create_station(station_key, station_name, role, password)` que usa o admin API. Como isso requer service_role, vamos criar uma **server function TanStack** com `supabaseAdmin` em vez de SQL, e proteger via verificação de `role = 'admin'` do chamador.

## 2. Server functions (`src/lib/admin.functions.ts`)

- `adminListStations()` — lista todos os profiles (somente admin).
- `adminCreateStation({ stationKey, stationName, role, password })` — cria usuário em `auth.users` e profile.
- `adminUpdateStation({ id, stationName, role, password? })` — atualiza profile e opcionalmente troca senha.
- `adminDeleteStation({ id })` — deleta auth user (cascata remove profile).

Cada uma valida que o caller tem `role='admin'` via `requireSupabaseAuth` + checagem no DB com `supabaseAdmin`.

Wire `attachSupabaseAuth` em `src/start.ts` se ainda não estiver.

## 3. Senha do ADM

Verificar/atualizar a senha do usuário `admin@andom.app` para `260194` via uma migração one-off ou pedir ao usuário para fazer login com a senha padrão `andom123` e trocar pela tela do admin. Vou incluir um insert no usuário admin com a senha 260194 via supabase admin API em uma migração de seed.

## 4. Frontend — novas rotas

- `src/routes/admin.tsx` — tela do administrador: lista de postos, criar/editar/excluir, definir senha.
- `src/routes/coordenador.tsx` — painel para os 4 perfis novos (reutiliza layout do painel mas filtra por tempo decorrido; o backend já filtra via RLS).
- Atualizar `src/routes/index.tsx` para redirecionar cada role para a rota correta:
  - `admin` → `/admin`
  - `coord_*`, `gerente_supply`, `diretor_industrial` → `/coordenador`
  - `almoxarifado`/`qualidade` → `/painel`
  - `producao` → `/posto`

## 5. Botão "Em Atendimento" (painel almox/qualidade)

Em `src/routes/painel.tsx`:
- Em cada card de chamado, adicionar botão "Em Atendimento" (escondido se já reconhecido) que faz UPDATE `acknowledged_at=now(), acknowledged_by=auth.uid()`.
- Card mostra badge "Em atendimento" quando `acknowledged_at` está preenchido.
- O chamado NÃO sai da tela — só sai quando o posto encerra (status='encerrado').

Em `src/routes/posto.tsx`:
- Quando `acknowledged_at` estiver setado no chamado ativo, mostrar badge "Setor a caminho" e parar de piscar tão intensamente (usar fundo sólido em vez de blink).

## 6. Regra de alarme (10s on / 30min off)

Em `src/routes/painel.tsx` (e nova `coordenador.tsx`):
- Trocar `3 * 60 * 1000` por `30 * 60 * 1000` no `setInterval`.
- Manter os 10s de bipes iniciais.

## 7. STATIONS estático → dinâmico

A lista `STATIONS` em `src/lib/andom.ts` hoje é hardcoded e usada apenas no login. Substituir o `<select>` do login por uma query a `profiles` (somente `station_key` e `station_name`) — exposta via server function pública (sem auth, com supabaseAdmin) para listar postos no dropdown. Isso permite que postos criados pelo ADM apareçam automaticamente.

---

## Pontos para confirmar

1. A regra "10s on / 30min off" vale para TODOS os painéis (almox, qualidade, coordenadores, diretor)? Vou aplicar para todos.
2. Para coordenadores/gerente/diretor: a contagem do tempo (30/60/1440/4320 min) usa `started_at` do chamado (independente de o setor ter reconhecido)? Assumindo SIM — escalonamento por tempo total em aberto.
3. Diretor Industrial e Gerente Supply Chain monitoram só chamados de **Almoxarifado** (conforme texto). Confirmado.

Se concorda, aplico as mudanças. Senão, me diga ajustes antes de eu começar.