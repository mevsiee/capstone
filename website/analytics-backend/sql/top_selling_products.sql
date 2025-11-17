WITH filtered AS (
    SELECT *,
        CASE 
            WHEN platform_name ILIKE '%retail%' 
                 AND order_status = 'Completed'
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
    CASE WHEN is_completed THEN COALESCE(quantity, 0) ELSE 0 END AS total_quantity
FROM filtered
WHERE 
    ((:platform = 'all') OR (LOWER(platform_name) = :platform))
    AND product_name != 'UNKNOWN';