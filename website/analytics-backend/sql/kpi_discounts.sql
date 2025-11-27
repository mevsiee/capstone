WITH raw AS (
    SELECT DISTINCT ON (order_id)
        dt.*,
        date_trunc('month', order_date)::date AS order_month_date,
        CASE
            WHEN platform_name ILIKE '%retail%' AND order_status='Completed'
                THEN TRUE
            WHEN platform_name NOT ILIKE '%retail%'
                AND order_status='Completed'
                AND delivered_date IS NOT NULL
                THEN TRUE
            ELSE FALSE
        END AS is_completed
    FROM denormalized_table dt
    WHERE order_year >= 2023
      AND (:platform = 'all' OR LOWER(platform_name) = :platform)
      AND LOWER(platform_name) NOT LIKE '%shopee%'
    ORDER BY order_id, order_date DESC
),

months AS (
    SELECT
        make_date(:year, :month, 1) AS current_month,
        (make_date(:year, :month, 1) - INTERVAL '1 month')::date AS previous_month
)

SELECT
    COALESCE(SUM(CASE WHEN order_month_date = m.current_month AND is_completed
                      THEN last_total_discount END), 0) AS current_value,
    COALESCE(SUM(CASE WHEN order_month_date = m.previous_month AND is_completed
                      THEN last_total_discount END), 0) AS previous_value
FROM raw r
CROSS JOIN months m;
