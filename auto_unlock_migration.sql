-- Migration to update public.handle_new_user() with auto-unlock logic
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  v_app_time timestamp with time zone;
  v_knockout_kickoff timestamp with time zone;
  v_p1_unlocked_until timestamp with time zone;
BEGIN
  v_app_time := public.get_app_time();
  
  SELECT min(match_date) INTO v_knockout_kickoff
  FROM public.matches
  WHERE phase <> 'group';

  IF v_knockout_kickoff IS NULL THEN
    v_knockout_kickoff := '2026-06-28 19:00:00+00'::timestamp with time zone;
  END IF;

  IF v_app_time >= '2026-06-11T20:00:00Z'::timestamp with time zone AND v_app_time < v_knockout_kickoff THEN
    v_p1_unlocked_until := v_app_time + interval '24 hours';
    IF v_p1_unlocked_until > v_knockout_kickoff THEN
      v_p1_unlocked_until := v_knockout_kickoff;
    END IF;
  ELSE
    v_p1_unlocked_until := null;
  END IF;

  INSERT INTO public.profiles (id, email, display_name, avatar_url, is_admin, p1_unlocked_until)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url',
    CASE WHEN new.email = 'ehdiazs@gmail.com' THEN true ELSE false END,
    v_p1_unlocked_until
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
