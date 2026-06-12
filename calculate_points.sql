-- FUNCIÓN DE CÓMPUTO DE PUNTOS AUTOMÁTICA EN SUPABASE
-- Se ejecuta cuando un partido pasa a 'finished'

create or replace function public.compute_points(p_match_id int)
returns void as $$
declare
  r_match record;
  r_pred record;
  v_pts int;
  v_is_group boolean;
  
  -- Variables de partido real
  v_ah int; -- Actual Home Goals
  v_aa int; -- Actual Away Goals
  v_aw text; -- Actual Winner ID
  v_al text; -- Actual Loser ID
  
  -- Variables de predicción
  v_ph int; -- Predicted Home Goals
  v_pa int; -- Predicted Away Goals
  v_pw text; -- Predicted Winner ID
  v_pred_key text;
begin
  -- 1. Obtener detalles del partido real
  select * into r_match from public.matches where id = p_match_id;
  if not found then
    return;
  end if;

  v_ah := r_match.home_score;
  v_aa := r_match.away_score;
  v_is_group := (r_match.phase = 'group');

  -- Determinar ganador y perdedor real
  if v_ah > v_aa then
    v_aw := r_match.home_team_id;
    v_al := r_match.away_team_id;
  elsif v_ah < v_aa then
    v_aw := r_match.away_team_id;
    v_al := r_match.home_team_id;
  else
    -- Empate
    v_aw := r_match.winner_team_id; -- Definido por penales/prórroga si aplica
    if v_aw = r_match.home_team_id then
      v_al := r_match.away_team_id;
    elsif v_aw = r_match.away_team_id then
      v_al := r_match.home_team_id;
    else
      v_aw := null;
      v_al := null;
    end if;
  end if;

  -- Adjust actual scores for prediction comparison based on extra time rule
  if (r_match.phase <> 'group') and (r_match.home_score_90 is not null) and (r_match.away_score_90 is not null) and (r_match.home_score_90 = r_match.away_score_90) then
    -- Knockout match that went to extra time: compare against 120-minute score (home_score / away_score)
    v_ah := r_match.home_score;
    v_aa := r_match.away_score;
  else
    -- Otherwise compare against 90-minute score, falling back to home_score / away_score
    v_ah := coalesce(r_match.home_score_90, r_match.home_score);
    v_aa := coalesce(r_match.away_score_90, r_match.away_score);
  end if;

  -- =====================================================================
  -- 2. CALCULAR PUNTOS PARA PARTE 2 ( phase_predictions - En vivo )
  -- =====================================================================
  for r_pred in select * from public.phase_predictions where match_id = p_match_id loop
    v_pts := 0;
    v_ph := r_pred.predicted_home_score;
    v_pa := r_pred.predicted_away_score;

    -- Determinar ganador previsto
    if v_ph > v_pa then
      v_pw := r_match.home_team_id;
    elsif v_ph < v_pa then
      v_pw := r_match.away_team_id;
    else
      v_pw := r_pred.predicted_winner_team_id;
    end if;

    -- Lógica de puntuación
    if v_is_group then
      -- FASE DE GRUPOS
      if v_ah = v_aa then
        -- Partido real terminó en empate
        if v_ph = v_pa then
          v_pts := 1; -- Acertar empate
          if v_ph = v_ah then
            v_pts := v_pts + 1; -- Goles equipo 1
          end if;
          if v_pa = v_aa then
            v_pts := v_pts + 1; -- Goles equipo 2
          end if;
        end if;
      else
        -- Partido real tuvo un ganador
        if v_pw = v_aw then
          v_pts := 1; -- Acertar ganador
          
          -- Goles del ganador
          if (v_aw = r_match.home_team_id and v_ph = v_ah) or (v_aw = r_match.away_team_id and v_pa = v_aa) then
            v_pts := v_pts + 3;
          end if;
          -- Goles del perdedor
          if (v_al = r_match.home_team_id and v_ph = v_ah) or (v_al = r_match.away_team_id and v_pa = v_aa) then
            v_pts := v_pts + 2;
          end if;
        else
          -- Ganador incorrecto, pero evaluar goles individualmente por si acaso
          if (v_aw = r_match.home_team_id and v_ph = v_ah) or (v_aw = r_match.away_team_id and v_pa = v_aa) then
            v_pts := v_pts + 3;
          end if;
          if (v_al = r_match.home_team_id and v_ph = v_ah) or (v_al = r_match.away_team_id and v_pa = v_aa) then
            v_pts := v_pts + 2;
          end if;
        end if;
      end if;
    else
      -- FASES ELIMINATORIAS (Siempre tienen definición)
      if v_pw = v_aw then
        v_pts := 1; -- Acertar ganador definitivo
      end if;

      -- Evaluar goles regular 90 min (o 120 min con prórroga si empataron a los 90 min) para el que avanzó
      if (v_aw = r_match.home_team_id and v_ph = v_ah) or (v_aw = r_match.away_team_id and v_pa = v_aa) then
        v_pts := v_pts + 3;
      end if;
      -- Evaluar goles regular 90 min (o 120 min con prórroga si empataron a los 90 min) para el que fue eliminado
      if (v_al = r_match.home_team_id and v_ph = v_ah) or (v_al = r_match.away_team_id and v_pa = v_aa) then
        v_pts := v_pts + 2;
      end if;
    end if;

    -- Actualizar predicción
    update public.phase_predictions
    set points_earned = v_pts
    where user_id = r_pred.user_id and pool_id = r_pred.pool_id and match_id = p_match_id;
  end loop;

  -- =====================================================================
  -- 3. CALCULAR PUNTOS PARA PARTE 1 ( full_tournament_predictions - Wizard )
  -- =====================================================================
  if p_match_id <= 72 then
    v_pred_key := 'G_' || p_match_id;
  elsif p_match_id <= 88 then
    v_pred_key := 'P1_R32_M' || p_match_id;
  elsif p_match_id <= 96 then
    v_pred_key := 'P1_R16_M' || p_match_id;
  elsif p_match_id <= 100 then
    v_pred_key := 'P1_QF_M' || p_match_id;
  elsif p_match_id <= 104 then
    v_pred_key := 'P1_SF_M' || p_match_id;
  else
    v_pred_key := 'M' || p_match_id;
  end if;

  for r_pred in 
    select * from public.full_tournament_predictions 
    where prediction_key = v_pred_key
  loop
    v_pts := 0;

    -- Verificar si los equipos que el usuario predijo coinciden con los reales de este partido
    if (
      (r_pred.predicted_home_team_id = r_match.home_team_id and r_pred.predicted_away_team_id = r_match.away_team_id)
      or
      (r_pred.predicted_home_team_id = r_match.away_team_id and r_pred.predicted_away_team_id = r_match.home_team_id)
    ) then
      
      v_ph := r_pred.predicted_home_score;
      v_pa := r_pred.predicted_away_score;

      if r_pred.predicted_home_team_id = r_match.away_team_id then
        v_ph := r_pred.predicted_away_score;
        v_pa := r_pred.predicted_home_score;
      end if;

      -- Determinar ganador previsto
      if v_ph > v_pa then
        v_pw := r_match.home_team_id;
      elsif v_ph < v_pa then
        v_pw := r_match.away_team_id;
      else
        v_pw := r_pred.predicted_winner_team_id;
      end if;

      -- Lógica de puntuación
      if v_is_group then
        if v_ah = v_aa then
          if v_ph = v_pa then
            v_pts := 1;
            if v_ph = v_ah then v_pts := v_pts + 1; end if;
            if v_pa = v_aa then v_pts := v_pts + 1; end if;
          end if;
        else
          if v_pw = v_aw then
            v_pts := 1;
            if (v_aw = r_match.home_team_id and v_ph = v_ah) or (v_aw = r_match.away_team_id and v_pa = v_aa) then
              v_pts := v_pts + 3;
            end if;
            if (v_al = r_match.home_team_id and v_ph = v_ah) or (v_al = r_match.away_team_id and v_pa = v_aa) then
              v_pts := v_pts + 2;
            end if;
          else
            if (v_aw = r_match.home_team_id and v_ph = v_ah) or (v_aw = r_match.away_team_id and v_pa = v_aa) then
              v_pts := v_pts + 3;
            end if;
            if (v_al = r_match.home_team_id and v_ph = v_ah) or (v_al = r_match.away_team_id and v_pa = v_aa) then
              v_pts := v_pts + 2;
            end if;
          end if;
        end if;
      else
        if v_pw = v_aw then
          v_pts := 1;
        end if;
        if (v_aw = r_match.home_team_id and v_ph = v_ah) or (v_aw = r_match.away_team_id and v_pa = v_aa) then
          v_pts := v_pts + 3;
        end if;
        if (v_al = r_match.home_team_id and v_ph = v_ah) or (v_al = r_match.away_team_id and v_pa = v_aa) then
          v_pts := v_pts + 2;
        end if;
      end if;

      -- Actualizar predicción
      update public.full_tournament_predictions
      set points_earned = v_pts
      where user_id = r_pred.user_id and pool_id = r_pred.pool_id and prediction_key = r_pred.prediction_key;

    else
      update public.full_tournament_predictions
      set points_earned = 0
      where user_id = r_pred.user_id and pool_id = r_pred.pool_id and prediction_key = r_pred.prediction_key;
    end if;
  end loop;

  -- =====================================================================
  -- 4. CALCULAR PUNTOS DE BONUS DE CAMPEONES (Al finalizar el mundial)
  -- =====================================================================
  if p_match_id = 104 then
    for r_pred in select * from public.champion_predictions loop
      v_pts := 0;
      
      -- Campeón (+5)
      if r_pred.champion_team_id = v_aw then
        v_pts := v_pts + 5;
      end if;
      -- Subcampeón (+3)
      if r_pred.runner_up_team_id = v_al then
        v_pts := v_pts + 3;
      end if;
      -- Tercer lugar (+2)
      declare
        v_third_winner text;
      begin
        select winner_team_id into v_third_winner from public.matches where id = 103;
        if r_pred.third_place_team_id = v_third_winner then
          v_pts := v_pts + 2;
        end if;
      end;

      update public.champion_predictions
      set points_earned = v_pts
      where user_id = r_pred.user_id and pool_id = r_pred.pool_id;
    end loop;
  end if;

  -- =====================================================================
  -- 5. RECALCULAR TOTALES POR USUARIO Y POR GRUPO (En pool_members)
  -- =====================================================================
  declare
    r_member record;
    v_total_p1 int;
    v_total_p2 int;
    v_bonus int;
  begin
    for r_member in select pool_id, user_id from public.pool_members loop
      -- Suma Parte 1 en ese grupo
      select coalesce(sum(points_earned), 0) into v_total_p1 
      from public.full_tournament_predictions 
      where user_id = r_member.user_id and pool_id = r_member.pool_id;

      IF v_total_p1 IS NULL THEN
        v_total_p1 := 0;
      END IF;

      -- Suma Parte 2 en ese grupo
      select coalesce(sum(points_earned), 0) into v_total_p2 
      from public.phase_predictions 
      where user_id = r_member.user_id and pool_id = r_member.pool_id;

      IF v_total_p2 IS NULL THEN
        v_total_p2 := 0;
      END IF;

      -- Bonus campeones en ese grupo
      select coalesce(points_earned, 0) into v_bonus 
      from public.champion_predictions 
      where user_id = r_member.user_id and pool_id = r_member.pool_id;

      IF v_bonus IS NULL THEN
        v_bonus := 0;
      END IF;

      v_total_p1 := v_total_p1 + v_bonus;

      -- Actualizar record en pool_members
      update public.pool_members
      set 
        part1_points = v_total_p1,
        part2_points = v_total_p2,
        total_points = v_total_p1 + v_total_p2
      where pool_id = r_member.pool_id and user_id = r_member.user_id;
    end loop;

    -- También actualizamos profiles con el mejor rendimiento del usuario
    for r_member in select distinct user_id from public.pool_members loop
      declare
        v_best_p1 int;
        v_best_p2 int;
        v_best_total int;
      begin
        select part1_points, part2_points, total_points
        into v_best_p1, v_best_p2, v_best_total
        from public.pool_members
        where user_id = r_member.user_id
        order by total_points desc, joined_at asc
        limit 1;

        IF v_best_p1 IS NULL THEN v_best_p1 := 0; END IF;
        IF v_best_p2 IS NULL THEN v_best_p2 := 0; END IF;
        IF v_best_total IS NULL THEN v_best_total := 0; END IF;

        update public.profiles
        set
          part1_points = coalesce(v_best_p1, 0),
          part2_points = coalesce(v_best_p2, 0),
          total_points = coalesce(v_best_total, 0)
        where id = r_member.user_id;
      end;
    end loop;
  end;

end;
$$ language plpgsql security definer;

-- Define RPC recalculate_all_points
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

-- Trigger para automatizar el cálculo al terminar un partido o actualizar su marcador
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

DROP TRIGGER IF EXISTS tr_calculate_points ON public.matches;
CREATE TRIGGER tr_calculate_points
  AFTER UPDATE ON public.matches
  FOR EACH ROW EXECUTE PROCEDURE public.calculate_points_on_match_finish();

