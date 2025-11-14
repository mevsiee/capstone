import pandas as pd
from sqlalchemy import text
from db import engine

def get_platform_distribution(engine, year, month):
    from pathlib import Path
    sql_path = Path(__file__).resolve().parent.parent / "sql" / "platform_distribution.sql"

    with open(sql_path, "r", encoding="utf-8") as f:
        sql = f.read()

    with engine.connect() as conn:
        df = pd.read_sql(text(sql), conn, params={"year": year, "month": month})

    return df.to_dict(orient="records")