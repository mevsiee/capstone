SELECT
    order_hour,
    LOWER(platform_name) AS platform_name,
    COUNT(DISTINCT order_id) AS order_count
FROM denormalized_table
WHERE order_year = :year
  AND order_month = :month
  AND (:platform = 'all' OR LOWER(platform_name) = :platform)
GROUP BY platform_name, order_hour
ORDER BY order_hour ASC;