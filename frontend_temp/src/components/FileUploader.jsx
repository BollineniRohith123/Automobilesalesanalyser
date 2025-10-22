import React, { useCallback, useState } from 'react';
import { Upload, X, FileText, CheckCircle, AlertCircle } from 'lucide-react';
import { useDashboard } from '../context/DashboardContext';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { toast } from 'sonner';

export const FileUploader = () => {
  const { uploadFiles, isUploading } = useDashboard();
  const [isDragging, setIsDragging] = useState(false);

  const handleDrop = useCallback(async (e) => {
    e.preventDefault();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files).filter(file => 
      file.name.toLowerCase().endsWith('.csv')
    );

    if (files.length === 0) {
      toast.error('Please upload CSV files only');
      return;
    }

    const uploaded = await uploadFiles(files);
    toast.success(`${uploaded.length} file(s) uploaded successfully`);
  }, [uploadFiles]);

  const handleFileInput = useCallback(async (e) => {
    const files = Array.from(e.target.files);
    if (files.length > 0) {
      const uploaded = await uploadFiles(files);
      toast.success(`${uploaded.length} file(s) uploaded successfully`);
    }
    e.target.value = '';
  }, [uploadFiles]);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  return (
    <Card
      data-testid="file-uploader"
      className={`p-8 border-2 border-dashed transition-all duration-200 ${
        isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
      }`}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
    >
      <div className="flex flex-col items-center justify-center space-y-4">
        <div className="p-4 rounded-full bg-gradient-to-br from-blue-100 to-indigo-100">
          <Upload className="w-8 h-8 text-blue-600" />
        </div>
        
        <div className="text-center">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Upload Your CSV Files
          </h3>
          <p className="text-sm text-gray-600 mb-4">
            Drag and drop your sales or purchase files here, or click to browse
          </p>
        </div>

        <input
          type="file"
          id="file-input"
          multiple
          accept=".csv"
          onChange={handleFileInput}
          className="hidden"
          data-testid="file-input"
        />
        <label htmlFor="file-input">
          <Button
            asChild
            disabled={isUploading}
            data-testid="upload-button"
            className="cursor-pointer"
          >
            <span>
              {isUploading ? 'Uploading...' : 'Select Files'}
            </span>
          </Button>
        </label>

        <p className="text-xs text-gray-500">
          Supports: ev_sales, pv_sales, ev_purchases, pv_purchases CSV files
        </p>
      </div>
    </Card>
  );
};