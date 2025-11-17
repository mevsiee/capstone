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
from endpoints.platform_distribution import get_platform_distribution
from endpoints.sales_trend_daily import get_sales_trend_daily
from endpoints.sales_trend_hourly import get_sales_trend_hourly
from endpoints.sales_trend_monthly import get_sales_trend_monthly
from endpoints.top_selling_products import get_top_selling_products
from endpoints.aov_platform_distribution import get_aov_platform_distribution

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
@app.get("/kpi/net-sales")
def route_net_sales(request: Request):
    year_param = request.query_params.get("year")
    month_param = request.query_params.get("month")

    if year_param is None or month_param is None:
        # If no filter provided → use DB latest year/month
        latest = get_latest_year_month_from_db()   # You already have this
        year = latest["year"]
        month = latest["month"]
    else:
        year = int(year_param)
        month = int(month_param)
    return get_net_sales(engine, year, month)


@app.get("/kpi/gross-sales")
def route_gross_sales(request: Request):
    year_param = request.query_params.get("year")
    month_param = request.query_params.get("month")

    if year_param is None or month_param is None:
        # If no filter provided → use DB latest year/month
        latest = get_latest_year_month_from_db()   # You already have this
        year = latest["year"]
        month = latest["month"]
    else:
        year = int(year_param)
        month = int(month_param)
    return get_gross_sales(engine, year, month)

@app.get("/kpi/discounts")
def route_discounts(request: Request):
    year_param = request.query_params.get("year")
    month_param = request.query_params.get("month")

    if year_param is None or month_param is None:
        # If no filter provided → use DB latest year/month
        latest = get_latest_year_month_from_db()   # You already have this
        year = latest["year"]
        month = latest["month"]
    else:
        year = int(year_param)
        month = int(month_param)
    return get_discounts(engine, year, month)

@app.get("/kpi/aov")
def route_aov(request: Request):
    year_param = request.query_params.get("year")
    month_param = request.query_params.get("month")

    if year_param is None or month_param is None:
        # No filter provided → use latest year/month from DB
        latest = get_latest_year_month_from_db()
        year = latest["year"]
        month = latest["month"]
    else:
        year = int(year_param)
        month = int(month_param)

    return get_aov_kpi(engine, year, month)

# --------------------------
# OTHER ROUTES
# --------------------------
@app.get("/platform/distribution")
def route_platform_distribution(request: Request):
    year_param = request.query_params.get("year")
    month_param = request.query_params.get("month")

    if year_param is None or month_param is None:
        latest = get_latest_year_month_from_db()
        year = latest["year"]
        month = latest["month"]
    else:
        year = int(year_param)
        month = int(month_param)
    return get_platform_distribution(engine, year, month)


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



@app.get("/aov/distribution")
def route_aov_distribution(request: Request):
    year_param = request.query_params.get("year")
    month_param = request.query_params.get("month")

    if year_param is None or month_param is None:
        latest = get_latest_year_month_from_db()
        year = latest["year"]
        month = latest["month"]
    else:
        year = int(year_param)
        month = int(month_param)

    return get_aov_platform_distribution(engine, year, month)