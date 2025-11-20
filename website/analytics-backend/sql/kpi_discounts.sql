-- TOTAL DISCOUNTS KPI (last_total_discount ON COMPLETED ORDERS)
WITH raw AS (
    SELECT DISTINCT ON (order_id)
        dt.*,
        date_trunc('month', order_date)::date AS order_month_date,

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

    -- Ensure stable DISTINCT ON ordering
    ORDER BY order_id, order_date DESC
),

months AS (
    SELECT
        make_date(:year, :month, 1) AS current_month,
        (make_date(:year, :month, 1) - INTERVAL '1 month')::date AS previous_month
),

base AS (
    SELECT
        r.*,
        (r.order_month_date = m.current_month)  AS is_current_month,
        (r.order_month_date = m.previous_month) AS is_previous_month
    FROM raw r
    CROSS JOIN months m
)

SELECT
    COALESCE(SUM(
        CASE WHEN is_current_month AND is_completed
            THEN COALESCE(last_total_discount, 0)
        END
    ), 0) AS current_value,

    COALESCE(SUM(
        CASE WHEN is_previous_month AND is_completed
            THEN COALESCE(last_total_discount, 0)
        END
    ), 0) AS previous_value
FROM base;
