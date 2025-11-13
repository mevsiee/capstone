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

// Mock data for orders
const orderChartData = [
  { month: "Jan", retailCurrent: 3500, ecommerceCurrent: 4200, retailForecast: null, ecommerceForecast: null },
  { month: "Feb", retailCurrent: 4100, ecommerceCurrent: 3800, retailForecast: null, ecommerceForecast: null },
  { month: "Mar", retailCurrent: 3900, ecommerceCurrent: 4500, retailForecast: null, ecommerceForecast: null },
  { month: "Apr", retailCurrent: null, ecommerceCurrent: null, retailForecast: 4300, ecommerceForecast: 4800 },
  { month: "May", retailCurrent: null, ecommerceCurrent: null, retailForecast: 4500, ecommerceForecast: 5100 },
  { month: "Jun", retailCurrent: null, ecommerceCurrent: null, retailForecast: 4700, ecommerceForecast: 5400 },
];

const OrderForecastTab = () => {
  const [demandAdjustment, setDemandAdjustment] = useState([0]);
  const [inventoryAdjustment, setInventoryAdjustment] = useState([0]);

  const currentQuarterOrders = 23400;
  const nextQuarterOrders = 25950;
  const growthRate = ((nextQuarterOrders - currentQuarterOrders) / currentQuarterOrders * 100).toFixed(1);

  return (
    <div className="space-y-6">
      {/* Executive Summary */}
      <Card className="bg-card border-border p-6">
        <h3 className="text-lg font-semibold mb-3 text-foreground">executive summary and recommendations</h3>
        <p className="text-muted-foreground leading-relaxed">
          Order volume projected to increase by 11% next quarter driven by strong ecommerce demand. 
          Recommend optimizing inventory levels and expanding fulfillment capacity for peak periods.
        </p>
      </Card>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-card border-border p-6">
          <div className="text-sm text-muted-foreground mb-2">
            current quarter<br />total orders
          </div>
          <div className="text-3xl font-bold text-foreground">
            {currentQuarterOrders.toLocaleString()}
          </div>
        </Card>

        <Card className="bg-card border-border p-6">
          <div className="text-sm text-muted-foreground mb-2">
            next quarter<br />projected orders
          </div>
          <div className="text-3xl font-bold text-foreground">
            {nextQuarterOrders.toLocaleString()}
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
              Graph for Orders Forecast (Current Quarter - shown as solid lines and next quarter - shown as broken lines)
            </h3>
            <p className="text-sm text-muted-foreground mb-6">ECommerce (Tiktok Shopee Combined) and Retail</p>
            
            <ResponsiveContainer width="100%" height={350}>
              <LineChart data={orderChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis 
                  dataKey="month" 
                  stroke="hsl(var(--muted-foreground))"
                  style={{ fontSize: '12px' }}
                />
                <YAxis 
                  stroke="hsl(var(--muted-foreground))"
                  style={{ fontSize: '12px' }}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    color: 'hsl(var(--foreground))'
                  }}
                  formatter={(value: any) => `${value?.toLocaleString()} orders`}
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
              <div className="text-xs text-muted-foreground mb-2">Retail Forecasted Amount</div>
              <div className="text-xl font-bold text-foreground">8,200</div>
            </Card>
            <Card className="bg-card border-border p-4">
              <div className="text-xs text-muted-foreground mb-2">Shopee Forecasted Amount</div>
              <div className="text-xl font-bold text-foreground">7,500</div>
            </Card>
            <Card className="bg-card border-border p-4">
              <div className="text-xs text-muted-foreground mb-2">Tiktok Forecasted Amount</div>
              <div className="text-xl font-bold text-foreground">5,250</div>
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
                <span className="text-sm font-semibold text-primary">892</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">RMSE (Root Mean Squared Error) value</span>
                <span className="text-sm font-semibold text-primary">1,145</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">MAPE (Mean Absolute Percentage Error) value</span>
                <span className="text-sm font-semibold text-primary">4.1%</span>
              </div>
            </div>
          </Card>

          {/* Order Demand Analysis */}
          <Card className="bg-card border-border p-6">
            <h3 className="text-base font-semibold mb-2 text-foreground">Order Demand Analysis</h3>
            <p className="text-xs text-muted-foreground mb-4">
              (Linear Programming Optimization)
            </p>
            
            <div className="space-y-6">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-sm text-foreground">Target Orders to Accomplish</label>
                  <span className="text-sm font-semibold text-primary">{demandAdjustment[0]}%</span>
                </div>
                <Slider
                  value={demandAdjustment}
                  onValueChange={setDemandAdjustment}
                  min={-30}
                  max={30}
                  step={1}
                  className="w-full"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-sm text-foreground">Product Stock Level (%)</label>
                  <span className="text-sm font-semibold text-primary">{inventoryAdjustment[0]}%</span>
                </div>
                <Slider
                  value={inventoryAdjustment}
                  onValueChange={setInventoryAdjustment}
                  min={-20}
                  max={20}
                  step={1}
                  className="w-full"
                />
              </div>

              <div className="pt-4 border-t border-border">
                <div className="text-xs text-muted-foreground mb-1">Optimized Order Capacity</div>
                <div className="text-2xl font-bold text-primary">
                  25,950
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

export default OrderForecastTab;
