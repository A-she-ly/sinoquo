import React, { useState } from 'react';
import { Upload, Check, AlertCircle } from 'lucide-react';
import { databaseService } from '../services/database';
import { storageService } from '../services/storage';

const SupplierPage: React.FC = () => {
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setMessage(null);

    try {
      // 1. Get a supplier ID (using the first one from mock data for now, or allow selection)
      const supplierId = storageService.getSuppliers()[0].id;

      // 2. Sync to Supabase
      const result = await databaseService.syncExcelData(file, supplierId);

      if (result.success) {
        setMessage({ type: 'success', text: `Success! Synced ${result.count} items.` });
      } else {
        setMessage({ type: 'error', text: result.message });
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: 'Upload failed: ' + error.message });
    } finally {
      setUploading(false);
      // Reset input
      event.target.value = '';
    }
  };

  return (
    <div className="p-4 max-w-md mx-auto bg-white min-h-screen shadow-sm">
      <h1 className="text-xl font-bold mb-6 text-primary">Supplier Management</h1>

      <div className="mb-8">
        <h2 className="text-lg font-semibold mb-4">Upload Cost Sheet</h2>
        <p className="text-sm text-gray-500 mb-4">
          Upload Excel file (.xlsx) with columns: Description, 成本CNY, 指导价USD
        </p>

        <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-primary transition-colors relative">
          <input
            type="file"
            accept=".xlsx, .xls"
            onChange={handleFileUpload}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            disabled={uploading}
          />
          <div className="flex flex-col items-center justify-center">
            {uploading ? (
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mb-2"></div>
            ) : (
              <Upload className="w-10 h-10 text-gray-400 mb-2" />
            )}
            <span className="text-gray-600 font-medium">
              {uploading ? 'Processing...' : 'Click to Upload Excel'}
            </span>
          </div>
        </div>

        {message && (
          <div className={`mt-4 p-3 rounded-md flex items-center ${
            message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
          }`}>
            {message.type === 'success' ? (
              <Check className="w-5 h-5 mr-2" />
            ) : (
              <AlertCircle className="w-5 h-5 mr-2" />
            )}
            <span className="text-sm">{message.text}</span>
          </div>
        )}
      </div>
      
      <div className="mt-8 pt-8 border-t border-gray-100">
        <h3 className="font-medium mb-2">Supabase Configuration Status</h3>
        <div className="text-xs font-mono bg-gray-50 p-3 rounded">
          URL: {import.meta.env.VITE_SUPABASE_URL ? 'Configured ✅' : 'Missing ❌'}
          <br />
          Key: {import.meta.env.VITE_SUPABASE_ANON_KEY ? 'Configured ✅' : 'Missing ❌'}
        </div>
        {!import.meta.env.VITE_SUPABASE_URL && (
          <p className="text-xs text-red-500 mt-2">
            Please create a Supabase project and add credentials to .env
          </p>
        )}
      </div>
    </div>
  );
};

export default SupplierPage;
