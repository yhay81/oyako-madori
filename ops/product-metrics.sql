WITH clean_events AS (
  SELECT name, session_id, room_id, day FROM product_events WHERE is_qa = 0
),
room_depth AS (
  SELECT room_id,
    COUNT(DISTINCT CASE WHEN name = 'room_opened' THEN session_id END) AS viewers,
    COUNT(DISTINCT CASE WHEN name = 'source_opened' THEN session_id END) AS source_users,
    COUNT(DISTINCT CASE WHEN name = 'favorite_added' THEN session_id END) AS favorite_users
  FROM clean_events WHERE room_id IS NOT NULL GROUP BY room_id
)
SELECT
  COUNT(DISTINCT CASE WHEN name = 'visited' THEN session_id END) AS visitors,
  COUNT(DISTINCT CASE WHEN name = 'directory_searched' THEN session_id END) AS searchers,
  COUNT(DISTINCT CASE WHEN name = 'room_opened' THEN session_id END) AS viewers,
  COUNT(DISTINCT CASE WHEN name = 'source_opened' THEN session_id END) AS source_users,
  COUNT(DISTINCT CASE WHEN name = 'favorite_added' THEN session_id END) AS favorite_users,
  COUNT(DISTINCT CASE WHEN name = 'compare_opened' THEN session_id END) AS comparers,
  COUNT(DISTINCT CASE WHEN name = 'returned' THEN session_id END) AS returned,
  (SELECT COUNT(*) FROM room_depth WHERE viewers >= 3) AS rooms_with_three_viewers,
  (SELECT COUNT(*) FROM room_depth WHERE source_users >= 2) AS rooms_with_two_source_users,
  (SELECT COUNT(*) FROM room_depth WHERE favorite_users >= 2) AS rooms_with_two_favorites,
  (SELECT COUNT(*) FROM room_depth WHERE viewers >= 3 AND source_users >= 2) AS qualified_rooms
FROM clean_events;
