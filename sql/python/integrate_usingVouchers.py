import pandas as pd
import os

# --- Load CSVs with all columns as string to avoid mismatched Order IDs ---
tiktok_df = pd.read_csv("data/New folder/tiktok_all.csv", dtype=str, low_memory=False)
shopee_df = pd.read_csv("data/New folder/shopee_all.csv", dtype=str, low_memory=False)

# --- TikTok Mapping ---
tiktok_mapping = {
    "order_id": "order_id",
    "order_status": "order_status",
    "created_time": "order_creation_date",
    "delivered_time": "delivered_time",
    "cancelled_time": "cancelled_time",
    "product_name": "product_name",
    "variation": "variation_name",
    "quantity": "quantity",
    "sku_unit_original_price": "original_price",
    "sku_subtotal_before_disc": "product_subtotal_before",
    "sku_subtotal_after_disc": "product_subtotal_after",
    "order_amount": "order_amount",
    "shipping_fee_after_disc": "buyer_paid_shipping_fee",
    "taxes": "taxes"
}


tiktok_discount_cols = [
    "sku_platform_discount",
    "sku_seller_discount",
    "payment_platform_discount"
]


tiktok_shipping_discount_cols = [
    "shipping_fee_seller_disc",
    "shipping_fee_platform_disc"
]


# --- Shopee Mapping ---
shopee_mapping = {
    "order_id": "order_id",
    "order_status": "order_status",
    "return_refund_status": "return_refund_status",
    "order_creation_date": "order_creation_date",
    "order_complete_time": "delivered_time",
    "product_name": "product_name",
    "variation_name": "variation_name",
    "quantity": "quantity",
    "original_price": "original_price",
    "product_subtotal": "product_subtotal_before",
    "products_price_paid_by_buyer": "product_subtotal_after",
    "buyer_paid_shipping_fee": "buyer_paid_shipping_fee",
    "service_fee": "service_fee",
    "grand_total": "order_amount"
}


shopee_discount_cols = [
    "total_discount",
    "price_discount_from_seller",
    "shopee_rebate",
    "seller_voucher",
    "shopee_voucher",
    "shopee_bundle_discount",
    "seller_bundle_discount",
    "shopee_coins_offset",
    "credit_card_discount_total"
]


shopee_shipping_discount_cols = [
    "shipping_rebate_estimate"
]


# --- Convert numeric columns safely ---
def safe_numeric(df, cols):
    for col in cols:
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors="coerce").fillna(0)

# --- Process TikTok ---
# --- Process TikTok ---
tiktok_df = tiktok_df.rename(columns=tiktok_mapping)

safe_numeric(
    tiktok_df,
    tiktok_discount_cols + tiktok_shipping_discount_cols + ["original_price", "quantity"]
)

tiktok_df["last_total_discount"] = tiktok_df[tiktok_discount_cols].sum(axis=1)
tiktok_df["total_shipping_discount"] = tiktok_df[tiktok_shipping_discount_cols].sum(axis=1)
tiktok_df["price_after_discount"] = (tiktok_df["original_price"] * tiktok_df["quantity"]) - tiktok_df["last_total_discount"]
tiktok_df["platform"] = "tiktok"


# --- Process Shopee ---
shopee_df = shopee_df.rename(columns=shopee_mapping)

safe_numeric(
    shopee_df,
    shopee_discount_cols + shopee_shipping_discount_cols + ["original_price", "quantity"]
)

shopee_df["last_total_discount"] = shopee_df[shopee_discount_cols].sum(axis=1)
shopee_df["total_shipping_discount"] = shopee_df[shopee_shipping_discount_cols].sum(axis=1)
shopee_df["price_after_discount"] = (shopee_df["original_price"] * shopee_df["quantity"]) - shopee_df["last_total_discount"]
shopee_df["platform"] = "shopee"


# --- Final Columns ---
final_columns = [
    "order_id", "platform", "order_status", "return_refund_status",
    "order_creation_date", "delivered_time", "cancelled_time",
    "product_name", "variation_name", "quantity",
    "original_price", "product_subtotal_before", "last_total_discount", 
    "product_subtotal_after", "price_after_discount", 
    "buyer_paid_shipping_fee", "order_amount",
    "service_fee", "taxes"
]

# --- Merge Data ---
merged_df = pd.concat([
    tiktok_df.reindex(columns=final_columns),
    shopee_df.reindex(columns=final_columns)
], ignore_index=True)

# --- Save Output ---
os.makedirs("output", exist_ok=True)
merged_df.to_csv("output/merged_allData.csv", index=False)

print("✅ File saved: output/merged_allData.csv")
