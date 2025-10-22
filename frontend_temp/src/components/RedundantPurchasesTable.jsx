import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { AlertTriangle, Search, Filter } from 'lucide-react';
import { Input } from './ui/input';
import { Button } from './ui/button';

export const RedundantPurchasesTable = ({ data }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [divisionFilter, setDivisionFilter] = useState('all');

  // Get unique divisions for filter
  const divisions = useMemo(() => {
    if (!data || data.length === 0) return [];
    const divisionSet = new Set(data.map(item => item.purchase_division));
    return ['all', ...Array.from(divisionSet).sort()];
  }, [data]);

  // Filter data based on search and division
  const filteredData = useMemo(() => {
    if (!data) return [];
    
    return data.filter(item => {
      const matchesSearch = 
        item.model?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item._id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.purchase_division?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesDivision = 
        divisionFilter === 'all' || 
        item.purchase_division === divisionFilter;
      
      return matchesSearch && matchesDivision;
    });
  }, [data, searchTerm, divisionFilter]);

  if (!data || data.length === 0) {
    return (
      <Card className="p-6 text-center bg-green-50 border-green-200">
        <div className="flex flex-col items-center gap-3">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
            <AlertTriangle className="h-8 w-8 text-green-600" />
          </div>
          <CardTitle className="text-green-900">No Redundant Purchases Detected</CardTitle>
          <p className="text-green-700 text-sm">
            Excellent! All recent purchases were necessary. No vehicles were bought while identical models sat in other divisions.
          </p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="col-span-1 lg:col-span-2">
      <CardHeader className="bg-red-50 border-b border-red-200">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
            <div>
              <CardTitle className="text-red-900">Redundant Purchase Report</CardTitle>
              <p className="text-sm text-red-700 mt-1">
                {filteredData.length} redundant {filteredData.length === 1 ? 'purchase' : 'purchases'} detected
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search model or chassis..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 w-64"
              />
            </div>
            
            <select
              value={divisionFilter}
              onChange={(e) => setDivisionFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
            >
              {divisions.map(div => (
                <option key={div} value={div}>
                  {div === 'all' ? 'All Divisions' : div}
                </option>
              ))}
            </select>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Purchase Date</TableHead>
                <TableHead>Purchasing Division</TableHead>
                <TableHead>Vehicle Model</TableHead>
                <TableHead>Chassis No</TableHead>
                <TableHead>Existing Stock Location</TableHead>
                <TableHead className="text-right">Age of Existing Stock</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredData.map((item) => (
                <TableRow 
                  key={item._id} 
                  className="bg-red-50 hover:bg-red-100 border-b border-red-100"
                >
                  <TableCell className="font-medium">
                    {new Date(item.purchase_date).toLocaleDateString('en-IN')}
                  </TableCell>
                  <TableCell>
                    <span className="px-2 py-1 rounded-md bg-red-200 text-red-900 text-sm font-medium">
                      {item.purchase_division}
                    </span>
                  </TableCell>
                  <TableCell className="font-semibold">{item.model}</TableCell>
                  <TableCell className="font-mono text-sm">{item._id}</TableCell>
                  <TableCell>
                    <span className="px-2 py-1 rounded-md bg-yellow-100 text-yellow-900 text-sm">
                      {item.redundancy_details?.existing_stock_division || 'N/A'}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <span className="px-3 py-1 rounded-full bg-orange-100 text-orange-900 text-sm font-bold">
                      {item.redundancy_details?.existing_stock_age_at_purchase || 0} days
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        
        {filteredData.length === 0 && data.length > 0 && (
          <div className="p-8 text-center text-gray-500">
            <Filter className="mx-auto h-12 w-12 text-gray-300 mb-2" />
            <p>No results match your filters</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
