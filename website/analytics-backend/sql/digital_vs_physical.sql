-- BASE CTE
WITH raw AS (
    SELECT
        dt.*,
        date_trunc('month', order_date)::date AS order_month_date,

        -- Completed logic:
        CASE
            WHEN platform_name ILIKE '%retail%' AND order_status = 'Completed'
                THEN TRUE
            WHEN platform_name NOT ILIKE '%retail%'
                 AND order_status = 'Completed'
                 AND delivered_date IS NOT NULL
                THEN TRUE
            ELSE FALSE
        END AS is_completed,

        -- Cancelled logic:
        CASE
            WHEN platform_name ILIKE '%retail%' AND order_status = 'Cancelled'
                THEN TRUE
            WHEN platform_name NOT ILIKE '%retail%'
                 AND order_status = 'Cancelled'
                 AND cancelled_date IS NOT NULL
                THEN TRUE
            ELSE FALSE
        END AS is_cancelled
    FROM denormalized_table AS dt
),

-- Inside months CTE
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

platform_sales AS (
    SELECT
        LOWER(platform_name) AS platform,
        COALESCE(SUM(
            CASE WHEN is_current_month AND is_completed
                THEN order_amount ELSE 0 END
        ), 0) AS sales
    FROM base
    GROUP BY platform
),

total AS (
    SELECT SUM(sales) AS total_sales FROM platform_sales
)

SELECT
    CASE
        WHEN platform_name ILIKE '%retail%' THEN 'Retail'
        ELSE 'Online'
    END AS sales_channel,

    COALESCE(SUM(
        CASE WHEN is_current_month AND is_completed
            THEN order_amount ELSE 0 END
    ), 0) AS total_sales
FROM base
GROUP BY sales_channel;