-- Delete all rows from data_activity_log where user_id is null
-- This cleans up orphaned activity logs that don't have an associated user

DELETE FROM data_activity_log
WHERE user_id IS NULL;

-- Optional: Show count of deleted rows (uncomment to use)
-- SELECT COUNT(*) as deleted_count FROM data_activity_log WHERE user_id IS NULL;

