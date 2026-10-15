ALTER TABLE public.calls
  ADD COLUMN IF NOT EXISTS pcp_status text,
  ADD COLUMN IF NOT EXISTS pcp_observation text,
  ADD COLUMN IF NOT EXISTS pcp_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS pcp_received_at timestamptz,
  ADD COLUMN IF NOT EXISTS pcp_cancelled_at timestamptz;

CREATE POLICY calls_select_pcp ON public.calls FOR SELECT TO authenticated
  USING (public."current_role"() = 'pcp'::user_role AND pcp_status IS NOT NULL);

CREATE OR REPLACE FUNCTION public.is_almox_group() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public."current_role"() IN ('almoxarifado','coord_almoxarifado','gerente_supply','diretor_industrial','admin')
$$;

CREATE OR REPLACE FUNCTION public.send_to_pcp(p_call_id uuid, p_observation text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_almox_group() THEN RAISE EXCEPTION 'Sem permissão'; END IF;
  UPDATE public.calls SET pcp_status = 'aguardando', pcp_observation = NULLIF(btrim(left(coalesce(p_observation,''),500)),''),
    pcp_sent_at = now(), pcp_received_at = NULL, pcp_cancelled_at = NULL
  WHERE id = p_call_id AND sector = 'almoxarifado' AND status = 'ativo';
  IF NOT FOUND THEN RAISE EXCEPTION 'Chamado não encontrado ou encerrado'; END IF;
END $$;

CREATE OR REPLACE FUNCTION public.update_pcp_observation(p_call_id uuid, p_observation text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_almox_group() THEN RAISE EXCEPTION 'Sem permissão'; END IF;
  UPDATE public.calls SET pcp_observation = NULLIF(btrim(left(coalesce(p_observation,''),500)),'')
  WHERE id = p_call_id AND pcp_status IN ('aguardando','recebido') AND status = 'ativo';
END $$;

CREATE OR REPLACE FUNCTION public.cancel_pcp(p_call_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_almox_group() THEN RAISE EXCEPTION 'Sem permissão'; END IF;
  UPDATE public.calls SET pcp_status = 'cancelado', pcp_cancelled_at = now()
  WHERE id = p_call_id AND pcp_status IN ('aguardando','recebido');
END $$;

CREATE OR REPLACE FUNCTION public.pcp_receive(p_call_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF public."current_role"() NOT IN ('pcp','admin') THEN RAISE EXCEPTION 'Sem permissão'; END IF;
  UPDATE public.calls SET pcp_status = 'recebido', pcp_received_at = now()
  WHERE id = p_call_id AND pcp_status = 'aguardando';
END $$;

CREATE OR REPLACE FUNCTION public.pcp_queue()
RETURNS TABLE(id uuid, station_name text, reason text, started_at timestamptz, pcp_status text, pcp_observation text, pcp_sent_at timestamptz, pcp_received_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT c.id, c.station_name, c.reason, c.started_at, c.pcp_status, c.pcp_observation, c.pcp_sent_at, c.pcp_received_at
  FROM public.calls c
  WHERE auth.uid() IS NOT NULL AND c.status = 'ativo' AND c.pcp_status IN ('aguardando','recebido')
  ORDER BY c.pcp_sent_at ASC
$$;

REVOKE EXECUTE ON FUNCTION public.send_to_pcp(uuid,text), public.update_pcp_observation(uuid,text), public.cancel_pcp(uuid), public.pcp_receive(uuid), public.pcp_queue(), public.is_almox_group() FROM anon, public;
GRANT EXECUTE ON FUNCTION public.send_to_pcp(uuid,text), public.update_pcp_observation(uuid,text), public.cancel_pcp(uuid), public.pcp_receive(uuid), public.pcp_queue(), public.is_almox_group() TO authenticated;

CREATE OR REPLACE FUNCTION public.only_station_closes() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status = 'encerrado' AND OLD.status <> 'encerrado'
     AND auth.uid() IS NOT NULL AND auth.uid() <> OLD.station_id THEN
    RAISE EXCEPTION 'Somente o posto de produção pode finalizar o chamado';
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_only_station_closes ON public.calls;
CREATE TRIGGER trg_only_station_closes BEFORE UPDATE ON public.calls
  FOR EACH ROW EXECUTE FUNCTION public.only_station_closes();