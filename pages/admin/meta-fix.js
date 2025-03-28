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
  const [dbConnectionResult, setDbConnectionResult] = useState(null);
  const [directMetaResult, setDirectMetaResult] = useState(null);
  const [emergencyFixResult, setEmergencyFixResult] = useState(null);
  const [viewsApiResult, setViewsApiResult] = useState(null);
  const [customDateRange, setCustomDateRange] = useState({
    from: '',
    to: ''
  });
  const [schemaFixResult, setSchemaFixResult] = useState(null);

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

  const checkDatabaseConnection = async () => {
    setIsLoading(true);
    setStatus('Checking database connection...');
    
    try {
      const response = await fetch(`/api/admin/check-database-connection?token=fix-meta-data`);
      const data = await response.json();
      
      setDbConnectionResult(data);
      
      if (data.success) {
        setStatus(`Database connection check complete: ${data.data.metaInsightsCount} Meta insights records found`);
      } else {
        setStatus(`Database connection error: ${data.error}`);
      }
    } catch (error) {
      console.error('Error checking database connection:', error);
      setStatus(`Error: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const checkDirectMeta = async () => {
    if (!brandId) {
      setStatus('Error: Please enter a brand ID');
      return;
    }

    setIsLoading(true);
    setStatus('Checking Meta API directly...');
    
    try {
      const response = await fetch(`/api/admin/direct-meta-check?token=fix-meta-data&brandId=${brandId}`);
      const data = await response.json();
      
      setDirectMetaResult(data);
      
      if (data.success) {
        if (data.insights.success) {
          setStatus(`Meta API check complete: Found ${data.insights.recordCount} insight records directly from Meta API`);
        } else {
          setStatus(`Meta API check complete but couldn't fetch insights: ${data.insights.error?.message || 'Unknown error'}`);
        }
      } else {
        setStatus(`Meta API check error: ${data.error}`);
      }
    } catch (error) {
      console.error('Error checking Meta API:', error);
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

  const emergencyFix = async () => {
    if (!brandId) {
      setStatus('Error: Please enter a brand ID');
      return;
    }

    setIsLoading(true);
    setStatus('EMERGENCY FIX: Direct database sync in progress...');
    
    try {
      const response = await fetch(`/api/admin/force-meta-fix?token=fix-meta-data&brandId=${brandId}&days=${days}`);
      const data = await response.json();
      
      setEmergencyFixResult(data);
      
      if (data.success) {
        setStatus(`🚨 EMERGENCY FIX COMPLETE: Inserted ${data.stats.totalInserted} records directly into database!`);
      } else {
        setStatus(`🚨 EMERGENCY FIX FAILED: ${data.error}`);
      }
    } catch (error) {
      console.error('Error with emergency fix:', error);
      setStatus(`Error: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const debugViewsApi = async () => {
    if (!brandId) {
      setStatus('Error: Please enter a brand ID');
      return;
    }

    setIsLoading(true);
    setStatus('Debugging Views/Reach API endpoint...');
    
    try {
      const queryParams = new URLSearchParams({
        token: 'fix-meta-data',
        brandId
      });
      
      if (customDateRange.from && customDateRange.to) {
        queryParams.append('from', customDateRange.from);
        queryParams.append('to', customDateRange.to);
      }
      
      const response = await fetch(`/api/admin/debug-views-api?${queryParams.toString()}`);
      const data = await response.json();
      
      setViewsApiResult(data);
      
      if (data.success) {
        const { recordCount, recordsWithViews, totalViews } = data.debug.rawData;
        setStatus(`Views API debug: ${recordCount} records found, ${recordsWithViews} with views data, totaling ${totalViews} views`);
      } else {
        setStatus(`Views API debug error: ${data.error}`);
      }
    } catch (error) {
      console.error('Error debugging Views API:', error);
      setStatus(`Error: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const runSchemaFix = async () => {
    setIsLoading(true);
    setStatus('Running database schema fix...');
    
    try {
      const response = await fetch(`/api/admin/run-schema-fix?token=fix-meta-data`);
      const data = await response.json();
      
      setSchemaFixResult(data);
      
      if (data.success) {
        setStatus(`Schema fix complete: ${data.message}`);
      } else {
        setStatus(`Schema fix error: ${data.error}`);
      }
    } catch (error) {
      console.error('Error running schema fix:', error);
      setStatus(`Error: ${error.message}`);
      setSchemaFixResult({ error: error.message });
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
        
        {/* Custom date range for debugging */}
        <div className="bg-gray-50 dark:bg-gray-900 p-3 rounded-md mb-4">
          <h3 className="text-sm font-medium mb-2">Custom Date Range for Debugging</h3>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <label htmlFor="fromDate" className="block text-xs mb-1">From Date</label>
              <input
                type="date"
                id="fromDate"
                value={customDateRange.from}
                onChange={(e) => setCustomDateRange(prev => ({ ...prev, from: e.target.value }))}
                className="px-3 py-2 border rounded-md w-full text-sm dark:bg-gray-800 dark:border-gray-700"
                disabled={isLoading}
              />
            </div>
            <div className="flex-1">
              <label htmlFor="toDate" className="block text-xs mb-1">To Date</label>
              <input
                type="date"
                id="toDate"
                value={customDateRange.to}
                onChange={(e) => setCustomDateRange(prev => ({ ...prev, to: e.target.value }))}
                className="px-3 py-2 border rounded-md w-full text-sm dark:bg-gray-800 dark:border-gray-700"
                disabled={isLoading}
              />
            </div>
            <div className="flex-none self-end">
              <button
                onClick={debugViewsApi}
                disabled={isLoading}
                className="px-3 py-2 bg-teal-500 text-white rounded-md hover:bg-teal-600 disabled:opacity-50 text-sm"
              >
                {isLoading && viewsApiResult === null ? 'Debugging...' : 'Debug Views API'}
              </button>
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-1">Use this to debug the Views API endpoint with specific dates</p>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <button 
            onClick={runDiagnostics}
            disabled={isLoading || !brandId}
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50"
          >
            Run Diagnostics
          </button>

          <button
            onClick={checkDatabaseConnection}
            disabled={isLoading}
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50"
          >
            Check Database Connection
          </button>

          <button
            onClick={checkDirectMeta}
            disabled={isLoading || !brandId}
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50"
          >
            Direct Meta API Check
          </button>

          <button
            onClick={checkDatabase}
            disabled={isLoading || !brandId}
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50"
          >
            Check Database for Views Data
          </button>

          <button
            onClick={resyncMetaData}
            disabled={isLoading || !brandId}
            className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded disabled:opacity-50"
          >
            Force Resync Meta Data
          </button>

          <button
            onClick={emergencyFix}
            disabled={isLoading || !brandId}
            className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded disabled:opacity-50"
          >
            🚨 EMERGENCY META FIX
          </button>
          
          <button
            onClick={runSchemaFix}
            disabled={isLoading}
            className="bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded disabled:opacity-50"
          >
            🔧 Fix Database Schema
          </button>
        </div>
        
        <div className="bg-gray-200 dark:bg-gray-700 p-3 rounded">
          <p className="font-mono">{status}</p>
        </div>
      </div>

      {/* Database Connection Results */}
      {dbConnectionResult && (
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow mb-6">
          <h2 className="text-lg font-semibold mb-2">Database Connection Results</h2>
          
          <div className="space-y-2 mb-4">
            <p><strong>Database Connected:</strong> {dbConnectionResult.database.connected ? '✅ Yes' : '❌ No'}</p>
            <p><strong>Meta Insights Table Exists:</strong> {dbConnectionResult.tables.metaAdInsightsExists ? '✅ Yes' : '❌ No'}</p>
            <p><strong>Total Tables:</strong> {dbConnectionResult.tables.totalTables}</p>
            <p><strong>Brands Count:</strong> {dbConnectionResult.data.brandsCount}</p>
            <p><strong>Meta Connections Count:</strong> {dbConnectionResult.data.metaConnectionsCount}</p>
            <p><strong>Meta Insights Count:</strong> {dbConnectionResult.data.metaInsightsCount}</p>
            
            <div className="bg-gray-100 dark:bg-gray-700 p-2 rounded">
              <p className="text-sm mb-1">
                <strong>Status:</strong> {dbConnectionResult.database.connected 
                  ? '✅ Database is connected' 
                  : '❌ Database connection issue'}
              </p>
              
              {dbConnectionResult.database.error && (
                <p className="text-sm text-red-600 dark:text-red-400">
                  Error: {dbConnectionResult.database.error}
                </p>
              )}
            </div>
          </div>
          
          <div className="bg-gray-100 dark:bg-gray-700 p-2 rounded overflow-auto max-h-60">
            <pre className="text-xs">{JSON.stringify(dbConnectionResult, null, 2)}</pre>
          </div>
        </div>
      )}

      {/* Direct Meta API Check Results */}
      {directMetaResult && (
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow mb-6">
          <h2 className="text-lg font-semibold mb-2">Direct Meta API Check Results</h2>
          
          <div className="space-y-2 mb-4">
            <p><strong>Connection:</strong> ID: {directMetaResult.connection?.id}</p>
            <p><strong>Ad Accounts:</strong> {directMetaResult.accounts?.count || 0} found</p>
            <p><strong>Insights API:</strong> {directMetaResult.insights?.success ? '✅ Working' : '❌ Error'}</p>
            <p><strong>Insights Records:</strong> {directMetaResult.insights?.recordCount || 0}</p>
            
            <div className="bg-gray-100 dark:bg-gray-700 p-2 rounded">
              <p className="text-sm mb-1">
                <strong>Status:</strong> {directMetaResult.insights?.success 
                  ? '✅ Meta API is working correctly' 
                  : '❌ Meta API returned an error'}
              </p>
              
              {directMetaResult.insights?.error && (
                <p className="text-sm text-red-600 dark:text-red-400">
                  Error: {JSON.stringify(directMetaResult.insights.error)}
                </p>
              )}
            </div>
          </div>
          
          {directMetaResult.insights?.sampleData && (
            <div>
              <h3 className="font-semibold mb-2">Sample Data:</h3>
              <div className="bg-gray-100 dark:bg-gray-700 p-2 rounded overflow-auto max-h-40">
                <pre className="text-xs">{JSON.stringify(directMetaResult.insights.sampleData, null, 2)}</pre>
              </div>
            </div>
          )}
        </div>
      )}

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

      {/* Emergency Fix Results */}
      {emergencyFixResult && (
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow mb-6 border-2 border-red-500">
          <h2 className="text-lg font-semibold mb-2 text-red-500">🚨 Emergency Fix Results</h2>
          
          <div className="space-y-2 mb-4">
            <p><strong>Records Fetched:</strong> {emergencyFixResult.stats?.totalFetched || 0}</p>
            <p><strong>Records Inserted:</strong> {emergencyFixResult.stats?.totalInserted || 0}</p>
            <p><strong>Date Range:</strong> {emergencyFixResult.stats?.dateRange?.from} to {emergencyFixResult.stats?.dateRange?.to}</p>
            
            <div className="bg-gray-100 dark:bg-gray-700 p-2 rounded">
              <p className="text-sm mb-1">
                <strong>Status:</strong> {emergencyFixResult.success 
                  ? '✅ Emergency fix completed successfully' 
                  : '❌ Emergency fix failed'}
              </p>
              
              {emergencyFixResult.error && (
                <p className="text-sm text-red-600 dark:text-red-400">
                  Error: {emergencyFixResult.error}
                </p>
              )}
              
              {emergencyFixResult.success && (
                <div className="mt-2">
                  <p className="text-sm text-green-600 dark:text-green-400">
                    ✅ Data has been directly inserted into the database!
                  </p>
                  <p className="text-sm mt-1">
                    You should now go to the dashboard and check if your Meta data is appearing correctly.
                  </p>
                </div>
              )}
            </div>
          </div>
          
          {emergencyFixResult.fetchErrors && emergencyFixResult.fetchErrors.length > 0 && (
            <div className="mt-3">
              <h3 className="font-semibold mb-1">Fetch Errors:</h3>
              <div className="bg-gray-100 dark:bg-gray-700 p-2 rounded overflow-auto max-h-40">
                <pre className="text-xs">{JSON.stringify(emergencyFixResult.fetchErrors, null, 2)}</pre>
              </div>
            </div>
          )}
          
          {emergencyFixResult.insertErrors && emergencyFixResult.insertErrors.length > 0 && (
            <div className="mt-3">
              <h3 className="font-semibold mb-1">Insert Errors:</h3>
              <div className="bg-gray-100 dark:bg-gray-700 p-2 rounded overflow-auto max-h-40">
                <pre className="text-xs">{JSON.stringify(emergencyFixResult.insertErrors, null, 2)}</pre>
              </div>
            </div>
          )}
          
          {emergencyFixResult.sampleInsight && (
            <div className="mt-3">
              <h3 className="font-semibold mb-1">Sample Record:</h3>
              <div className="bg-gray-100 dark:bg-gray-700 p-2 rounded overflow-auto max-h-40">
                <pre className="text-xs">{JSON.stringify(emergencyFixResult.sampleInsight, null, 2)}</pre>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Views API Debug Results */}
      {viewsApiResult && (
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow mb-6 border-2 border-teal-500">
          <h2 className="text-lg font-semibold mb-2 text-teal-500">Views API Debug Results</h2>
          
          <div className="space-y-2 mb-4">
            <p><strong>Total Records:</strong> {viewsApiResult.debug?.rawData?.recordCount || 0}</p>
            <p><strong>Records With Views:</strong> {viewsApiResult.debug?.rawData?.recordsWithViews || 0}</p>
            <p><strong>Total Views Value:</strong> {viewsApiResult.debug?.rawData?.totalViews || 0}</p>
            <p><strong>Date Range:</strong> {viewsApiResult.debug?.params?.from} to {viewsApiResult.debug?.params?.to}</p>
            
            <div className="bg-gray-100 dark:bg-gray-700 p-2 rounded">
              <p className="text-sm mb-1">
                <strong>API Output Simulation:</strong> {viewsApiResult.debug?.viewsApiSimulation?.explanation}
              </p>
              
              {viewsApiResult.debug?.rawData?.recordsWithViews === 0 && (
                <p className="text-sm text-red-600 dark:text-red-400 mt-2">
                  ⚠️ The Views widget shows zero because there are no records with reach &gt; 0 in the date range.
                  <br />Try using the Emergency Fix to populate the database with fresh data.
                </p>
              )}
            </div>
          </div>
          
          {viewsApiResult.debug?.rawData?.recordSample && viewsApiResult.debug.rawData.recordSample.length > 0 && (
            <div className="mt-3">
              <h3 className="font-semibold mb-1">Sample Records:</h3>
              <div className="bg-gray-100 dark:bg-gray-700 p-2 rounded overflow-auto max-h-40">
                <pre className="text-xs">{JSON.stringify(viewsApiResult.debug.rawData.recordSample, null, 2)}</pre>
              </div>
            </div>
          )}
          
          {viewsApiResult.debug?.sampleFullRecords && viewsApiResult.debug.sampleFullRecords.length > 0 && (
            <div className="mt-3">
              <h3 className="font-semibold mb-1">Full Record Samples:</h3>
              <div className="bg-gray-100 dark:bg-gray-700 p-2 rounded overflow-auto max-h-60">
                <pre className="text-xs">{JSON.stringify(viewsApiResult.debug.sampleFullRecords, null, 2)}</pre>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Schema Fix Results */}
      {schemaFixResult && (
        <div className="mt-6">
          <h2 className="text-xl font-semibold mb-2">Database Schema Fix Results</h2>
          <div className="bg-white shadow overflow-hidden rounded-lg p-4 mb-4">
            <div className="flex items-center mb-2">
              <span className="font-semibold mr-2">Status:</span>
              <span className={schemaFixResult.success ? "text-green-600" : "text-red-600"}>
                {schemaFixResult.success ? "✅ Success" : "❌ Failed"}
              </span>
            </div>
            
            {schemaFixResult.success && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="font-semibold">Meta insights table exists:</span> {' '}
                    <span className={schemaFixResult.tableExists ? "text-green-600" : "text-red-600"}>
                      {schemaFixResult.tableExists ? "✅ Yes" : "❌ No"}
                    </span>
                  </div>
                  <div>
                    <span className="font-semibold">Views column exists:</span> {' '}
                    <span className={schemaFixResult.viewsColumnExists ? "text-green-600" : "text-red-600"}>
                      {schemaFixResult.viewsColumnExists ? "✅ Yes" : "❌ No"}
                    </span>
                  </div>
                </div>
                
                <div className="mt-4">
                  <p className="text-green-600 font-medium">
                    Database schema updated. Now use the Emergency Meta Fix button to reload data.
                  </p>
                </div>
              </>
            )}
            
            {schemaFixResult.error && (
              <div className="bg-red-50 p-3 rounded border border-red-100 mt-2">
                <p className="text-red-600 font-medium">Error: {schemaFixResult.error}</p>
                {schemaFixResult.details && (
                  <p className="text-red-500 mt-1">{schemaFixResult.details}</p>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      <div className="mt-8 bg-yellow-50 border border-yellow-200 p-4 rounded-md">
        <h3 className="text-xl font-semibold mb-2">Troubleshooting Tips</h3>
        <ul className="list-disc pl-5">
          <li>If diagnostics show Meta API is working but you still see zero values, try the Force Resync option</li>
          <li>After resyncing, refresh your dashboard completely (hard refresh with Ctrl+F5)</li>
          <li>Check if the reach field appears in the diagnostic data - this is what powers the "Views" widget</li>
          <li className="text-red-600 font-medium">The issue is that the API doesn't support "page_views" field - it should be using "reach" for views data. Run the <code>scripts/update_meta_schema.sql</code> script to fix the database schema, then use Emergency Meta Fix.</li>
          <li>If all else fails, contact support with your diagnostic results</li>
        </ul>
      </div>
    </div>
  );
} 