CREATE OR REPLACE FUNCTION public.admin_reopen_call(p_call_id uuid, p_stage text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF public."current_role"() <> 'admin'::user_role THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;
  IF p_stage NOT IN ('aguardando','atendimento') THEN
    RAISE EXCEPTION 'Etapa inválida';
  END IF;
  UPDATE public.calls SET
    status = 'ativo',
    ended_at = NULL,
    duration_seconds = NULL,
    acknowledged_at = CASE WHEN p_stage = 'atendimento' THEN COALESCE(acknowledged_at, now()) ELSE NULL END,
    acknowledged_by = CASE WHEN p_stage = 'atendimento' THEN acknowledged_by ELSE NULL END
  WHERE id = p_call_id AND status = 'encerrado';
  IF NOT FOUND THEN RAISE EXCEPTION 'Chamado não encontrado ou já aberto'; END IF;
END $$;
REVOKE ALL ON FUNCTION public.admin_reopen_call(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_reopen_call(uuid, text) TO authenticated;