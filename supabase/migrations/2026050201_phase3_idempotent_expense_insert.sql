-- Phase 3 Offline Tolerance: idempotent expense insert RPC
-- Requirement: INPUT-11

CREATE OR REPLACE FUNCTION public.save_expense_idempotent(
  p_household_id uuid,
  p_amount integer,
  p_category text,
  p_note text,
  p_spent_at timestamptz,
  p_client_id uuid
)
RETURNS TABLE (
  id uuid,
  amount integer,
  category text,
  note text,
  spent_at timestamptz,
  client_id uuid,
  household_id uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_expense public.expenses%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not authenticated' USING ERRCODE = '28000';
  END IF;

  IF NOT public.is_household_member(p_household_id, auth.uid()) THEN
    RAISE EXCEPTION 'household access denied' USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.expenses (
    household_id,
    created_by,
    amount,
    category,
    note,
    spent_at,
    client_id
  )
  VALUES (
    p_household_id,
    auth.uid(),
    p_amount,
    p_category,
    p_note,
    p_spent_at,
    p_client_id
  )
  ON CONFLICT (client_id) DO NOTHING
  RETURNING *
  INTO v_expense;

  IF v_expense.id IS NULL THEN
    SELECT *
    INTO v_expense
    FROM public.expenses existing
    WHERE existing.client_id = p_client_id
      AND existing.household_id = p_household_id
      AND existing.is_deleted = false;
  END IF;

  IF v_expense.id IS NULL THEN
    RETURN;
  END IF;

  id := v_expense.id;
  amount := v_expense.amount;
  category := v_expense.category;
  note := v_expense.note;
  spent_at := v_expense.spent_at;
  client_id := v_expense.client_id;
  household_id := v_expense.household_id;
  RETURN NEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.save_expense_idempotent(uuid, integer, text, text, timestamptz, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.save_expense_idempotent(uuid, integer, text, text, timestamptz, uuid) TO authenticated;
