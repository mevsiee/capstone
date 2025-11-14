import pandas as pd
from sqlalchemy import text

def get_sales_trend_monthly(engine, year):
    from pathlib import Path
    sql_path = Path(__file__).resolve().parent.parent / "sql" / "sales_trend_monthly.sql"

    with open(sql_path, "r", encoding="utf-8") as f:
        sql = f.read()

    with engine.connect() as conn:
        df = pd.read_sql(
            text(sql),
            conn,
            params={"year": year}
        )

    result = []
    for _, r in df.iterrows():
        result.append({
            "order_month": int(r["order_month"]),
            "platform_name": r["platform_name"].capitalize(),
            "monthly_sales": float(r["monthly_sales"] or 0)
        })

    return result