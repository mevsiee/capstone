import { Card } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

// Mock data based on CSV files
const chartData = [
  { month: "Jan", retailCurrent: 300000, ecommerceCurrent: 350000, retailForecast: null, ecommerceForecast: null },
  { month: "Feb", retailCurrent: 400000, ecommerceCurrent: 320000, retailForecast: null, ecommerceForecast: null },
  { month: "Mar", retailCurrent: 380000, ecommerceCurrent: 360000, retailForecast: null, ecommerceForecast: null },
  { month: "Apr", retailCurrent: null, ecommerceCurrent: null, retailForecast: 420000, ecommerceForecast: 390000 },
  { month: "May", retailCurrent: null, ecommerceCurrent: null, retailForecast: 450000, ecommerceForecast: 410000 },
  { month: "Jun", retailCurrent: null, ecommerceCurrent: null, retailForecast: 480000, ecommerceForecast: 450000 },
];

const SalesForecastTab = () => {
  const [priceAdjustment, setPriceAdjustment] = useState([0]);
  const [adAdjustment, setAdAdjustment] = useState([0]);

  const currentQuarterSales = 2450000;
  const nextQuarterSales = 2695000;
  const growthRate = ((nextQuarterSales - currentQuarterSales) / currentQuarterSales * 100).toFixed(1);

  return (
    <div className="space-y-6">
      {/* Executive Summary */}
      <Card className="bg-card border-border p-6">
        <h3 className="text-lg font-semibold mb-3 text-foreground">executive summary and recommendations</h3>
        <p className="text-muted-foreground leading-relaxed">
          Sales projected to increase by 10% next quarter driven by strong ecommerce performance. 
          Recommend maintaining current pricing strategy while increasing digital marketing spend.
        </p>
      </Card>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-card border-border p-6">
          <div className="text-sm text-muted-foreground mb-2">
            current quarter<br />total sales
          </div>
          <div className="text-3xl font-bold text-foreground">
            ${currentQuarterSales.toLocaleString()}
          </div>
        </Card>

        <Card className="bg-card border-border p-6">
          <div className="text-sm text-muted-foreground mb-2">
            next quarter<br />projected sales
          </div>
          <div className="text-3xl font-bold text-foreground">
            ${nextQuarterSales.toLocaleString()}
          </div>
        </Card>

        <Card className="bg-card border-border p-6">
          <div className="text-sm text-muted-foreground mb-2">
            rate percentage<br />(growth/loss)
          </div>
          <div className="text-3xl font-bold text-success">
            +{growthRate}%
          </div>
        </Card>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart Section */}
        <div className="lg:col-span-2 space-y-4">
          <Card className="bg-card border-border p-6">
            <h3 className="text-base font-semibold mb-1 text-foreground">
              graph for sales forecast (current quarter - shown as solid lines and next quarter - shown as broken lines)
            </h3>
            <p className="text-sm text-muted-foreground mb-6">ecommerce (tiktok Shopee combined) and retail</p>
            
            <ResponsiveContainer width="100%" height={350}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis 
                  dataKey="month" 
                  stroke="hsl(var(--muted-foreground))"
                  style={{ fontSize: '12px' }}
                />
                <YAxis 
                  stroke="hsl(var(--muted-foreground))"
                  style={{ fontSize: '12px' }}
                  tickFormatter={(value) => `${value / 1000}K`}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    color: 'hsl(var(--foreground))'
                  }}
                  formatter={(value: any) => `$${value?.toLocaleString()}`}
                />
                <Legend 
                  wrapperStyle={{ color: 'hsl(var(--foreground))' }}
                />
                <Line 
                  type="monotone" 
                  dataKey="retailCurrent" 
                  stroke="hsl(var(--chart-retail))" 
                  strokeWidth={2}
                  name="Retail (Current)"
                  dot={{ fill: 'hsl(var(--chart-retail))' }}
                />
                <Line 
                  type="monotone" 
                  dataKey="ecommerceCurrent" 
                  stroke="hsl(var(--chart-ecommerce))" 
                  strokeWidth={2}
                  name="Ecommerce (Current)"
                  dot={{ fill: 'hsl(var(--chart-ecommerce))' }}
                />
                <Line 
                  type="monotone" 
                  dataKey="retailForecast" 
                  stroke="hsl(var(--chart-retail))" 
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  name="Retail (Forecast)"
                  dot={{ fill: 'hsl(var(--chart-retail))' }}
                />
                <Line 
                  type="monotone" 
                  dataKey="ecommerceForecast" 
                  stroke="hsl(var(--chart-ecommerce))" 
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  name="Ecommerce (Forecast)"
                  dot={{ fill: 'hsl(var(--chart-ecommerce))' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </Card>

          {/* Breakdown Cards */}
          <div className="grid grid-cols-3 gap-4">
            <Card className="bg-card border-border p-4">
              <div className="text-xs text-muted-foreground mb-2">retail forecasted amount</div>
              <div className="text-xl font-bold text-foreground">$1,200,000</div>
            </Card>
            <Card className="bg-card border-border p-4">
              <div className="text-xs text-muted-foreground mb-2">Shopee forecasted amount</div>
              <div className="text-xl font-bold text-foreground">$850,000</div>
            </Card>
            <Card className="bg-card border-border p-4">
              <div className="text-xs text-muted-foreground mb-2">tiktok forecasted amount</div>
              <div className="text-xl font-bold text-foreground">$645,000</div>
            </Card>
          </div>
        </div>

        {/* Right Sidebar */}
        <div className="space-y-4">
          {/* Model Validation */}
          <Card className="bg-card border-border p-6">
            <h3 className="text-base font-semibold mb-4 text-foreground">model validation</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">MAE (Mean Absolute Error) value</span>
                <span className="text-sm font-semibold text-primary">45,230</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">RMSE (Root Mean Squared Error) value</span>
                <span className="text-sm font-semibold text-primary">58,120</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">MAPE (Mean Absolute Percentage Error) value</span>
                <span className="text-sm font-semibold text-primary">3.2%</span>
              </div>
            </div>
          </Card>

          {/* Price Elasticity Analysis */}
          <Card className="bg-card border-border p-6">
            <h3 className="text-base font-semibold mb-2 text-foreground">Price Elasticity Analysis (What-If)</h3>
            <p className="text-xs text-muted-foreground mb-4">
              Simulate order volume changes based on pricing adjustments
            </p>
            
            <div className="space-y-6">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-sm text-foreground">Price Adjustment (%)</label>
                  <span className="text-sm font-semibold text-primary">{priceAdjustment[0]}%</span>
                </div>
                <Slider
                  value={priceAdjustment}
                  onValueChange={setPriceAdjustment}
                  min={-30}
                  max={30}
                  step={1}
                  className="w-full"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-sm text-foreground">Advertising Adjustment (%)</label>
                  <span className="text-sm font-semibold text-primary">{adAdjustment[0]}%</span>
                </div>
                <Slider
                  value={adAdjustment}
                  onValueChange={setAdAdjustment}
                  min={-30}
                  max={30}
                  step={1}
                  className="w-full"
                />
              </div>

              <div className="pt-4 border-t border-border">
                <div className="text-xs text-muted-foreground mb-1">Projected Revenue Impact</div>
                <div className="text-2xl font-bold text-primary">
                  $2,695,000
                </div>
                <div className="text-xs text-success mt-1">0.0% vs baseline</div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default SalesForecastTab;
