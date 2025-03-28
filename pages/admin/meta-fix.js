import { useState, useEffect } from 'react';
import Head from 'next/head';

export default function MetaFixPage() {
  const [brandId, setBrandId] = useState('');
  const [brands, setBrands] = useState([]);
  const [status, setStatus] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [diagnosticData, setDiagnosticData] = useState(null);
  const [resyncResult, setResyncResult] = useState(null);
  const [dbCheckResult, setDbCheckResult] = useState(null);
  const [days, setDays] = useState(90);

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

  const checkDatabase = async () => {
    if (!brandId) {
      setStatus('Error: Please enter a brand ID');
      return;
    }

    setIsLoading(true);
    setStatus('Checking database for views/reach data...');
    
    try {
      const response = await fetch(`/api/admin/check-db-views?token=fix-meta-data&brandId=${brandId}`);
      const data = await response.json();
      
      setDbCheckResult(data);
      
      if (data.success) {
        if (data.recordsWithReach) {
          setStatus(`Database check complete: Found ${data.stats.withReach} records with reach data out of ${data.stats.total} total records`);
        } else {
          setStatus(`Database check complete: No reach data found in any of the ${data.stats.total} records. You need to resync Meta data.`);
        }
      } else {
        setStatus(`Database check error: ${data.error}`);
      }
    } catch (error) {
      console.error('Error checking database:', error);
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
      const response = await fetch(`/api/admin/resync-meta?token=fix-meta-data&brandId=${brandId}&days=${days}`);
      const data = await response.json();
      
      setResyncResult(data);
      
      if (data.success) {
        setStatus(`Resync complete: Processed ${data.count} records for the last ${days} days`);
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
          <li>Click "Check Database for Views Data" to see if there are views/reach data in the database</li>
          <li>Click "Force Resync" to pull fresh data from Meta</li>
          <li>Return to your dashboard to verify data is now showing</li>
        </ol>
        <div className="mt-4 bg-blue-100 dark:bg-blue-900 p-3 rounded">
          <p className="font-semibold">Views Widget Fix:</p>
          <p>The "Views" widget now uses the <code>reach</code> field from Meta API, which represents the number of people who saw your ads. This fix will ensure that the Views data appears correctly in your dashboard.</p>
        </div>
      </div>

      <div className="space-y-4 mb-8">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <label htmlFor="brandId" className="block text-sm font-medium mb-1">Brand ID</label>
            <input
              type="text"
              id="brandId"
              value={brandId}
              onChange={(e) => setBrandId(e.target.value)}
              className="px-3 py-2 border rounded-md w-full dark:bg-gray-800 dark:border-gray-700"
              placeholder="Enter your brand ID"
              disabled={isLoading}
            />
          </div>
          
          {brands.length > 0 && (
            <div className="flex-1">
              <label className="block text-sm font-medium mb-1">Select Brand</label>
              <select 
                className="px-3 py-2 border rounded-md w-full dark:bg-gray-800 dark:border-gray-700"
                value=""
                onChange={(e) => e.target.value && setBrandId(e.target.value)}
                disabled={isLoading}
              >
                <option value="">Select a brand</option>
                {brands.map(brand => (
                  <option key={brand.id} value={brand.id}>{brand.name}</option>
                ))}
              </select>
            </div>
          )}

          <div className="flex-1">
            <label htmlFor="days" className="block text-sm font-medium mb-1">Days to Fetch</label>
            <input
              type="number"
              id="days"
              value={days}
              onChange={(e) => setDays(Math.max(1, parseInt(e.target.value) || 30))}
              className="px-3 py-2 border rounded-md w-full dark:bg-gray-800 dark:border-gray-700"
              min="1"
              max="180"
              disabled={isLoading}
            />
            <p className="text-xs text-gray-500 mt-1">Fetches data for the last X days (30-90 recommended)</p>
          </div>
        </div>
        
        <div className="flex flex-wrap gap-4">
          <button
            onClick={runDiagnostics}
            disabled={isLoading}
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50"
          >
            {isLoading && diagnosticData === null ? 'Running...' : 'Run Diagnostics'}
          </button>
          
          <button
            onClick={checkDatabase}
            disabled={isLoading}
            className="px-4 py-2 bg-purple-500 text-white rounded-md hover:bg-purple-600 disabled:opacity-50"
          >
            {isLoading && dbCheckResult === null ? 'Checking...' : 'Check Database for Views Data'}
          </button>
          
          <button
            onClick={resyncMetaData}
            disabled={isLoading}
            className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 disabled:opacity-50"
          >
            {isLoading && resyncResult === null ? 'Resyncing...' : 'Force Resync Meta Data'}
          </button>
        </div>
        
        <div className="bg-gray-200 dark:bg-gray-700 p-3 rounded">
          <p className="font-mono">{status}</p>
        </div>
      </div>

      {dbCheckResult && (
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow mb-6">
          <h2 className="text-lg font-semibold mb-2">Database Check Results</h2>
          
          <div className="space-y-2 mb-4">
            <p><strong>Total Records:</strong> {dbCheckResult.stats.total}</p>
            <p><strong>Records with Views Data:</strong> {dbCheckResult.stats.withReach}</p>
            <p><strong>Records without Views Data:</strong> {dbCheckResult.stats.withoutReach}</p>
            
            <div className="bg-gray-100 dark:bg-gray-700 p-2 rounded">
              <p className="text-sm mb-1">
                <strong>Status:</strong> {dbCheckResult.recordsWithReach ? 
                  '✅ Database has views data' : 
                  '❌ No views data in database'}
              </p>
              
              {!dbCheckResult.recordsWithReach && (
                <p className="text-sm text-red-600 dark:text-red-400">
                  You need to resync Meta data to populate views/reach.
                </p>
              )}
            </div>
          </div>
          
          {dbCheckResult.sampleRecords && dbCheckResult.sampleRecords.length > 0 && (
            <div>
              <h3 className="font-semibold mb-2">Sample Records with Views Data:</h3>
              <div className="bg-gray-100 dark:bg-gray-700 p-2 rounded overflow-auto max-h-40">
                <pre className="text-xs">{JSON.stringify(dbCheckResult.sampleRecords, null, 2)}</pre>
              </div>
            </div>
          )}
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
    </div>
  );
} 