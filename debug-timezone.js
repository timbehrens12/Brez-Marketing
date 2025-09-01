// Debug script to test timezone handling
console.log('🕐 TIMEZONE DEBUG SCRIPT');
console.log('=======================');

const now = new Date();
console.log(`Current time: ${now.toString()}`);
console.log(`Current UTC time: ${now.toISOString()}`);
console.log(`Timezone offset: ${now.getTimezoneOffset()} minutes`);
console.log(`Timezone: ${Intl.DateTimeFormat().resolvedOptions().timeZone}`);

// Test today's date range
const today = new Date();
const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0, 0);
const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);

console.log('\n📅 Today date range:');
console.log(`Start of day local: ${startOfDay.toString()}`);
console.log(`Start of day UTC: ${startOfDay.toISOString()}`);
console.log(`End of day local: ${endOfDay.toString()}`);
console.log(`End of day UTC: ${endOfDay.toISOString()}`);

// Test a specific date
const testDate = new Date('2024-08-20');
const testStartOfDay = new Date(testDate.getFullYear(), testDate.getMonth(), testDate.getDate(), 0, 0, 0, 0);
const testEndOfDay = new Date(testDate.getFullYear(), testDate.getMonth(), testDate.getDate(), 23, 59, 59, 999);

console.log('\n📅 Test date (2024-08-20) range:');
console.log(`Start of day local: ${testStartOfDay.toString()}`);
console.log(`Start of day UTC: ${testStartOfDay.toISOString()}`);
console.log(`End of day local: ${testEndOfDay.toString()}`);
console.log(`End of day UTC: ${testEndOfDay.toISOString()}`);
