const fs = require('fs');
const path = require('path');

// Path to the file
const filePath = path.join(__dirname, 'components', 'dashboard', 'GreetingWidget.tsx');

// Read the file
let content = fs.readFileSync(filePath, 'utf8');

// Add isAiLoading state
content = content.replace(
  'const [isLoading, setIsLoading] = useState(true)',
  'const [isLoading, setIsLoading] = useState(true)\n  const [isAiLoading, setIsAiLoading] = useState(false)'
);

// Update fetchPeriodData to set isAiLoading
content = content.replace(
  'const fetchPeriodData = async () => {\n    setIsLoading(true)',
  'const fetchPeriodData = async () => {\n    setIsLoading(true)\n    setIsAiLoading(true)'
);

// Update the final part of fetchPeriodData to reset isAiLoading
content = content.replace(
  '// Set real data\n      setDailyReport(dailyRpt)\n      setMonthlyReport(monthlyRpt)',
  '// Set real data\n      setDailyReport(dailyRpt)\n      setMonthlyReport(monthlyRpt)\n      \n      setIsAiLoading(false)'
);

// Add isAiLoading(false) to catch block
content = content.replace(
  'console.error(\'Error in fetchPeriodData:\', error)\n      setSynopsis("Error loading your brand snapshot.")',
  'console.error(\'Error in fetchPeriodData:\', error)\n      setSynopsis("Error loading your brand snapshot.")\n      setIsAiLoading(false)'
);

// Update the daily report section to show loading indicator
content = content.replace(
  '{(!dailyReport || dailyReport.revenueGenerated === 0) ? (',
  '{isAiLoading ? (\n                          <div className="py-6">\n                            <div className="flex justify-center">\n                              <Loader2 className="h-8 w-8 animate-spin text-blue-400" />\n                            </div>\n                            <p className="text-center text-gray-300 mt-2">Analyzing your performance data...</p>\n                          </div>\n                        ) : (!dailyReport || dailyReport.revenueGenerated === 0) ? ('
);

// Update the monthly report section to show loading indicator
content = content.replace(
  '{(!monthlyReport || monthlyReport.revenueGenerated === 0) ? (',
  '{isAiLoading ? (\n                          <div className="py-6">\n                            <div className="flex justify-center">\n                              <Loader2 className="h-8 w-8 animate-spin text-blue-400" />\n                            </div>\n                            <p className="text-center text-gray-300 mt-2">Analyzing your performance data...</p>\n                          </div>\n                        ) : (!monthlyReport || monthlyReport.revenueGenerated === 0) ? ('
);

// Write the updated content back to the file
fs.writeFileSync(filePath, content, 'utf8');

console.log('GreetingWidget.tsx has been updated successfully with isAiLoading state and loading indicators!');
