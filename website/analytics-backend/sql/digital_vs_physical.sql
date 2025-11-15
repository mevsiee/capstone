WITH filtered AS (
    SELECT *,
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
    CASE 
        WHEN LOWER(platform_name) IN ('shopee','tiktok') THEN 'Online'
        WHEN LOWER(platform_name) = 'retail' THEN 'Retail'
    END AS sales_channel,
    SUM(
        CASE WHEN is_completed THEN product_subtotal_after ELSE 0 END
    ) AS total_sales
FROM filtered
GROUP BY 1;