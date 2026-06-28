-- Create trigger function first
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger AS $$
BEGIN
  -- Only update updated_at if user prediction data changes
  IF (lower(TG_TABLE_NAME) = 'phase_predictions') THEN
    IF (OLD.predicted_home_score IS DISTINCT FROM NEW.predicted_home_score OR
        OLD.predicted_away_score IS DISTINCT FROM NEW.predicted_away_score OR
        OLD.predicted_winner_team_id IS DISTINCT FROM NEW.predicted_winner_team_id) THEN
      NEW.updated_at := public.get_app_time();
    END IF;
  ELSIF (lower(TG_TABLE_NAME) = 'full_tournament_predictions') THEN
    IF (OLD.predicted_home_score IS DISTINCT FROM NEW.predicted_home_score OR
        OLD.predicted_away_score IS DISTINCT FROM NEW.predicted_away_score OR
        OLD.predicted_winner_team_id IS DISTINCT FROM NEW.predicted_winner_team_id OR
        OLD.predicted_home_team_id IS DISTINCT FROM NEW.predicted_home_team_id OR
        OLD.predicted_away_team_id IS DISTINCT FROM NEW.predicted_away_team_id) THEN
      NEW.updated_at := public.get_app_time();
    END IF;
  ELSIF (lower(TG_TABLE_NAME) = 'champion_predictions') THEN
    IF (OLD.champion_team_id IS DISTINCT FROM NEW.champion_team_id OR
        OLD.runner_up_team_id IS DISTINCT FROM NEW.runner_up_team_id OR
        OLD.third_place_team_id IS DISTINCT FROM NEW.third_place_team_id OR
        OLD.is_locked IS DISTINCT FROM NEW.is_locked) THEN
      NEW.updated_at := public.get_app_time();
    END IF;
  ELSE
    NEW.updated_at := public.get_app_time();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 1. Alter public.full_tournament_predictions
-- Add column as nullable first to allow backfill
ALTER TABLE public.full_tournament_predictions ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone;
-- Backfill
UPDATE public.full_tournament_predictions SET updated_at = created_at WHERE updated_at IS NULL;
-- Set default and add NOT NULL constraint
ALTER TABLE public.full_tournament_predictions ALTER COLUMN updated_at SET DEFAULT public.get_app_time();
ALTER TABLE public.full_tournament_predictions ALTER COLUMN updated_at SET NOT NULL;

-- 2. Alter public.phase_predictions
ALTER TABLE public.phase_predictions ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone;
UPDATE public.phase_predictions SET updated_at = created_at WHERE updated_at IS NULL;
ALTER TABLE public.phase_predictions ALTER COLUMN updated_at SET DEFAULT public.get_app_time();
ALTER TABLE public.phase_predictions ALTER COLUMN updated_at SET NOT NULL;

-- 3. Alter public.champion_predictions
ALTER TABLE public.champion_predictions ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone;
UPDATE public.champion_predictions SET updated_at = created_at WHERE updated_at IS NULL;
ALTER TABLE public.champion_predictions ALTER COLUMN updated_at SET DEFAULT public.get_app_time();
ALTER TABLE public.champion_predictions ALTER COLUMN updated_at SET NOT NULL;

-- 4. Create triggers BEFORE UPDATE
DROP TRIGGER IF EXISTS tr_full_tournament_predictions_updated_at ON public.full_tournament_predictions;
CREATE TRIGGER tr_full_tournament_predictions_updated_at
  BEFORE UPDATE ON public.full_tournament_predictions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS tr_phase_predictions_updated_at ON public.phase_predictions;
CREATE TRIGGER tr_phase_predictions_updated_at
  BEFORE UPDATE ON public.phase_predictions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS tr_champion_predictions_updated_at ON public.champion_predictions;
CREATE TRIGGER tr_champion_predictions_updated_at
  BEFORE UPDATE ON public.champion_predictions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
