WITH filtered AS (
    SELECT
        *,
        -- Completed Logic
        CASE
            WHEN platform_name ILIKE '%retail%' AND order_status = 'Completed'
                THEN TRUE
            WHEN platform_name NOT ILIKE '%retail%'
                 AND order_status = 'Completed'
                 AND delivered_date IS NOT NULL
                THEN TRUE
            ELSE FALSE
        END AS is_completed
    FROM denormalized_table
    WHERE order_year = :year
      AND order_month = :month
)

SELECT
    product_name,
    SUM(CASE WHEN is_completed THEN product_subtotal_after ELSE 0 END) AS total_sales,
    SUM(CASE WHEN is_completed THEN quantity ELSE 0 END) AS total_qty
FROM filtered
GROUP BY product_name
ORDER BY total_sales DESC
LIMIT 10;