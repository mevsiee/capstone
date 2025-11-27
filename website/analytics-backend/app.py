from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from db import engine
from sqlalchemy import text

# KPI endpoints
from endpoints.kpi_net import get_net_sales
from endpoints.kpi_gross import get_gross_sales
from endpoints.kpi_discounts import get_discounts
from endpoints.kpi_aov import get_aov_kpi

# Other endpoints
from endpoints.top_categories import get_top_categories
from endpoints.sales_trend_daily import get_sales_trend_daily
from endpoints.sales_trend_hourly import get_sales_trend_hourly
from endpoints.sales_trend_monthly import get_sales_trend_monthly
from endpoints.top_selling_products import get_top_selling_products

# Settings endpoint
from endpoints.platform_integration import get_platform_integration

app = FastAPI()

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

from sqlalchemy import text

def get_latest_year_month_from_db():
    query = text("""
        SELECT order_year, order_month
        FROM denormalized_table
        ORDER BY order_year DESC, order_month DESC
        LIMIT 1;
    """)

    with engine.connect() as conn:
        row = conn.execute(query).fetchone()

    return {"year": row.order_year, "month": row.order_month}

# --------------------------
# KPI ROUTES
# --------------------------
@app.get("/kpi/gross")
def route_gross(request: Request):
    year = int(request.query_params.get("year"))
    month = int(request.query_params.get("month"))
    platform = request.query_params.get("platform", "all").lower()

    return get_gross_sales(engine, year, month, platform)

@app.get("/kpi/net")
def route_net(request: Request):
    year = int(request.query_params.get("year"))
    month = int(request.query_params.get("month"))
    platform = request.query_params.get("platform", "all").lower()

    return get_net_sales(engine, year, month, platform)

@app.get("/kpi/discounts")
def route_discounts(request: Request):
    year = int(request.query_params.get("year"))
    month = int(request.query_params.get("month"))
    platform = request.query_params.get("platform", "all").lower()

    return get_discounts(engine, year, month, platform)


@app.get("/kpi/aov")
def route_aov(request: Request):
    year = int(request.query_params.get("year"))
    month = int(request.query_params.get("month"))
    platform = request.query_params.get("platform", "all").lower()

    return get_aov_kpi(engine, year, month, platform)

# --------------------------
# OTHER ROUTES
# --------------------------
@app.get("/sales/trend/hourly")
def route_sales_hourly(request: Request):
    year_param = request.query_params.get("year")
    month_param = request.query_params.get("month")

    if year_param is None or month_param is None:
        latest = get_latest_year_month_from_db()
        year = latest["year"]
        month = latest["month"]
    else:
        year = int(year_param)
        month = int(month_param)

    return get_sales_trend_hourly(engine, year, month)

@app.get("/sales/trend/daily")
def route_sales_daily(request: Request):
    year_param = request.query_params.get("year")
    month_param = request.query_params.get("month")

    if year_param is None or month_param is None:
        latest = get_latest_year_month_from_db()
        year = latest["year"]
        month = latest["month"]
    else:
        year = int(year_param)
        month = int(month_param)

    return get_sales_trend_daily(engine, year, month)

@app.get("/sales/trend/monthly")
def route_sales_monthly(request: Request):
    year_param = request.query_params.get("year")

    # Monthly needs only YEAR, not month
    if year_param is None:
        latest = get_latest_year_month_from_db()
        year = latest["year"]
    else:
        year = int(year_param)

    return get_sales_trend_monthly(engine, year)

@app.get("/categories/top")
def route_top_categories(request: Request):
    year = int(request.query_params.get("year"))
    month = int(request.query_params.get("month"))
    platform = request.query_params.get("platform", "all").lower()

    return get_top_categories(engine, year, month, platform)

@app.get("/products/top")
def route_top_products(request: Request):
    year_param = request.query_params.get("year")
    month_param = request.query_params.get("month")
    platform_param = request.query_params.get("platform", "all").lower()

    if year_param is None or month_param is None:
        latest = get_latest_year_month_from_db()
        year = latest["year"]
        month = latest["month"]
    else:
        year = int(year_param)
        month = int(month_param)

    return get_top_selling_products(engine, year, month, platform_param)