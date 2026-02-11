-- Delete all data_activity_log rows for Super Admin users (users with role = 'admin')
-- This will delete all activity logs created by admin users

DELETE FROM data_activity_log
WHERE user_id IN (
  SELECT id 
  FROM user_profiles 
  WHERE role = 'admin'
);

-- Optional: Check how many rows will be deleted before running
-- Uncomment the query below to see the count first:
-- SELECT COUNT(*) 
-- FROM data_activity_log
-- WHERE user_id IN (
--   SELECT id 
--   FROM user_profiles 
--   WHERE role = 'admin'
-- );

