WITH cleaned AS (
    SELECT
        CASE
            WHEN category ILIKE 'pants' THEN 'PANTS'
            WHEN category ILIKE 'polo shirt' THEN 'POLO SHIRT'
            WHEN category ILIKE 'polo' THEN 'POLO'
            WHEN category ILIKE 'shorts' THEN 'SHORTS'
            WHEN category ILIKE 't-shirt'
              OR category ILIKE 't shirt'
              OR category ILIKE 'tshirt' THEN 'T-SHIRT'
            WHEN category ILIKE 'unknown'
              OR category ILIKE 'uknown'
              OR category ILIKE 'unkown'
              OR category IS NULL
              OR btrim(category) = '' THEN 'UNKNOWN'
            ELSE UPPER(category)
        END AS cleaned_category,

        product_subtotal_after,
        LOWER(platform_name) AS platform_name
    FROM denormalized_table
    WHERE order_year = :year
      AND order_month = :month
      AND LOWER(platform_name) NOT LIKE '%shopee%'
),

aggregated AS (
    SELECT
        cleaned_category AS category,
        SUM(product_subtotal_after) AS total_sales
    FROM cleaned
    WHERE (:platform = 'all' OR platform_name = :platform)
    GROUP BY cleaned_category
)

SELECT *
FROM aggregated
ORDER BY total_sales DESC;