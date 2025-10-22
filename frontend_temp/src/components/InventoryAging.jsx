import React, { useMemo, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { Package, Clock, AlertCircle, Search } from 'lucide-react';
import ReactECharts from 'echarts-for-react';
import { Input } from './ui/input';

export const InventoryAging = ({ data, stats }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showDetails, setShowDetails] = useState(false);

  const agingData = useMemo(() => {
    if (!data || data.length === 0) {
      return { 
        buckets: { '0-30 Days': 0, '31-60 Days': 0, '61-90 Days': 0, '90+ Days': 0 },
        kpis: { totalUnsold: 0, over60Days: 0, over90Days: 0 }
      };
    }

    const buckets = {
      '0-30 Days': data.filter(v => v.inventory_days <= 30).length,
      '31-60 Days': data.filter(v => v.inventory_days > 30 && v.inventory_days <= 60).length,
      '61-90 Days': data.filter(v => v.inventory_days > 60 && v.inventory_days <= 90).length,
      '90+ Days': data.filter(v => v.inventory_days > 90).length,
    };
    
    const kpis = {
      totalUnsold: data.length,
      over60Days: buckets['61-90 Days'] + buckets['90+ Days'],
      over90Days: buckets['90+ Days'],
    };

    return { buckets, kpis };
  }, [data]);

  const filteredInventory = useMemo(() => {
    if (!data) return [];
    
    return data.filter(vehicle =>
      vehicle.model?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vehicle._id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vehicle.purchase_division?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [data, searchTerm]);

  const chartOption = {
    title: { 
      text: 'Inventory Aging Distribution', 
      subtext: 'Unsold vehicles by age bucket',
      left: 'center'
    },
    tooltip: { 
      trigger: 'axis',
      formatter: '{b}: {c} vehicles'
    },
    xAxis: { 
      type: 'category', 
      data: Object.keys(agingData.buckets),
      axisLabel: { rotate: 0, fontSize: 11 }
    },
    yAxis: { 
      type: 'value', 
      name: 'Number of Vehicles',
      nameLocation: 'middle',
      nameGap: 40
    },
    series: [{
      data: Object.values(agingData.buckets),
      type: 'bar',
      itemStyle: {
        color: (params) => {
          const colors = ['#10b981', '#f59e0b', '#f97316', '#ef4444'];
          return colors[params.dataIndex] || '#ef4444';
        }
      },
      label: {
        show: true,
        position: 'top',
        formatter: '{c}'
      }
    }],
    grid: { top: 80, bottom: 50, left: 60, right: 20 }
  };

  return (
    <div className="space-y-6">
      <Card className="col-span-1 lg:col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-6 w-6 text-blue-600" />
            Inventory Aging Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Card className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-blue-500 flex items-center justify-center">
                  <Package className="h-6 w-6 text-white" />
                </div>
                <div>
                  <p className="text-3xl font-bold text-blue-900">
                    {agingData.kpis.totalUnsold}
                  </p>
                  <p className="text-sm text-blue-700 font-medium">Total Unsold Units</p>
                </div>
              </div>
            </Card>

            <Card className="p-4 bg-gradient-to-br from-yellow-50 to-yellow-100 border-yellow-200">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-yellow-500 flex items-center justify-center">
                  <Clock className="h-6 w-6 text-white" />
                </div>
                <div>
                  <p className="text-3xl font-bold text-yellow-900">
                    {agingData.kpis.over60Days}
                  </p>
                  <p className="text-sm text-yellow-700 font-medium">Units &gt; 60 Days</p>
                </div>
              </div>
            </Card>

            <Card className="p-4 bg-gradient-to-br from-red-50 to-red-100 border-red-200">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-red-500 flex items-center justify-center">
                  <AlertCircle className="h-6 w-6 text-white" />
                </div>
                <div>
                  <p className="text-3xl font-bold text-red-900">
                    {agingData.kpis.over90Days}
                  </p>
                  <p className="text-sm text-red-700 font-medium">Units &gt; 90 Days (Critical)</p>
                </div>
              </div>
            </Card>
          </div>

          {/* Chart */}
          <div className="bg-white rounded-lg border p-4">
            <ReactECharts 
              option={chartOption} 
              style={{ height: '350px', width: '100%' }}
              opts={{ renderer: 'svg' }}
            />
          </div>

          {/* View Details Button */}
          {data && data.length > 0 && (
            <div className="mt-4 text-center">
              <button
                onClick={() => setShowDetails(!showDetails)}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                {showDetails ? 'Hide Details' : 'View Detailed Stock List'}
              </button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detailed Inventory Table */}
      {showDetails && data && data.length > 0 && (
        <Card className="col-span-1 lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Detailed Unsold Inventory</CardTitle>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search inventory..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 w-64"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="relative w-full overflow-x-auto max-h-96 overflow-y-auto">
              <table className="w-full caption-bottom text-sm">
                <thead className="sticky top-0 bg-gray-50 z-10 border-b">
                  <tr className="border-b">
                    <th className="h-10 px-4 text-left align-middle font-medium text-gray-700">Chassis No</th>
                    <th className="h-10 px-4 text-left align-middle font-medium text-gray-700">Model</th>
                    <th className="h-10 px-4 text-left align-middle font-medium text-gray-700">Division</th>
                    <th className="h-10 px-4 text-left align-middle font-medium text-gray-700">Purchase Date</th>
                    <th className="h-10 px-4 text-right align-middle font-medium text-gray-700">Days in Stock</th>
                    <th className="h-10 px-4 text-right align-middle font-medium text-gray-700">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredInventory.map((vehicle) => {
                    const days = vehicle.inventory_days || 0;
                    const statusColor = 
                      days > 90 ? 'bg-red-100 text-red-900' :
                      days > 60 ? 'bg-orange-100 text-orange-900' :
                      days > 30 ? 'bg-yellow-100 text-yellow-900' :
                      'bg-green-100 text-green-900';
                    
                    return (
                      <tr key={vehicle._id} className="border-b transition-colors hover:bg-gray-50">
                        <td className="p-4 align-middle font-mono text-sm">{vehicle._id}</td>
                        <td className="p-4 align-middle font-semibold">{vehicle.model}</td>
                        <td className="p-4 align-middle">{vehicle.purchase_division}</td>
                        <td className="p-4 align-middle">
                          {new Date(vehicle.purchase_date).toLocaleDateString('en-IN')}
                        </td>
                        <td className="p-4 align-middle text-right font-bold">
                          {days} days
                        </td>
                        <td className="p-4 align-middle text-right">
                          <span className={`px-3 py-1 rounded-full text-xs font-bold ${statusColor}`}>
                            {days > 90 ? 'Critical' : days > 60 ? 'High Risk' : days > 30 ? 'Monitor' : 'Fresh'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            
            {filteredInventory.length === 0 && (
              <div className="p-8 text-center text-gray-500">
                <Search className="mx-auto h-12 w-12 text-gray-300 mb-2" />
                <p>No inventory matches your search</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};
