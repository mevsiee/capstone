-- DIGITAL VS PHYSICAL (MATCHES PLATFORM DISTRIBUTION EXACTLY)

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
),

months AS (
    SELECT make_date(:year, :month, 1) AS current_month
),

base AS (
    SELECT r.*, (r.order_month_date = m.current_month) AS is_current_month
    FROM raw r
    CROSS JOIN months m
),

classified AS (
    SELECT
        CASE 
            WHEN LOWER(platform_name) IN ('shopee','tiktok') THEN 'Online'
            WHEN LOWER(platform_name) LIKE '%retail%' THEN 'Retail'
            ELSE 'Unknown'
        END AS sales_channel,

        SUM(
            CASE 
                WHEN is_current_month AND is_completed
                THEN order_amount 
                ELSE 0 
            END
        ) AS sales
    FROM base
    GROUP BY 1
)

SELECT 
    sales_channel,
    sales AS total_sales
FROM classified
WHERE sales_channel IN ('Online','Retail');