import { useState, useEffect } from 'react';
import Head from 'next/head';

export default function MetaFixPage() {
  const [brandId, setBrandId] = useState('');
  const [brands, setBrands] = useState([]);
  const [status, setStatus] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [diagnosticData, setDiagnosticData] = useState(null);
  const [resyncResult, setResyncResult] = useState(null);

  // Load brands from localstorage
  useEffect(() => {
    const storedBrandId = localStorage.getItem('selectedBrandId');
    if (storedBrandId) {
      setBrandId(storedBrandId);
    }
    
    try {
      const storedBrands = JSON.parse(localStorage.getItem('brands') || '[]');
      if (Array.isArray(storedBrands) && storedBrands.length > 0) {
        setBrands(storedBrands);
      }
    } catch (error) {
      console.error('Error parsing stored brands:', error);
    }
  }, []);

  const runDiagnostics = async () => {
    if (!brandId) {
      setStatus('Error: Please enter a brand ID');
      return;
    }

    setIsLoading(true);
    setStatus('Running Meta API diagnostic...');
    
    try {
      const response = await fetch(`/api/admin/check-meta-api?token=fix-meta-data&brandId=${brandId}`);
      const data = await response.json();
      
      setDiagnosticData(data);
      
      if (data.success) {
        setStatus('Diagnostic complete: Meta API connection is working');
      } else {
        setStatus(`Diagnostic error: ${data.error}`);
      }
    } catch (error) {
      console.error('Error running diagnostics:', error);
      setStatus(`Error: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const resyncMetaData = async () => {
    if (!brandId) {
      setStatus('Error: Please enter a brand ID');
      return;
    }

    setIsLoading(true);
    setStatus('Resyncing Meta data (this may take a minute)...');
    
    try {
      const response = await fetch(`/api/admin/resync-meta?token=fix-meta-data&brandId=${brandId}`);
      const data = await response.json();
      
      setResyncResult(data);
      
      if (data.success) {
        setStatus(`Resync complete: Processed ${data.count} records`);
      } else {
        setStatus(`Resync error: ${data.error}`);
      }
    } catch (error) {
      console.error('Error resyncing data:', error);
      setStatus(`Error: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <Head>
        <title>Meta Data Fix Utility</title>
      </Head>

      <h1 className="text-2xl font-bold mb-6">Meta Data Fix Utility</h1>
      
      <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg mb-6">
        <h2 className="text-lg font-semibold mb-2">Instructions</h2>
        <ol className="list-decimal pl-5 space-y-2">
          <li>Enter your brand ID or select a brand</li>
          <li>Click "Run Diagnostics" to check if Meta API is working</li>
          <li>Click "Force Resync" to pull fresh data from Meta</li>
          <li>Return to your dashboard to verify data is now showing</li>
        </ol>
      </div>

      <div className="mb-6">
        <label className="block mb-2">Brand ID</label>
        <div className="flex space-x-2">
          <input
            type="text"
            value={brandId}
            onChange={(e) => setBrandId(e.target.value)}
            className="border p-2 rounded dark:bg-gray-700 dark:border-gray-600 flex-grow"
            placeholder="Enter brand ID"
          />
          
          {brands.length > 0 && (
            <select 
              className="border p-2 rounded dark:bg-gray-700 dark:border-gray-600"
              onChange={(e) => setBrandId(e.target.value)}
              value={brandId}
            >
              <option value="">Select a brand</option>
              {brands.map(brand => (
                <option key={brand.id} value={brand.id}>
                  {brand.name || brand.id}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      <div className="flex space-x-4 mb-6">
        <button
          onClick={runDiagnostics}
          disabled={isLoading}
          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50"
        >
          Run Diagnostics
        </button>
        
        <button
          onClick={resyncMetaData}
          disabled={isLoading}
          className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded disabled:opacity-50"
        >
          Force Resync
        </button>
      </div>

      {status && (
        <div className={`p-4 rounded-lg mb-6 ${status.includes('Error') ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'}`}>
          {status}
          {isLoading && <span className="ml-2 inline-block animate-pulse">...</span>}
        </div>
      )}

      {diagnosticData && (
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-2">Diagnostic Results</h2>
          <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg overflow-auto max-h-80">
            <pre className="text-sm">{JSON.stringify(diagnosticData, null, 2)}</pre>
          </div>
        </div>
      )}

      {resyncResult && (
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-2">Resync Results</h2>
          <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg overflow-auto max-h-80">
            <pre className="text-sm">{JSON.stringify(resyncResult, null, 2)}</pre>
          </div>
        </div>
      )}

      <div className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200 p-4 rounded-lg">
        <h2 className="font-semibold mb-2">Troubleshooting Tips</h2>
        <ul className="list-disc pl-5 space-y-2">
          <li>If diagnostics show Meta API is working but you still see zero values, try the Force Resync option</li>
          <li>After resyncing, refresh your dashboard completely (hard refresh with Ctrl+F5)</li>
          <li>Check if the page_views field appears in the diagnostic data - if not, you may need to update your Meta API permissions</li>
          <li>If all else fails, contact support with your diagnostic results</li>
        </ul>
      </div>
    </div>
  );
} 