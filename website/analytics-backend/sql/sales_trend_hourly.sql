SELECT
    order_hour,
    LOWER(platform_name) AS platform_name,
    SUM(
        CASE 
            WHEN order_status = 'Completed'
            THEN COALESCE(price_after_discount, 0)
            ELSE 0
        END
    ) AS hourly_sales
FROM denormalized_table
WHERE order_year = :year
  AND order_month = :month
  AND LOWER(platform_name) NOT LIKE '%shopee%'   -- EXCLUDE SHOPEE
GROUP BY order_hour, platform_name
ORDER BY order_hour, platform_name;