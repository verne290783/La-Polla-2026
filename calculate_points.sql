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

      -- Evaluar goles regular 90 min para el que avanzó
      if (v_aw = r_match.home_team_id and v_ph = v_ah) or (v_aw = r_match.away_team_id and v_pa = v_aa) then
        v_pts := v_pts + 3;
      end if;
      -- Evaluar goles regular 90 min para el que fue eliminado
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
  for r_pred in 
    select * from public.full_tournament_predictions 
    where prediction_key = 'M' || p_match_id
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

      -- Suma Parte 2 en ese grupo
      select coalesce(sum(points_earned), 0) into v_total_p2 
      from public.phase_predictions 
      where user_id = r_member.user_id and pool_id = r_member.pool_id;

      -- Bonus campeones en ese grupo
      select coalesce(points_earned, 0) into v_bonus 
      from public.champion_predictions 
      where user_id = r_member.user_id and pool_id = r_member.pool_id;

      v_total_p1 := v_total_p1 + v_bonus;

      -- Actualizar record en pool_members
      update public.pool_members
      set 
        part1_points = v_total_p1,
        part2_points = v_total_p2,
        total_points = v_total_p1 + v_total_p2
      where pool_id = r_member.pool_id and user_id = r_member.user_id;
    end loop;

    -- También actualizamos profiles.total_points para mantener un "Puntaje Global" del usuario
    -- (usamos su puntaje MÁXIMO en cualquiera de sus grupos como su score global)
    for r_member in select distinct user_id from public.pool_members loop
      update public.profiles
      set
        total_points = coalesce((
          select max(total_points) 
          from public.pool_members 
          where user_id = r_member.user_id
        ), 0)
      where id = r_member.user_id;
    end loop;
  end;

end;
$$ language plpgsql security definer;

-- Trigger para automatizar el cálculo al terminar un partido
create or replace function public.calculate_points_on_match_finish()
returns trigger as $$
begin
  if new.status = 'finished' and (old.status is null or old.status <> 'finished') then
    perform public.compute_points(new.id);
  end if;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists tr_calculate_points on public.matches;
create trigger tr_calculate_points
  after update on public.matches
  for each row execute procedure public.calculate_points_on_match_finish();
