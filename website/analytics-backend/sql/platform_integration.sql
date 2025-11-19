SELECT 
    platform_name,
    MAX(order_date) AS last_sync,
    CASE 
        WHEN MAX(order_date) < (CURRENT_DATE - INTERVAL '7 days')
            THEN false
        ELSE true
    END AS active
FROM denormalized_table
GROUP BY platform_name
ORDER BY platform_name;