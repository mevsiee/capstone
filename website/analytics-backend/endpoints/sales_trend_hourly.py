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
        hour = r["order_hour"]

        # FIX NaN and None together
        if hour is None or pd.isna(hour):
            hour = None
        else:
            hour = int(hour)

        result.append({
            "order_hour": hour,
            "platform_name": str(r["platform_name"]).lower(),  # lowercase for matching
            "hourly_sales": float(r["hourly_sales"] or 0)
        })

    return result