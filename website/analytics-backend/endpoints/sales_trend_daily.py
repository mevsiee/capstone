import pandas as pd
from sqlalchemy import text

def get_sales_trend_daily(engine, year, month):
    from pathlib import Path
    sql_path = Path(__file__).resolve().parent.parent / "sql" / "sales_trend_daily.sql"

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
            "order_date": str(r["order_date"]),
            "platform_name": r["platform_name"].capitalize(),
            "daily_sales": float(r["daily_sales"] or 0)
        })

    return result