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

months AS (
    SELECT
        make_date(:year, :month, 1) AS current_month,
        (make_date(:year, :month, 1) - INTERVAL '1 month')::date AS previous_month
)

SELECT
    COALESCE(
        FLOOR(
            AVG(quantity) FILTER (
                WHERE raw.order_month_date = months.current_month
                  AND raw.is_completed
            )
        ), 0
    ) AS current_value,
    COALESCE(
        FLOOR(
            AVG(quantity) FILTER (
                WHERE raw.order_month_date = months.previous_month
                  AND raw.is_completed
            )
        ), 0
    ) AS previous_value
FROM raw
CROSS JOIN months;