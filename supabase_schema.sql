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
  primary key (user_id, pool_id)
);

-- =====================================================================
-- 3. TRIGGERS AUTOMÁTICOS
-- =====================================================================

-- Trigger para crear perfil de usuario automáticamente tras su registro
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, display_name, avatar_url, is_admin)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url',
    case when new.email = 'ehdiazs@gmail.com' then true else false end
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

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
    and get_app_time() < '2026-06-11T18:00:00Z'::timestamp with time zone -- Límite de bloqueo Parte 1
  );

create policy "Usuarios pueden ver predicciones de otros si están bloqueadas o son propias"
  on public.full_tournament_predictions for select
  using (
    auth.uid() = user_id
    or get_app_time() >= '2026-06-11T18:00:00Z'::timestamp with time zone
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
    and get_app_time() < '2026-06-11T18:00:00Z'::timestamp with time zone
  );

create policy "Usuarios pueden ver campeones de otros si están bloqueados"
  on public.champion_predictions for select
  using (
    auth.uid() = user_id
    or get_app_time() >= '2026-06-11T18:00:00Z'::timestamp with time zone
  );
