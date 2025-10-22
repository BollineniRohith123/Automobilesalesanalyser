import React from 'react';
import { FileUploader } from './FileUploader';
import { FileList } from './FileList';
import { RedundantPurchasesTable } from './RedundantPurchasesTable';
import { InventoryAging } from './InventoryAging';
import { useDashboard } from '../context/DashboardContext';
import { BarChart3, AlertCircle, RefreshCw, Loader2 } from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';

export const Dashboard = () => {
  const { 
    isLoading, 
    files, 
    redundantPurchases, 
    inventoryAging, 
    dashboardStats,
    clearAllData,
    fetchData
  } = useDashboard();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600">
              <BarChart3 className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Jasper Inventory Intelligence
              </h1>
              <p className="text-sm text-gray-600">
                Inventory & Procurement Analysis Dashboard
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={fetchData}
              disabled={isLoading}
              className="flex items-center gap-2"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              Refresh
            </Button>
            <Button 
              variant="destructive" 
              size="sm"
              onClick={clearAllData}
            >
              Clear All Data
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Upload Section */}
        <div className="mb-8">
          <FileUploader />
        </div>

        {/* File List - Show upload history */}
        {files.length > 0 && (
          <div className="mb-8">
            <FileList />
          </div>
        )}

        {/* Dashboard Stats Overview */}
        {dashboardStats && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
            <Card className="p-4 bg-blue-50 border-blue-200">
              <p className="text-sm text-blue-700 font-medium">Total Vehicles</p>
              <p className="text-2xl font-bold text-blue-900">{dashboardStats.total_vehicles}</p>
            </Card>
            <Card className="p-4 bg-green-50 border-green-200">
              <p className="text-sm text-green-700 font-medium">Sold</p>
              <p className="text-2xl font-bold text-green-900">{dashboardStats.sold_count}</p>
            </Card>
            <Card className="p-4 bg-yellow-50 border-yellow-200">
              <p className="text-sm text-yellow-700 font-medium">In Stock</p>
              <p className="text-2xl font-bold text-yellow-900">{dashboardStats.unsold_count}</p>
            </Card>
            <Card className="p-4 bg-red-50 border-red-200">
              <p className="text-sm text-red-700 font-medium">Redundant</p>
              <p className="text-2xl font-bold text-red-900">{dashboardStats.redundant_purchases}</p>
            </Card>
            <Card className="p-4 bg-orange-50 border-orange-200">
              <p className="text-sm text-orange-700 font-medium">&gt;60 Days</p>
              <p className="text-2xl font-bold text-orange-900">{dashboardStats.aged_over_60_days}</p>
            </Card>
            <Card className="p-4 bg-purple-50 border-purple-200">
              <p className="text-sm text-purple-700 font-medium">&gt;90 Days</p>
              <p className="text-2xl font-bold text-purple-900">{dashboardStats.aged_over_90_days}</p>
            </Card>
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="text-center py-16">
            <Loader2 className="mx-auto h-12 w-12 text-blue-600 animate-spin mb-4" />
            <p className="text-gray-600">Loading analysis data...</p>
          </div>
        )}

        {/* Main Analysis Sections */}
        {!isLoading && dashboardStats && (
          <div className="space-y-8">
            {/* Core Feature 1: Redundant Purchase Report */}
            <section>
              <div className="mb-4">
                <h2 className="text-2xl font-bold text-gray-900">Redundant Purchase Report</h2>
                <p className="text-sm text-gray-600 mt-1">
                  Vehicles purchased while identical models were available in other divisions
                </p>
              </div>
              <RedundantPurchasesTable data={redundantPurchases} />
            </section>

            {/* Core Feature 2: Inventory Aging */}
            <section>
              <div className="mb-4">
                <h2 className="text-2xl font-bold text-gray-900">Inventory Aging Analysis</h2>
                <p className="text-sm text-gray-600 mt-1">
                  Monitor unsold vehicles and identify aging stock that needs attention
                </p>
              </div>
              <InventoryAging data={inventoryAging} stats={dashboardStats} />
            </section>
          </div>
        )}

        {/* Empty State - No Data */}
        {!isLoading && !dashboardStats && (
          <div className="text-center py-16">
            <div className="max-w-md mx-auto">
              <div className="p-4 rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 inline-block mb-4">
                <AlertCircle className="w-16 h-16 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                No Data Uploaded Yet
              </h3>
              <p className="text-gray-600 mb-4">
                Upload your purchase and sales CSV files to begin analyzing inventory intelligence
              </p>
              <div className="text-sm text-gray-500 space-y-2">
                <p>✓ Automatic redundant purchase detection</p>
                <p>✓ Real-time inventory aging tracking</p>
                <p>✓ Cross-divisional visibility</p>
                <p>✓ Actionable insights for management</p>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};