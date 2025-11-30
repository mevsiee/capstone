import pandas as pd
from sqlalchemy import text
from pathlib import Path

def get_sales_order_correlation_daily(engine, year, month, platform):
    sql_path = Path(__file__).resolve().parent.parent / "sql" / "sales_order_correlation_daily.sql"
    
    with open(sql_path, "r", encoding="utf-8") as f:
        sql = f.read()

    with engine.connect() as conn:
        df = pd.read_sql(
            text(sql),
            conn,
            params={"year": year, "month": month}
        )

    output = []
    for date in sorted(df["order_date"].unique()):
        row = df[df["order_date"] == date]
        output.append({
            "label": str(date),
            "tiktok": {
                "orders": int(row[(row["platform_name"]=="tiktok")]["completed_orders"].sum()),
                "sales": float(row[(row["platform_name"]=="tiktok")]["completed_sales"].sum())
            },
            "retail": {
                "orders": int(row[(row["platform_name"]=="retail")]["completed_orders"].sum()),
                "sales": float(row[(row["platform_name"]=="retail")]["completed_sales"].sum())
            }
        })
    return output