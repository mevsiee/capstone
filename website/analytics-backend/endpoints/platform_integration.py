import pandas as pd
from sqlalchemy import text
from pathlib import Path

def get_platform_integration(engine):
    sql_path = Path(__file__).resolve().parent.parent / "sql" / "platform_integration.sql"

    with open(sql_path, "r", encoding="utf-8") as f:
        sql = f.read()

    with engine.connect() as conn:
        df = pd.read_sql(text(sql), conn)

    # Mapping raw DB names to display names
    display_names = {
        "retail": "Retail Store",
        "shopee": "Shopee",
        "tiktok": "TikTok Shop"
    }

    result = []
    for _, row in df.iterrows():
        raw = row["platform_name"]
        pretty = display_names.get(raw.lower(), raw.title())

        result.append({
            "key": raw.lower(),
            "name": pretty,
            "description": f"Last synced: {row['last_sync']}",
            "active": bool(row["active"])
        })

    return result