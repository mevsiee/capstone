import pandas as pd
from sqlalchemy import text
from .utils import pct_change


def get_gross_sales(engine, year, month):
    from pathlib import Path
    sql_path = Path(__file__).resolve().parent.parent / "sql" / "kpi_gross.sql"

    with open(sql_path, "r", encoding="utf-8") as f:
        sql = f.read()

    with engine.connect() as conn:
        df = pd.read_sql(
            text(sql), conn, params={"year": year, "month": month}
        )

    row = df.iloc[0]
    current = float(row["current_value"])
    previous = float(row["previous_value"])
    delta = pct_change(current, previous)

    return {
        "current": current,
        "previous": previous,
        "delta": delta
    }