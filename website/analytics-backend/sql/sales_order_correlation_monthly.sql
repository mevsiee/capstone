SELECT
    order_month,
    LOWER(platform_name) AS platform_name,
    SUM(
        CASE WHEN order_status = 'Completed'
             THEN COALESCE(quantity, 0)
             ELSE 0 END
    ) AS completed_orders,
    SUM(
        CASE WHEN order_status = 'Completed'
             THEN COALESCE(price_after_discount, 0)
             ELSE 0 END
    ) AS completed_sales
FROM denormalized_table
WHERE order_year = :year
  AND LOWER(platform_name) NOT LIKE '%shopee%'
GROUP BY order_month, platform_name
ORDER BY order_month;