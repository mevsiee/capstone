import pandas as pd
from prophet import Prophet
from firebase_admin import db
import json
from datetime import datetime, timedelta

def get_sales_data():
    """Fetch sales data from Firebase"""
    ref = db.reference('transactions')
    transactions = ref.get()
    
    # Convert to DataFrame
    data = []
    for trans in transactions.values():
        data.append({
            'date': datetime.fromtimestamp(trans['timestamp']).strftime('%Y-%m-%d'),
            'sales': float(trans['total'])
        })
    
    df = pd.DataFrame(data)
    df = df.groupby('date')['sales'].sum().reset_index()
    return df

def generate_forecast():
    """Generate sales forecast using Prophet"""
    # Get historical data
    df = get_sales_data()
    
    # Prepare data for Prophet
    df.columns = ['ds', 'y']
    
    # Initialize and fit Prophet model
    model = Prophet(
        yearly_seasonality=True,
        weekly_seasonality=True,
        daily_seasonality=False,
        changepoint_prior_scale=0.05,
        seasonality_prior_scale=10.0
    )
    model.fit(df)
    
    # Create future dates for forecasting (90 days)
    future = model.make_future_dataframe(periods=90)
    
    # Generate forecast
    forecast = model.predict(future)
    
    # Prepare response data
    actual_data = df.to_dict('records')
    forecast_data = forecast[['ds', 'yhat', 'yhat_lower', 'yhat_upper']].tail(90).to_dict('records')
    
    response = {
        'actual': [{'date': str(d['ds']), 'value': float(d['y'])} for d in actual_data],
        'forecast': [{
            'date': str(d['ds']), 
            'value': float(d['yhat']),
            'lower': float(d['yhat_lower']),
            'upper': float(d['yhat_upper'])
        } for d in forecast_data]
    }
    
    # Calculate growth metrics
    last_quarter_sales = sum(d['y'] for d in actual_data[-90:])
    next_quarter_forecast = sum(d['yhat'] for d in forecast_data[:90])
    growth_rate = ((next_quarter_forecast - last_quarter_sales) / last_quarter_sales) * 100
    
    response['metrics'] = {
        'projected_sales': next_quarter_forecast,
        'growth_rate': growth_rate
    }
    
    return response

def adjust_forecast(base_forecast, price_adjustment, advertising_adjustment):
    """Adjust forecast based on price and advertising impacts"""
    # Simple linear adjustment model
    price_impact = price_adjustment * 0.8  # Assuming 80% price elasticity
    ad_impact = advertising_adjustment * 0.4  # Assuming 40% advertising elasticity
    
    total_adjustment = 1 + (price_impact + ad_impact) / 100
    
    adjusted_forecast = {
        'actual': base_forecast['actual'],
        'forecast': [{
            'date': f['date'],
            'value': f['value'] * total_adjustment,
            'lower': f['lower'] * total_adjustment,
            'upper': f['upper'] * total_adjustment
        } for f in base_forecast['forecast']],
        'metrics': {
            'projected_sales': base_forecast['metrics']['projected_sales'] * total_adjustment,
            'growth_rate': base_forecast['metrics']['growth_rate'] * total_adjustment
        }
    }
    
    return adjusted_forecast
