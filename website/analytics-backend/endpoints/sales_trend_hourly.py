import pandas as pd
from sqlalchemy import text

def get_sales_trend_hourly(engine, year, month):
    from pathlib import Path
    sql_path = Path(__file__).resolve().parent.parent / "sql" / "sales_trend_hourly.sql"

    with open(sql_path, "r", encoding="utf-8") as f:
        sql = f.read()

    with engine.connect() as conn:
        df = pd.read_sql(
            text(sql),
            conn,
            params={"year": year, "month": month}
        )

    result = []
    for _, r in df.iterrows():
        result.append({
            "order_hour": int(r["order_hour"]),
            "platform_name": r["platform_name"].capitalize(),
            "hourly_sales": float(r["hourly_sales"] or 0)
        })

    return result