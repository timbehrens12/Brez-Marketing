# Report Page Automation Features

## Overview
The brand report page includes cost-optimized automation features that provide control over report generation while minimizing unnecessary API costs.

## Cost Optimization Strategy

### Manual-First Approach
- **Default Mode**: Manual-only (automatic generation is disabled by default)
- **User Choice**: Users must explicitly enable automatic generation
- **Cost Savings**: Prevents unnecessary AI report generation when users aren't actively viewing reports

### Single Daily Report
- **Limit**: Maximum of 1 automatic report per day (reduced from 2)
- **Rationale**: Reduces OpenAI API costs by 50% while maintaining useful automation
- **Flexibility**: Users can still generate additional reports manually

## New Features Implemented

### 1. Manual-Only Mode Toggle (Default)
- **Feature**: Option to disable automatic report generation completely
- **Location**: Settings panel (Times button)
- **Default**: Disabled (cost-saving measure)
- **Functionality**: 
  - When disabled, reports can only be generated manually using the "Manual Refresh" button
  - When enabled, reports are automatically generated at the specified time
  - User preference is maintained across sessions

### 2. Single Automatic Daily Report
- **Feature**: One report automatically generated when the current time matches the configured time
- **Functionality**:
  - Automatically checks every minute if it's time to generate a report
  - Only generates reports if automatic mode is enabled
  - Prevents duplicate generation (max once per day)
  - Uses localStorage to track daily generation status
  - Silent operation (no toast notifications for auto-generated reports)

### 3. Last Month Data Sync Before Report Generation
- **Feature**: Ensures accurate data for last month reports by running a sync before generation
- **Functionality**:
  - Automatically triggered when generating reports for "Last Month" period
  - Syncs the last 45 days of data to cover the full previous month
  - Uses the existing Meta sync API with enhanced parameters
  - Continues with report generation even if sync fails (with logging)

## User Interface Changes

### Settings Panel Enhancements
- **Automatic Report Generation Toggle**: 
  - Red "Disabled" by default (cost optimization)
  - Green "Enabled" when activated by user choice
  - Contextual description explaining current mode
  - Single time picker (instead of 2) when automatic mode is enabled
  - **User preferences are automatically saved and remembered between sessions**

### Status Indicators
- **Description Text**: Updates to show current mode (automatic vs manual-only)
- **Report Button**: 
  - Shows "Auto-gen at [time]" when automatic mode is enabled
  - Shows "Manual only" when automatic mode is disabled
- **Visual Feedback**: Different colors for different states
- **Improved Styling**: Removed harsh black backgrounds for better visual appeal

## Technical Implementation

### Cost-Conscious Defaults
```typescript
const [autoTimesEnabled, setAutoTimesEnabled] = useState(() => {
  // Default to FALSE for cost savings
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('reportAutoTimesEnabled')
    return saved !== null ? JSON.parse(saved) : false
  }
  return false
})
```

### Single Time Configuration
- Removed second snapshot time to prevent excessive API usage
- Simplified UI to show one "Daily Report Time" instead of two snapshot times
- Reduced localStorage storage and complexity

### Automatic Generation Logic
- Checks every minute using `setInterval`
- Compares current time with configured snapshot time
- Uses localStorage to prevent duplicate generation and save preferences
- Only operates when:
  - Automatic mode is explicitly enabled by user
  - A brand is selected
  - Viewing "today" period
  - Current time matches the snapshot time
  - Report hasn't been auto-generated today

## Usage Instructions

### To Enable Automatic Generation:
1. Click the "Times" button in the report header
2. Toggle the "Automatic Report Generation" button to "Enabled"
3. Configure your preferred daily report time
4. Settings are automatically saved and restored next time you visit

### Cost-Conscious Usage:
1. **Default Mode**: Use manual refresh only (no API costs until you request reports)
2. **Selective Auto**: Only enable automatic generation if you check reports daily
3. **Manual Override**: You can always generate additional reports manually regardless of mode

### For Last Month Reports:
1. Select "Last Month" from the period dropdown
2. Click "Manual Refresh" (automatic generation also works if enabled)
3. System will automatically sync last month's data before generating report

## Benefits

1. **Cost Optimization**: Default manual-only mode prevents unnecessary API charges
2. **50% Reduction**: Single daily report instead of 2 cuts automatic API usage in half
3. **User Control**: Only users who actively want automation get charged for it
4. **Persistent Preferences**: All settings are automatically saved and restored between sessions
5. **Better Visual Design**: Improved styling with softer backgrounds instead of harsh black
6. **Flexible Control**: Users can choose between automatic and manual-only operation
7. **Better UX**: Clear visual indicators of current mode and status
8. **Reliability**: Duplicate generation prevention and error handling

## Cost Considerations

- **Manual Mode**: $0 API costs until user requests reports
- **Automatic Mode**: 1 OpenAI API call per day maximum (when enabled)
- **Manual Refresh**: User-initiated costs only when reports are actually needed
- **Last Month Sync**: Additional Meta API calls for data accuracy (minimal cost)
- **Smart Default**: Manual-only prevents surprise API charges for inactive users

This approach ensures you only pay for AI report generation when reports are actually being used, while still providing automation for active users who want it.