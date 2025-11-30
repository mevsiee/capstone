WITH raw AS (
    SELECT DISTINCT ON (order_id)
        dt.*,
        date_trunc('month', order_date)::date AS order_month_date,
        (LOWER(order_status) = 'cancelled') AS is_cancelled
    FROM denormalized_table dt
    WHERE order_date >= (make_date(:year, :month, 1) - INTERVAL '1 month')
      AND order_date <  (make_date(:year, :month, 1) + INTERVAL '1 month')
      AND LOWER(platform_name) = 'tiktok'    -- TikTok only
    ORDER BY order_id, order_date DESC
),

months AS (
    SELECT
        make_date(:year, :month, 1) AS current_month,
        (make_date(:year, :month, 1) - INTERVAL '1 month')::date AS previous_month
)

SELECT
    CASE
        WHEN :platform = 'retail' THEN 0
        ELSE COUNT(*) FILTER (
                 WHERE raw.order_month_date = months.current_month
                   AND raw.is_cancelled
             )
    END AS current_value,
    CASE
        WHEN :platform = 'retail' THEN 0
        ELSE COUNT(*) FILTER (
                 WHERE raw.order_month_date = months.previous_month
                   AND raw.is_cancelled
             )
    END AS previous_value
FROM raw
CROSS JOIN months;