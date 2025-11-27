import pandas as pd
from sqlalchemy import text
import os

SQL_PATH = os.path.join(os.path.dirname(__file__), "..", "sql", "top_categories.sql")

with open(SQL_PATH, "r", encoding="utf-8") as f:
    SQL_TOP_CATEGORIES = f.read()

def get_top_categories(engine, year: int, month: int, platform: str):
    with engine.connect() as conn:
        df = pd.read_sql(
            text(SQL_TOP_CATEGORIES),
            conn,
            params={
                "year": year,
                "month": month,
                "platform": platform
            }
        )
    return df.to_dict(orient="records")