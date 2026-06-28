-- 1. Desactivar disparador de marcas temporales de predicciones
ALTER TABLE public.full_tournament_predictions DISABLE TRIGGER tr_full_tournament_predictions_updated_at;

-- 2. Intercambiar llaves de predicción de la Parte 1 (Cuartos de Final)
UPDATE public.full_tournament_predictions
SET prediction_key = 'TEMP_QF_M98'
WHERE prediction_key = 'P1_QF_M98';

UPDATE public.full_tournament_predictions
SET prediction_key = 'P1_QF_M98'
WHERE prediction_key = 'P1_QF_M99';

UPDATE public.full_tournament_predictions
SET prediction_key = 'P1_QF_M99'
WHERE prediction_key = 'TEMP_QF_M98';

-- 3. Intercambiar llaves de predicción de la Parte 1 (Semifinales)
UPDATE public.full_tournament_predictions
SET prediction_key = 'TEMP_SF_M101'
WHERE prediction_key = 'P1_SF_M101';

UPDATE public.full_tournament_predictions
SET prediction_key = 'P1_SF_M101'
WHERE prediction_key = 'P1_SF_M102';

UPDATE public.full_tournament_predictions
SET prediction_key = 'P1_SF_M102'
WHERE prediction_key = 'TEMP_SF_M101';

-- 4. Reactivar disparador
ALTER TABLE public.full_tournament_predictions ENABLE TRIGGER tr_full_tournament_predictions_updated_at;

-- 5. Corregir IDs externos y fechas cruzadas de los partidos en la tabla 'matches'
-- Dieciseisavos: Partido 81 y 82
UPDATE public.matches
SET external_match_id = '537421',
    match_date = '2026-07-02T00:00:00+00:00',
    lock_time_part2 = '2026-07-01T23:00:00+00:00'
WHERE id = 81;

UPDATE public.matches
SET external_match_id = '537422',
    match_date = '2026-07-01T20:00:00+00:00',
    lock_time_part2 = '2026-07-01T19:00:00+00:00',
    home_team_id = null -- Limpiar el equipo incorrecto 'USA' de este partido
WHERE id = 82;

-- Octavos: Partido 89 y 90
UPDATE public.matches
SET external_match_id = '537375',
    match_date = '2026-07-04T17:00:00+00:00',
    lock_time_part2 = '2026-07-04T16:00:00+00:00'
WHERE id = 89;

UPDATE public.matches
SET external_match_id = '537376',
    match_date = '2026-07-04T21:00:00+00:00',
    lock_time_part2 = '2026-07-04T20:00:00+00:00'
WHERE id = 90;

-- 6. Limpiar selecciones no jugadas/erróneas que se sincronizaron incorrectamente
-- Por ejemplo, restablecer la final y el tercer puesto si tienen equipos mockeados
UPDATE public.matches
SET home_team_id = null,
    away_team_id = null
WHERE id >= 73 and id <= 104 AND id NOT IN (75, 79, 81, 87);
