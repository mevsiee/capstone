import pandas as pd
import re
from sqlalchemy import text

STORE_PATTERN = r"(ESHOP|ESHP|ESP|E-SHOP|E SHOP)"

def clean_store_label(name: str) -> str:
    if not isinstance(name, str):
        return name

    n = name.upper().strip()

    # remove glued lowercase L before store tag
    n = re.sub(r"[Ll]\s*" + STORE_PATTERN + r"\b", "", n)

    # remove double LL
    n = re.sub(r"LL\s*" + STORE_PATTERN + r"\b", "", n)

    # remove "| ESHOP"
    n = re.sub(r"\|\s*" + STORE_PATTERN + r"\b", "", n)

    # remove standalone store names
    n = re.sub(STORE_PATTERN + r"$", "", n)

    # remove "(2)" suffix
    n = re.sub(r"\(2\)$", "", n)

    # remove trailing MENSWEAR
    n = re.sub(r"\bMENSWEAR$", "", n)

    # clean leftover L
    n = re.sub(r"\bL$", "", n)

    # normalize spaces
    n = re.sub(r"\s{2,}", " ", n).strip()

    return n


def get_top_selling_products(engine, year, month, platform):
    sql = open("sql/top_selling_products.sql", "r", encoding="utf-8").read()

    with engine.connect() as conn:
        df = pd.read_sql(
            text(sql),
            conn,
            params={"year": year, "month": month, "platform": platform}
        )

    # clean product names
    df["clean_name"] = df["product_name"].apply(clean_store_label)

    # remove empty names
    df = df[df["clean_name"].str.strip() != ""]

    # group by order quantity
    grouped = (
        df.groupby("clean_name")["total_quantity"]
        .sum()
        .reset_index()
        .sort_values("total_quantity", ascending=False)
    )

    # take top 5
    grouped = grouped.head(5)

    return [
        {
            "product_name": row["clean_name"],
            "total_quantity": int(row["total_quantity"])
        }
        for _, row in grouped.iterrows()
    ]

