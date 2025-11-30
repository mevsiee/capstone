WITH raw AS (
    SELECT DISTINCT ON (order_id)
        dt.*,
        date_trunc('month', order_date)::date AS order_month_date,
        (LOWER(order_status) = 'cancelled') AS is_cancelled
    FROM denormalized_table dt
    WHERE order_date >= (make_date(:year, :month, 1) - INTERVAL '1 month')
      AND order_date <  (make_date(:year, :month, 1) + INTERVAL '1 month')
      AND LOWER(platform_name) = 'tiktok'     -- TikTok only
    ORDER BY order_id, order_date DESC
),

monthly AS (
    SELECT
        order_month_date,
        COUNT(*) AS total_tiktok_orders,
        SUM(CASE WHEN is_cancelled THEN 1 ELSE 0 END) AS cancelled_orders
    FROM raw
    GROUP BY order_month_date
),

months AS (
    SELECT
        make_date(:year, :month, 1) AS current_month,
        (make_date(:year, :month, 1) - INTERVAL '1 month')::date AS previous_month
)

SELECT
    CASE
        WHEN :platform = 'retail' THEN 0.0
        ELSE COALESCE(
            (SELECT cancelled_orders
             FROM monthly
             WHERE order_month_date = months.current_month) * 100.0
            /
            NULLIF(
              (SELECT total_tiktok_orders
               FROM monthly
               WHERE order_month_date = months.current_month), 0
            ),
            0.0
        )
    END AS current_value,
    CASE
        WHEN :platform = 'retail' THEN 0.0
        ELSE COALESCE(
            (SELECT cancelled_orders
             FROM monthly
             WHERE order_month_date = months.previous_month) * 100.0
            /
            NULLIF(
              (SELECT total_tiktok_orders
               FROM monthly
               WHERE order_month_date = months.previous_month), 0
            ),
            0.0
        )
    END AS previous_value
FROM months;