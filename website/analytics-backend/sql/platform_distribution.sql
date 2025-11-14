-- PLATFORM DISTRIBUTION (CURRENT MONTH ONLY)

WITH raw AS (
    SELECT
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

    FROM denormalized_table dt
    WHERE order_year >= 2023
),

months AS (
    SELECT
        make_date(:year, :month, 1) AS current_month
),

base AS (
    SELECT r.*, (r.order_month_date = m.current_month) AS is_current_month
    FROM raw r
    CROSS JOIN months m
),

platform_sales AS (
    SELECT
        LOWER(platform_name) AS platform,
        SUM(
            CASE WHEN is_current_month AND is_completed
                 THEN order_amount ELSE 0 END
        ) AS sales
    FROM base
    GROUP BY 1
),

total AS (
    SELECT SUM(sales) AS total_sales FROM platform_sales
)

SELECT
    platform,
    sales,
    CASE 
        WHEN (SELECT total_sales FROM total) > 0
            THEN ROUND((sales / (SELECT total_sales FROM total)) * 100, 1)
        ELSE 0
    END AS share_percent
FROM platform_sales
ORDER BY platform;