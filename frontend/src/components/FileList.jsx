import React from 'react';
import { X, FileText, CheckCircle, Upload } from 'lucide-react';
import { useDashboard } from '../context/DashboardContext';
import { Button } from './ui/button';
import { Card } from './ui/card';

const formatFileSize = (bytes) => {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
};

export const FileList = () => {
  const { files, removeFile } = useDashboard();

  if (files.length === 0) {
    return null;
  }

  return (
    <Card className="p-6" data-testid="file-list">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Upload className="h-5 w-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900">
            Upload History
          </h3>
          <span className="text-sm text-gray-500">({files.length} files)</span>
        </div>
      </div>

      <div className="space-y-2">
        {files.map((file) => (
          <div
            key={file.id}
            data-testid={`file-card-${file.id}`}
            className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:border-gray-300 hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="p-2 rounded-lg bg-green-50">
                <CheckCircle className="w-4 h-4 text-green-600" />
              </div>
              
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-medium text-gray-900 truncate">
                  {file.name}
                </h4>
                <div className="flex items-center gap-3 text-xs text-gray-500 mt-1">
                  <span>{formatFileSize(file.size)}</span>
                  <span>•</span>
                  <span>{new Date(file.uploadedAt).toLocaleString('en-IN')}</span>
                </div>
              </div>
            </div>

            <Button
              variant="ghost"
              size="icon"
              onClick={() => removeFile(file.id)}
              data-testid={`remove-file-${file.id}`}
              className="text-gray-400 hover:text-red-600 hover:bg-red-50 ml-2"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        ))}
      </div>
    </Card>
  );
};