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
        <div className="mt-4 bg-blue-100 dark:bg-blue-900 p-3 rounded">
          <p className="font-semibold">Views Widget Fix:</p>
          <p>The "Views" widget now uses the <code>views</code> column in the database, which stores the number of people who saw your ads (previously from the <code>reach</code> field in Meta API). This database column stores the view count data directly for better performance and reliability.</p>
        </div>

        <div className="mt-4 bg-green-100 dark:bg-green-900 p-3 rounded">
          <p className="font-semibold">Database Changes:</p>
          <p>A new <code>views</code> column has been added to the <code>meta_ad_insights</code> table. This column is populated from the <code>reach</code> data when syncing with Meta. This ensures views data is stored directly in the database for optimal performance.</p>
        </div>

        <div className="mt-4 bg-red-100 dark:bg-red-900 p-3 rounded">
          <p className="font-semibold">Meta API Update:</p>
          <p>Facebook's Meta API no longer supports the <code>page_views</code> field in ad insights. This is why you're seeing the error: "<code>page_views is not valid for fields param</code>". We've updated our code to use <code>reach</code> data instead to power the Views widget.</p>
        </div>
      </div>

      <div className="bg-yellow-100 dark:bg-yellow-900 p-4 rounded-lg mb-6">
        <h2 className="text-lg font-semibold">Database Setup Instructions</h2>
        <p className="mb-2">To properly set up the Views column in the database:</p>
        <ol className="list-decimal pl-5 space-y-2">
          <li>Run the setup script: <code>bash scripts/fix_meta_views.sh</code></li>
          <li>Resync your Meta data using the button below</li>
          <li>Refresh your dashboard to see Views data</li>
        </ol>
        <p className="mt-2 text-sm italic">Note: You only need to run the database setup once. After that, all new Meta data will automatically include Views.</p>
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
          <li>Check if the <strong>reach field</strong> appears in the diagnostic data - this is what powers the "Views" widget</li>
          <li>If all else fails, contact support with your diagnostic results</li>
        </ul>
      </div>

      {diagnosticData && (
        <div className="mt-6">
          <h3 className="text-lg font-semibold mt-4">Database Status</h3>
          {diagnosticData.databaseStatus ? (
            <div className="mt-2 bg-white dark:bg-gray-700 p-4 rounded border">
              <div className="mb-2">
                <span className="font-semibold">Views Column:</span> 
                {diagnosticData.databaseStatus.views.columnExists ? (
                  <span className="text-green-600 dark:text-green-400 ml-2">✓ Available</span>
                ) : (
                  <span className="text-red-600 dark:text-red-400 ml-2">✗ Missing</span>
                )}
              </div>
              
              <div className="mb-2">
                <span className="font-semibold">Records with Views Data:</span> 
                <span className="ml-2">{diagnosticData.databaseStatus.views.recordsWithData || 0}</span>
              </div>
              
              <div className="mb-2">
                <span className="font-semibold">Database Update Required:</span> 
                {diagnosticData.databaseStatus.views.needsUpdate ? (
                  <span className="text-red-600 dark:text-red-400 ml-2">Yes - use Force Resync</span>
                ) : (
                  <span className="text-green-600 dark:text-green-400 ml-2">No - data is up to date</span>
                )}
              </div>
            </div>
          ) : (
            <p className="text-yellow-600 dark:text-yellow-400">Database status information not available</p>
          )}
        </div>
      )}
    </div>
  );
} 