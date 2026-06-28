
BEGIN;

-- Test 1: Verify p1_unlocked_until exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'p1_unlocked_until'
  ) THEN
    RAISE EXCEPTION 'Test 1 Failed: p1_unlocked_until column does not exist on profiles table';
  END IF;
END $$;

-- Test 2: Non-admin user calling admin_unlock_user_p1 should fail
DO $$
BEGIN
  -- Set auth context to non-admin user
  PERFORM set_config('request.jwt.claim.sub', 'f7b580c4-1d1a-4414-9bac-43da1079d7d1', true);
  PERFORM set_config('request.jwt.claim.role', 'authenticated', true);
  
  BEGIN
    PERFORM public.admin_unlock_user_p1('f7b580c4-1d1a-4414-9bac-43da1079d7d1');
    RAISE EXCEPTION 'Test 2 Failed: Non-admin was allowed to call admin_unlock_user_p1';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM = 'Unauthorized' THEN
      NULL; -- Expected
    ELSE
      RAISE EXCEPTION 'Test 2 Failed with unexpected error: %', SQLERRM;
    END IF;
  END;
END $$;

-- Test 3: Admin user calling admin_unlock_user_p1 should succeed
DO $$
DECLARE
  v_unlocked timestamp with time zone;
BEGIN
  -- Set auth context to admin user
  PERFORM set_config('request.jwt.claim.sub', '9d5ddc8c-9047-4320-8f07-02dab546588a', true);
  PERFORM set_config('request.jwt.claim.role', 'authenticated', true);
  
  PERFORM public.admin_unlock_user_p1('f7b580c4-1d1a-4414-9bac-43da1079d7d1');
  
  SELECT p1_unlocked_until INTO v_unlocked FROM public.profiles WHERE id = 'f7b580c4-1d1a-4414-9bac-43da1079d7d1';
  IF v_unlocked IS NULL THEN
    RAISE EXCEPTION 'Test 3 Failed: p1_unlocked_until is still null after unlock';
  END IF;
END $$;

-- Test 4: Admin user calling admin_lock_user_p1 should succeed
DO $$
DECLARE
  v_unlocked timestamp with time zone;
BEGIN
  -- Set auth context to admin user
  PERFORM set_config('request.jwt.claim.sub', '9d5ddc8c-9047-4320-8f07-02dab546588a', true);
  PERFORM set_config('request.jwt.claim.role', 'authenticated', true);
  
  PERFORM public.admin_lock_user_p1('f7b580c4-1d1a-4414-9bac-43da1079d7d1');
  
  SELECT p1_unlocked_until INTO v_unlocked FROM public.profiles WHERE id = 'f7b580c4-1d1a-4414-9bac-43da1079d7d1';
  IF v_unlocked IS NOT NULL THEN
    RAISE EXCEPTION 'Test 4 Failed: p1_unlocked_until is not null after lock';
  END IF;
END $$;

-- Test 5: Admin user calling recalculate_all_points should succeed
DO $$
BEGIN
  -- Set auth context to admin user
  PERFORM set_config('request.jwt.claim.sub', '9d5ddc8c-9047-4320-8f07-02dab546588a', true);
  PERFORM set_config('request.jwt.claim.role', 'authenticated', true);
  
  PERFORM public.recalculate_all_points();
END $$;

ROLLBACK;
