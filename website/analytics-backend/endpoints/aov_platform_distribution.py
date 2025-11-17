import pandas as pd
from sqlalchemy import text


def get_aov_platform_distribution(engine, year, month):
    """
    Returns AOV per platform for the given year/month.

    Output shape:
    [
      {"platform_name": "Shopee", "average_aov": 250.5},
      {"platform_name": "TikTok", "average_aov": 310.0},
      {"platform_name": "Retail", "average_aov": 180.75},
      ...
    ]
    """
    from pathlib import Path

    sql_path = (
        Path(__file__).resolve().parent.parent / "sql" / "aov_platform_distribution.sql"
    )

    with open(sql_path, "r", encoding="utf-8") as f:
        sql = f.read()

    with engine.connect() as conn:
        df = pd.read_sql(
            text(sql),
            conn,
            params={"year": year, "month": month},
        )

    return df.to_dict(orient="records")