-- PORTAL DE PRONÓSTICOS "LA POLLA" — MUNDIAL 2026
-- Script de Creación de Tablas, Triggers y Políticas RLS en Supabase

-- =====================================================================
-- 1. LIMPIEZA DE TABLAS Y OBJETOS EXISTENTES (Por seguridad)
-- =====================================================================
drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user();
drop function if exists public.get_app_time();

drop table if exists public.system_settings cascade;
drop table if exists public.champion_predictions cascade;
drop table if exists public.phase_predictions cascade;
drop table if exists public.full_tournament_predictions cascade;
drop table if exists public.matches cascade;
drop table if exists public.pool_members cascade;
drop table if exists public.pools cascade;
drop table if exists public.teams cascade;
drop table if exists public.profiles cascade;

-- =====================================================================
-- 2. CREACIÓN DE TABLAS PRINCIPALES
-- =====================================================================

-- Tabla de perfiles de usuario (Sincronizada con auth.users)
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text unique not null,
  display_name text,
  avatar_url text,
  part1_points int default 0,
  part2_points int default 0,
  total_points int default 0,
  is_admin boolean default false,
  p1_unlocked_until timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Configuración del sistema (para cambiar fecha/fase virtualmente)
create table public.system_settings (
  key text primary key,
  value text not null
);

-- Inicializar la fecha virtual en el 8 de junio de 2026 por defecto (Fase Pre-Torneo)
insert into public.system_settings (key, value) values ('virtual_date', '2026-06-08T12:00:00-04:00')
on conflict (key) do nothing;

-- Función para obtener la hora de la aplicación (Virtual o Real)
create or replace function public.get_app_time()
returns timestamp with time zone as $$
declare
  v_date text;
begin
  select value into v_date from public.system_settings where key = 'virtual_date';
  if v_date is not null and v_date <> '' then
    return v_date::timestamp with time zone;
  else
    return now();
  end if;
exception
  when others then
    return now();
end;
$$ language plpgsql stable;

-- Define RPC admin_unlock_user_p1
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

-- Define RPC admin_lock_user_p1
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

-- Tabla de selecciones nacionales
create table public.teams (
  id text primary key, -- ej: 'MEX', 'BRA'
  name text not null,
  flag_emoji text not null,
  fifa_ranking int not null,
  confederation text
);

-- Tabla de partidos reales del torneo
create table public.matches (
  id int primary key, -- Número de partido correlativo (1 a 104)
  phase text not null, -- 'group'|'r32'|'r16'|'qf'|'sf'|'3rd'|'final'
  home_team_id text references public.teams(id) on delete set null,
  away_team_id text references public.teams(id) on delete set null,
  home_score int,
  away_score int,
  winner_team_id text references public.teams(id) on delete set null, -- En eliminatorias
  match_date timestamp with time zone not null,
  venue text,
  city text,
  status text default 'scheduled' not null, -- 'scheduled'|'live'|'finished'
  lock_time_part2 timestamp with time zone not null, -- match_date - 1 hora
  external_match_id text
);

