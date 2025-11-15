import pandas as pd
from sqlalchemy import text

def get_digital_vs_physical(engine, year: int, month: int):
    sql = open("sql/digital_vs_physical.sql", "r", encoding="utf-8").read()

    with engine.connect() as conn:
        df = pd.read_sql(
            text(sql),
            conn,
            params={"year": year, "month": month}
        )

    online = float(df[df["sales_channel"] == "Online"]["total_sales"].sum() or 0)
    retail = float(df[df["sales_channel"] == "Retail"]["total_sales"].sum() or 0)

    return [
        {"sales_channel": "Online", "total_sales": online},
        {"sales_channel": "Retail", "total_sales": retail}
    ]