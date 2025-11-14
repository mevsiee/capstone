import pandas as pd
from sqlalchemy.sql import text
from endpoints.sql_loader import load_sql


def get_top_selling_products(engine):
    sql = load_sql("top_selling_products.sql")
    with engine.connect() as conn:
        df = pd.read_sql(text(sql), conn)

    rows = []
    for _, r in df.iterrows():
        rows.append(
            {
                "product_name": r["product_name"],
                "total_sales": float(r["total_sales"]),
                "total_qty": int(r["total_qty"]),
            }
        )
    return rows