-- Tabla de grupos privados creados por usuarios
create table public.pools (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  invite_code text unique not null,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Tabla de miembros por grupo
create table public.pool_members (
  pool_id uuid references public.pools(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  joined_at timestamp with time zone default timezone('utc'::text, now()) not null,
  primary key (pool_id, user_id)
);

-- Tabla de predicciones de la Parte 1 (Wizard Pre-Torneo completo)
create table public.full_tournament_predictions (
  user_id uuid references public.profiles(id) on delete cascade,
  pool_id uuid not null references public.pools(id) on delete cascade,
  prediction_key text not null, -- ej: 'M1' (partido 1) o 'R32_M73' (cruces simulados)
  predicted_home_score int not null,
  predicted_away_score int not null,
  predicted_winner_team_id text references public.teams(id) on delete set null, -- Para empates en eliminatorias
  phase text not null,
  predicted_home_team_id text references public.teams(id) on delete set null, -- Equipos simulados por el usuario
  predicted_away_team_id text references public.teams(id) on delete set null, -- Equipos simulados por el usuario
  points_earned int,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default public.get_app_time() not null,
  primary key (user_id, pool_id, prediction_key)
);

-- Tabla de predicciones de la Parte 2 (Fase a fase en vivo)
create table public.phase_predictions (
  user_id uuid references public.profiles(id) on delete cascade,
  pool_id uuid not null references public.pools(id) on delete cascade,
  match_id int references public.matches(id) on delete cascade,
  predicted_home_score int not null,
  predicted_away_score int not null,
  predicted_winner_team_id text references public.teams(id) on delete set null,
  points_earned int,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default public.get_app_time() not null,
  primary key (user_id, pool_id, match_id)
);

-- Tabla de predicción de campeón/subcampeón/tercero (Parte 1)
create table public.champion_predictions (
  user_id uuid references public.profiles(id) on delete cascade,
  pool_id uuid not null references public.pools(id) on delete cascade,
  champion_team_id text references public.teams(id) on delete set null,
  runner_up_team_id text references public.teams(id) on delete set null,
  third_place_team_id text references public.teams(id) on delete set null,
  is_locked boolean default false,
  points_earned int,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default public.get_app_time() not null,
  primary key (user_id, pool_id)
);

-- =====================================================================
-- 3. TRIGGERS AUTOMÁTICOS
-- =====================================================================

-- Trigger para crear perfil de usuario automáticamente tras su registro
create or replace function public.handle_new_user()
returns trigger as $$
declare
  v_app_time timestamp with time zone;
  v_knockout_kickoff timestamp with time zone;
  v_p1_unlocked_until timestamp with time zone;
begin
  v_app_time := public.get_app_time();
  
  select min(match_date) into v_knockout_kickoff
  from public.matches
  where phase <> 'group';

  if v_knockout_kickoff is null then
    v_knockout_kickoff := '2026-06-28 19:00:00+00'::timestamp with time zone;
  end if;

  if v_app_time >= '2026-06-11T20:00:00Z'::timestamp with time zone and v_app_time < v_knockout_kickoff then
    v_p1_unlocked_until := v_app_time + interval '24 hours';
    if v_p1_unlocked_until > v_knockout_kickoff then
      v_p1_unlocked_until := v_knockout_kickoff;
    end if;
  else
    v_p1_unlocked_until := null;
  end if;

  insert into public.profiles (id, email, display_name, avatar_url, is_admin, p1_unlocked_until)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url',
    case when new.email = 'ehdiazs@gmail.com' then true else false end,
    v_p1_unlocked_until
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Trigger para mantener actualizado updated_at usando get_app_time()
create or replace function public.update_updated_at_column()
returns trigger as $$
begin
  -- Only update updated_at if user prediction data changes
  if (lower(TG_TABLE_NAME) = 'phase_predictions') then
    if (OLD.predicted_home_score is distinct from NEW.predicted_home_score or
        OLD.predicted_away_score is distinct from NEW.predicted_away_score or
        OLD.predicted_winner_team_id is distinct from NEW.predicted_winner_team_id) then
      NEW.updated_at := public.get_app_time();
    end if;
  elsif (lower(TG_TABLE_NAME) = 'full_tournament_predictions') then
    if (OLD.predicted_home_score is distinct from NEW.predicted_home_score or
        OLD.predicted_away_score is distinct from NEW.predicted_away_score or
        OLD.predicted_winner_team_id is distinct from NEW.predicted_winner_team_id or
        OLD.predicted_home_team_id is distinct from NEW.predicted_home_team_id or
        OLD.predicted_away_team_id is distinct from NEW.predicted_away_team_id) then
      NEW.updated_at := public.get_app_time();
    end if;
  elsif (lower(TG_TABLE_NAME) = 'champion_predictions') then
    if (OLD.champion_team_id is distinct from NEW.champion_team_id or
        OLD.runner_up_team_id is distinct from NEW.runner_up_team_id or
        OLD.third_place_team_id is distinct from NEW.third_place_team_id or
        OLD.is_locked is distinct from NEW.is_locked) then
      NEW.updated_at := public.get_app_time();
    end if;
  else
    NEW.updated_at := public.get_app_time();
  end if;
  return NEW;
end;
$$ language plpgsql;

create trigger tr_full_tournament_predictions_updated_at
  before update on public.full_tournament_predictions
  for each row execute procedure public.update_updated_at_column();

create trigger tr_phase_predictions_updated_at
  before update on public.phase_predictions
  for each row execute procedure public.update_updated_at_column();

create trigger tr_champion_predictions_updated_at
  before update on public.champion_predictions
  for each row execute procedure public.update_updated_at_column();

-- Habilitar réplicas Realtime para tablas clave
alter publication supabase_realtime add table public.matches;
alter publication supabase_realtime add table public.phase_predictions;
alter publication supabase_realtime add table public.profiles;

-- =====================================================================
-- 4. SEGURIDAD A NIVEL DE FILAS (RLS)
-- =====================================================================

-- Habilitar RLS en todas las tablas
alter table public.profiles enable row level security;
alter table public.system_settings enable row level security;
alter table public.teams enable row level security;
alter table public.matches enable row level security;
alter table public.pools enable row level security;
alter table public.pool_members enable row level security;
alter table public.full_tournament_predictions enable row level security;
alter table public.phase_predictions enable row level security;
alter table public.champion_predictions enable row level security;

-- Políticas para Profiles
create policy "Cualquiera puede leer perfiles" on public.profiles for select using (true);
create policy "Usuarios pueden actualizar su propio perfil" on public.profiles for update using (auth.uid() = id);

-- Políticas para System Settings
create policy "Cualquiera puede leer configuraciones" on public.system_settings for select using (true);
create policy "Solo admin puede modificar configuraciones" on public.system_settings for all using (
  exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
);

-- Políticas para Teams
create policy "Cualquiera puede leer equipos" on public.teams for select using (true);

-- Políticas para Matches
create policy "Cualquiera puede leer partidos" on public.matches for select using (true);
create policy "Solo admin puede insertar/modificar partidos" on public.matches for all using (
  exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
);

-- Políticas para Pools (Grupos)
create policy "Usuarios autenticados pueden ver grupos" on public.pools for select using (auth.role() = 'authenticated');
create policy "Usuarios autenticados pueden crear grupos" on public.pools for insert with check (auth.role() = 'authenticated');
create policy "Creadores pueden borrar su grupo" on public.pools for delete using (created_by = auth.uid());

-- Políticas para Pool Members
create policy "Miembros autenticados pueden ver miembros de grupo" on public.pool_members for select using (auth.role() = 'authenticated');
create policy "Usuarios pueden unirse a un grupo" on public.pool_members for insert with check (auth.uid() = user_id);
create policy "Miembros pueden salirse de un grupo" on public.pool_members for delete using (auth.uid() = user_id);

-- Políticas para Full Tournament Predictions (Parte 1)
create policy "Usuarios pueden modificar sus predicciones de la Parte 1" 
  on public.full_tournament_predictions for all
  using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id 
    and (
      get_app_time() < '2026-06-11T20:00:00Z'::timestamp with time zone
      or exists (
        select 1 from public.profiles
        where id = auth.uid()
        and p1_unlocked_until is not null
        and p1_unlocked_until > get_app_time()
      )
    )
  );

create policy "Usuarios pueden ver predicciones de otros si están bloqueadas o son propias"
  on public.full_tournament_predictions for select
  using (
    auth.uid() = user_id
    or (
      get_app_time() >= '2026-06-11T20:00:00Z'::timestamp with time zone
      and not exists (
        select 1 from public.profiles
        where id = full_tournament_predictions.user_id
        and p1_unlocked_until is not null
        and p1_unlocked_until > get_app_time()
      )
    )
  );

-- Políticas para Phase Predictions (Parte 2)
create policy "Usuarios pueden modificar sus predicciones de la Parte 2"
  on public.phase_predictions for all
  using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and get_app_time() < (select lock_time_part2 from public.matches where id = match_id) -- Límite individual por partido
  );

