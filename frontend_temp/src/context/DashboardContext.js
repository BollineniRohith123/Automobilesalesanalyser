import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { toast } from 'sonner';

const DashboardContext = createContext();

export const useDashboard = () => {
  const context = useContext(DashboardContext);
  if (!context) {
    throw new Error('useDashboard must be used within DashboardProvider');
  }
  return context;
};

export const DashboardProvider = ({ children }) => {
  const [isUploading, setIsUploading] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [redundantPurchases, setRedundantPurchases] = useState([]);
  const [inventoryAging, setInventoryAging] = useState([]);
  const [dashboardStats, setDashboardStats] = useState(null);
  const [files, setFiles] = useState([]); // For upload tracking only

  const API_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

  // Fetch all analytical data from backend
  const fetchData = useCallback(async (silent = false) => {
    setIsLoading(true);
    try {
      const [redundantRes, agingRes, statsRes] = await Promise.all([
        fetch(`${API_URL}/api/analysis/redundant-purchases`),
        fetch(`${API_URL}/api/analysis/inventory-aging`),
        fetch(`${API_URL}/api/stats/summary`)
      ]);

      if (!redundantRes.ok || !agingRes.ok || !statsRes.ok) {
        throw new Error('Failed to fetch analysis data');
      }

      const redundantData = await redundantRes.json();
      const agingData = await agingRes.json();
      const statsData = await statsRes.json();

      setRedundantPurchases(redundantData.data || []);
      setInventoryAging(agingData.data || []);
      setDashboardStats(statsData.summary || null);
      
      if (!silent) {
        toast.success('Dashboard data refreshed successfully!');
      }

    } catch (error) {
      console.error('Failed to fetch data:', error);
      if (!silent) {
        toast.error('Could not load dashboard data from server');
      }
    } finally {
      setIsLoading(false);
    }
  }, [API_URL]);

  // Initial data load (silent - don't show toast on page load)
  useEffect(() => {
    fetchData(true);
  }, [fetchData]);

  // Upload files to backend for processing
  const uploadFiles = useCallback(async (fileList) => {
    setIsUploading(true);
    const formData = new FormData();
    
    Array.from(fileList).forEach(file => {
      formData.append('files', file);
    });

    try {
      const response = await fetch(`${API_URL}/api/upload`, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'File upload failed');
      }

      const result = await response.json();
      
      // Add file metadata for display
      const newFileMetadata = Array.from(fileList).map(f => ({
        id: `${Date.now()}-${Math.random()}`,
        name: f.name,
        size: f.size,
        uploadedAt: new Date()
      }));
      
      setFiles(prev => [...prev, ...newFileMetadata]);
      
      const stats = result.stats || {};
      toast.success(
        `Processing complete! Purchases: ${stats.purchases_processed || 0}, Sales: ${stats.sales_processed || 0}, Redundant: ${stats.redundant_purchases_detected || 0}`
      );

      // Refresh dashboard data after upload
      await fetchData();

    } catch (error) {
      console.error('Upload error:', error);
      toast.error(`Upload failed: ${error.message}`);
    } finally {
      setIsUploading(false);
    }
  }, [API_URL, fetchData]);

  // Clear all data from server
  const clearAllData = useCallback(async () => {
    if (!window.confirm('Are you sure you want to delete ALL vehicle data from the server? This action cannot be undone.')) {
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/data/clear-all`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error('Failed to clear data');
      }

      // Clear local state immediately
      setFiles([]);
      setRedundantPurchases([]);
      setInventoryAging([]);
      setDashboardStats(null);
      
      toast.success('All server data has been cleared');
      
      // Fetch data silently to confirm server is empty (without showing success toast)
      await fetchData(true);

    } catch (error) {
      console.error('Clear data error:', error);
      toast.error('Failed to clear server data');
    } finally {
      setIsLoading(false);
    }
  }, [API_URL, fetchData]);

  const removeFile = useCallback((fileId) => {
    setFiles(prev => prev.filter(f => f.id !== fileId));
  }, []);

  const value = {
    isUploading,
    isLoading,
    redundantPurchases,
    inventoryAging,
    dashboardStats,
    files,
    uploadFiles,
    clearAllData,
    removeFile,
    fetchData
  };

  return (
    <DashboardContext.Provider value={value}>
      {children}
    </DashboardContext.Provider>
  );
};