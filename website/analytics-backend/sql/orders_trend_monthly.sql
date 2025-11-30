SELECT
    order_month,
    LOWER(platform_name) AS platform_name,
    COUNT(DISTINCT order_id) AS order_count
FROM denormalized_table
WHERE order_year = :year
  AND (:platform = 'all' OR LOWER(platform_name) = :platform)
GROUP BY order_month, platform_name
ORDER BY order_month ASC;