create policy "Usuarios pueden ver predicciones Parte 2 de otros tras el bloqueo del partido"
  on public.phase_predictions for select
  using (
    auth.uid() = user_id
    or get_app_time() >= (select lock_time_part2 from public.matches where id = match_id)
  );

-- Políticas para Champion Predictions
create policy "Usuarios pueden modificar sus campeones de la Parte 1"
  on public.champion_predictions for all
  using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and (
      get_app_time() < '2026-06-11T20:00:00Z'::timestamp with time zone
      or exists (
        select 1 from public.profiles
        where id = auth.uid()
        and p1_unlocked_until is not null
        and p1_unlocked_until > get_app_time()
      )
    )
  );

create policy "Usuarios pueden ver campeones de otros si están bloqueados"
  on public.champion_predictions for select
  using (
    auth.uid() = user_id
    or (
      get_app_time() >= '2026-06-11T20:00:00Z'::timestamp with time zone
      and not exists (
        select 1 from public.profiles
        where id = champion_predictions.user_id
        and p1_unlocked_until is not null
        and p1_unlocked_until > get_app_time()
      )
    )
  );

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

  -- Determinar v_pred_key (necesario para full_tournament_predictions)
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

  if r_match.status = 'scheduled' then
    -- Resetear points_earned a null en phase_predictions (Parte 2)
    update public.phase_predictions
    set points_earned = null
    where match_id = p_match_id;

    -- Resetear points_earned a null en full_tournament_predictions (Parte 1)
    update public.full_tournament_predictions
    set points_earned = null
    where prediction_key = v_pred_key;

    -- Resetear points_earned a null en champion_predictions si es el partido final (104)
    if p_match_id = 104 then
      update public.champion_predictions
      set points_earned = null where true;
    end if;
  else
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
      if r_pred.updated_at >= r_match.lock_time_part2 then
        v_pts := 0;
      else
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
      where prediction_key = v_pred_key
    loop
      v_pts := 0;

      declare
        v_unlocked_until timestamp with time zone;
      begin
        select p1_unlocked_until into v_unlocked_until 
        from public.profiles 
        where id = r_pred.user_id;

        if r_pred.updated_at >= r_match.lock_time_part2 then
          v_pts := 0;
          
          update public.full_tournament_predictions
          set points_earned = v_pts
          where user_id = r_pred.user_id and pool_id = r_pred.pool_id and prediction_key = r_pred.prediction_key;
        else
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
        end if;
      end;
    end loop;

    -- =====================================================================
    -- 4. CALCULAR PUNTOS DE BONUS DE CAMPEONES (Al finalizar el mundial)
    -- =====================================================================
    if p_match_id = 104 then
      for r_pred in select * from public.champion_predictions loop
        v_pts := 0;
        
        declare
          v_unlocked_until timestamp with time zone;
        begin
          select p1_unlocked_until into v_unlocked_until 
          from public.profiles 
          where id = r_pred.user_id;

          if r_pred.updated_at >= '2026-06-11T20:00:00Z'::timestamp with time zone 
             and (v_unlocked_until is null or r_pred.updated_at > v_unlocked_until) then
            v_pts := 0;
          else
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
          end if;

          update public.champion_predictions
          set points_earned = v_pts
          where user_id = r_pred.user_id and pool_id = r_pred.pool_id;
        end;
      end loop;
    end if;
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
  IF (new.status IS DISTINCT FROM old.status OR
      new.home_score IS DISTINCT FROM old.home_score OR
      new.away_score IS DISTINCT FROM old.away_score OR
      new.home_score_90 IS DISTINCT FROM old.home_score_90 OR
      new.away_score_90 IS DISTINCT FROM old.away_score_90 OR
      new.winner_team_id IS DISTINCT FROM old.winner_team_id) THEN
    PERFORM public.compute_points(new.id);
  END IF;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_calculate_points ON public.matches;
CREATE TRIGGER tr_calculate_points
  AFTER UPDATE ON public.matches
  FOR EACH ROW EXECUTE PROCEDURE public.calculate_points_on_match_finish();
