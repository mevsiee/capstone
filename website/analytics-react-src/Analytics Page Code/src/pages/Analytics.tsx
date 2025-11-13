import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { FileSpreadsheet, FileText } from "lucide-react";
import SalesForecastTab from "@/components/analytics/SalesForecastTab";
import OrderForecastTab from "@/components/analytics/OrderForecastTab";

const Analytics = () => {
  const [activeTab, setActiveTab] = useState("sales");

  const handleExport = (type: "excel" | "pdf") => {
    console.log(`Exporting ${type}`);
    // Export logic will be implemented later
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-[1400px]">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <h1 className="text-3xl font-bold text-foreground">Forecasting and Analytics</h1>
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => handleExport("excel")}
              className="border-border hover:bg-secondary"
            >
              <FileSpreadsheet className="mr-2 h-4 w-4" />
              Export Excel
            </Button>
            <Button
              variant="outline"
              onClick={() => handleExport("pdf")}
              className="border-border hover:bg-secondary"
            >
              <FileText className="mr-2 h-4 w-4" />
              Export PDF
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="bg-secondary border border-border mb-6">
            <TabsTrigger 
              value="sales"
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              sales forecast
            </TabsTrigger>
            <TabsTrigger 
              value="orders"
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              order forecast
            </TabsTrigger>
          </TabsList>

          <TabsContent value="sales">
            <SalesForecastTab />
          </TabsContent>

          <TabsContent value="orders">
            <OrderForecastTab />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Analytics;
