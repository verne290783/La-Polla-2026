-- MILESTONE 2 MIGRATION: Database Schemas, RLS Policies & RPCs

-- 1. Database Schema Alteration
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS p1_unlocked_until timestamp with time zone;

-- 2. Define RPC admin_unlock_user_p1
CREATE OR REPLACE FUNCTION public.admin_unlock_user_p1(p_user_id uuid)
RETURNS void AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  
  UPDATE public.profiles
  SET p1_unlocked_until = public.get_app_time() + interval '24 hours'
  WHERE id = p_user_id;

  UPDATE public.champion_predictions
  SET is_locked = false
  WHERE user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Define RPC admin_lock_user_p1
CREATE OR REPLACE FUNCTION public.admin_lock_user_p1(p_user_id uuid)
RETURNS void AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  UPDATE public.profiles
  SET p1_unlocked_until = null
  WHERE id = p_user_id;

  UPDATE public.champion_predictions
  SET is_locked = true
  WHERE user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Define RPC recalculate_all_points
CREATE OR REPLACE FUNCTION public.recalculate_all_points()
RETURNS void AS $$
DECLARE
  r_match record;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  FOR r_match IN 
    SELECT id FROM public.matches 
    WHERE status IN ('finished', 'live') 
    ORDER BY match_date ASC, id ASC
  LOOP
    PERFORM public.compute_points(r_match.id);
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Update Database Trigger Function
CREATE OR REPLACE FUNCTION public.calculate_points_on_match_finish()
RETURNS trigger AS $$
BEGIN
  IF (new.status = 'finished' AND (old.status IS NULL OR old.status <> 'finished')) OR
     (new.status = 'finished' AND old.status = 'finished' AND 
      (new.home_score IS DISTINCT FROM old.home_score OR 
       new.away_score IS DISTINCT FROM old.away_score)) THEN
    PERFORM public.compute_points(new.id);
  END IF;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate trigger to ensure it uses the updated function
DROP TRIGGER IF EXISTS tr_calculate_points ON public.matches;
CREATE TRIGGER tr_calculate_points
  AFTER UPDATE ON public.matches
  FOR EACH ROW EXECUTE PROCEDURE public.calculate_points_on_match_finish();

-- 6. Update RLS policies
DROP POLICY IF EXISTS "Usuarios pueden modificar sus predicciones de la Parte 1" ON public.full_tournament_predictions;
DROP POLICY IF EXISTS "Usuarios pueden ver predicciones de otros si están bloqueadas o son propias" ON public.full_tournament_predictions;
DROP POLICY IF EXISTS "Usuarios pueden modificar sus campeones de la Parte 1" ON public.champion_predictions;
DROP POLICY IF EXISTS "Usuarios pueden ver campeones de otros si están bloqueados" ON public.champion_predictions;

CREATE POLICY "Usuarios pueden modificar sus predicciones de la Parte 1" 
  ON public.full_tournament_predictions FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id 
    AND (
      get_app_time() < '2026-06-11T20:00:00Z'::timestamp with time zone
      OR EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid()
        AND p1_unlocked_until IS NOT NULL
        AND p1_unlocked_until > get_app_time()
      )
    )
  );

CREATE POLICY "Usuarios pueden ver predicciones de otros si están bloqueadas o son propias"
  ON public.full_tournament_predictions FOR SELECT
  USING (
    auth.uid() = user_id
    OR (
      get_app_time() >= '2026-06-11T20:00:00Z'::timestamp with time zone
      AND NOT EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = full_tournament_predictions.user_id
        AND p1_unlocked_until IS NOT NULL
        AND p1_unlocked_until > get_app_time()
      )
    )
  );

CREATE POLICY "Usuarios pueden modificar sus campeones de la Parte 1"
  ON public.champion_predictions FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id
    AND (
      get_app_time() < '2026-06-11T20:00:00Z'::timestamp with time zone
      OR EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid()
        AND p1_unlocked_until IS NOT NULL
        AND p1_unlocked_until > get_app_time()
      )
    )
  );

CREATE POLICY "Usuarios pueden ver campeones de otros si están bloqueados"
  ON public.champion_predictions FOR SELECT
  USING (
    auth.uid() = user_id
    OR (
      get_app_time() >= '2026-06-11T20:00:00Z'::timestamp with time zone
      AND NOT EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = champion_predictions.user_id
        AND p1_unlocked_until IS NOT NULL
        AND p1_unlocked_until > get_app_time()
      )
    )
  );
