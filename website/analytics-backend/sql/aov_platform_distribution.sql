-- AOV DISTRIBUTION PER PLATFORM (PRODUCT_SUBTOTAL_AFTER ON COMPLETED ORDERS)

WITH raw AS (
    SELECT
        dt.*,
        date_trunc('month', order_date)::date AS order_month_date,

        -- Completed logic (same as KPI AOV / Gross) :contentReference[oaicite:0]{index=0}
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

    FROM denormalized_table AS dt
    WHERE order_year >= 2023
),

target_month AS (
    SELECT make_date(:year, :month, 1)::date AS current_month
),

base AS (
    SELECT
        r.*
    FROM raw r
    CROSS JOIN target_month t
    WHERE r.order_month_date = t.current_month
      AND r.is_completed = TRUE
)

SELECT
    platform_name,
    COALESCE(AVG(product_subtotal_after), 0) AS average_aov
FROM base
GROUP BY platform_name
ORDER BY platform_name;