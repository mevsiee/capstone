-- CANCELLED ORDERS KPI

WITH raw AS (
    SELECT
        dt.*,
        date_trunc('month', order_date)::date AS order_month_date,

        -- Cancelled logic
        CASE
            WHEN platform_name ILIKE '%retail%'
                 AND order_status = 'Cancelled'
                THEN TRUE
            WHEN platform_name NOT ILIKE '%retail%'
                 AND order_status = 'Cancelled'
                 AND cancelled_date IS NOT NULL
                THEN TRUE
            ELSE FALSE
        END AS is_cancelled

    FROM denormalized_table AS dt
    WHERE order_year >= 2023
),

months AS (
    SELECT
        make_date(:year, :month, 1) AS current_month,
        (make_date(:year, :month, 1) - INTERVAL '1 month')::date AS previous_month
),

base AS (
    SELECT
        r.*,
        (r.order_month_date = m.current_month) AS is_current_month,
        (r.order_month_date = m.previous_month) AS is_previous_month
    FROM raw r
    CROSS JOIN months m
)

SELECT
    COALESCE(SUM(
        CASE WHEN is_current_month AND is_cancelled THEN 1 END
    ), 0) AS current_value,

    COALESCE(SUM(
        CASE WHEN is_previous_month AND is_cancelled THEN 1 END
    ), 0) AS previous_value
FROM base;