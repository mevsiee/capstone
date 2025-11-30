import pandas as pd
from sqlalchemy import text
import datetime

def get_orders_trend_daily(engine, year, month, platform):
    from pathlib import Path
    sql_path = Path(__file__).resolve().parent.parent / "sql" / "orders_trend_daily.sql"

    with open(sql_path, "r", encoding="utf-8") as f:
        sql = f.read()

    with engine.connect() as conn:
        df = pd.read_sql(text(sql), conn,
            params={"year": year, "month": month, "platform": platform}
        )

    df["day"] = df["order_date"].apply(lambda x: int(str(x).split("-")[2]))

    output = []
    for d in sorted(df["day"].unique()):
        row = df[df["day"] == d]
        output.append({
            "label": f"{d:02}",
            "tiktok_orders": int(row[row["platform_name"]=="tiktok"]["order_count"].sum()),
            "retail_orders": int(row[row["platform_name"]=="retail"]["order_count"].sum())
        })
    return output