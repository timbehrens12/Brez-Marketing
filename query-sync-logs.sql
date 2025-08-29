-- Query sync session logs to debug Shopify sync issues

-- Get all logs for a specific sync session
-- Replace 'SYNC_YOUR_SESSION_ID' with the actual session ID from your logs
SELECT
  id,
  sync_session_id,
  level,
  event,
  details,
  created_at
FROM sync_session_logs
WHERE sync_session_id = 'SYNC_YOUR_SESSION_ID'  -- Replace with actual session ID
ORDER BY created_at ASC;

-- Get recent sync logs (last 24 hours)
SELECT
  id,
  sync_session_id,
  level,
  event,
  details,
  created_at
FROM sync_session_logs
WHERE created_at >= NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC
LIMIT 100;

-- Get sync sessions that had errors
SELECT DISTINCT
  sync_session_id,
  COUNT(*) as total_events,
  COUNT(CASE WHEN level = 'ERROR' THEN 1 END) as error_count
FROM sync_session_logs
GROUP BY sync_session_id
HAVING COUNT(CASE WHEN level = 'ERROR' THEN 1 END) > 0
ORDER BY created_at DESC;

-- Get detailed error information
SELECT
  sync_session_id,
  event,
  details->>'error' as error_message,
  details->>'stack' as error_stack,
  created_at
FROM sync_session_logs
WHERE level = 'ERROR'
ORDER BY created_at DESC
LIMIT 20;

-- Get sync summary by session
SELECT
  sync_session_id,
  MIN(created_at) as started_at,
  MAX(created_at) as finished_at,
  EXTRACT(EPOCH FROM (MAX(created_at) - MIN(created_at))) * 1000 as duration_ms,
  COUNT(*) as total_events,
  COUNT(CASE WHEN level = 'ERROR' THEN 1 END) as error_count,
  COUNT(CASE WHEN event LIKE '%SUCCESS%' THEN 1 END) as success_events
FROM sync_session_logs
WHERE sync_session_id LIKE 'SYNC_%'
GROUP BY sync_session_id
ORDER BY started_at DESC
LIMIT 10;
