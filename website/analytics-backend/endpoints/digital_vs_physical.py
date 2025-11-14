import pandas as pd
from sqlalchemy.sql import text
from endpoints.sql_loader import load_sql


def get_digital_vs_physical(engine):
    sql = load_sql("digital_vs_physical.sql")
    with engine.connect() as conn:
        df = pd.read_sql(text(sql), conn)

    rows = []
    for _, r in df.iterrows():
        rows.append(
            {
                "sales_channel": r["sales_channel"],
                "total_sales": float(r["total_sales"]),
            }
        )
    return rows