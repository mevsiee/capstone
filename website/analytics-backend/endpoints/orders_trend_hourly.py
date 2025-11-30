import pandas as pd
from sqlalchemy import text

def get_orders_trend_hourly(engine, year, month, platform):
    from pathlib import Path
    sql_path = Path(__file__).resolve().parent.parent / "sql" / "orders_trend_hourly.sql"

    with open(sql_path, "r", encoding="utf-8") as f:
        sql = f.read()

    with engine.connect() as conn:
        df = pd.read_sql(text(sql), conn,
            params={"year": year, "month": month, "platform": platform}
        )

    output = []
    for hr in range(24):
        row = df[df["order_hour"] == hr]
        output.append({
            "label": f"{hr:02}",
            "tiktok_orders": int(row[row["platform_name"]=="tiktok"]["order_count"].sum()),
            "retail_orders": int(row[row["platform_name"]=="retail"]["order_count"].sum())
        })
    return output