WITH raw AS (
    SELECT DISTINCT ON (order_id)
        dt.*,
        date_trunc('month', order_date)::date AS order_month_date,
        (LOWER(order_status) = 'completed') AS is_completed
    FROM denormalized_table dt
    WHERE order_date >= (make_date(:year, :month, 1) - INTERVAL '1 month')
      AND order_date <  (make_date(:year, :month, 1) + INTERVAL '1 month')
      AND (
            (:platform = 'all' AND LOWER(platform_name) IN ('tiktok','retail'))
         OR (:platform = 'tiktok' AND LOWER(platform_name) = 'tiktok')
         OR (:platform = 'retail' AND LOWER(platform_name) = 'retail')
      )
    ORDER BY order_id, order_date DESC
),

monthly AS (
    SELECT
        order_month_date,
        COUNT(*) AS total_orders,
        SUM(CASE WHEN is_completed THEN 1 ELSE 0 END) AS completed_orders
    FROM raw
    GROUP BY order_month_date
),

months AS (
    SELECT
        make_date(:year, :month, 1) AS current_month,
        (make_date(:year, :month, 1) - INTERVAL '1 month')::date AS previous_month
)

SELECT
    COALESCE(
        (SELECT completed_orders
         FROM monthly
         WHERE order_month_date = months.current_month) * 100.0
        /
        NULLIF(
          (SELECT total_orders
           FROM monthly
           WHERE order_month_date = months.current_month), 0
        ),
        0
    ) AS current_value,
    COALESCE(
        (SELECT completed_orders
         FROM monthly
         WHERE order_month_date = months.previous_month) * 100.0
        /
        NULLIF(
          (SELECT total_orders
           FROM monthly
           WHERE order_month_date = months.previous_month), 0
        ),
        0
    ) AS previous_value
FROM months;