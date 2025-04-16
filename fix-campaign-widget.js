const fs = require('fs');
const path = require('path');

// Read the file
const filePath = path.join(__dirname, 'components/dashboard/platforms/tabs/CampaignWidget.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// Extract the hooks that are outside the component
const outsideHooksPattern = /\/\/ Export the component\s+export\s+\{\s+CampaignWidget\s+\};\s+\/\/ Add global listener[\s\S]+$/;
const match = content.match(outsideHooksPattern);

if (!match) {
  console.error('Could not find the useEffect hooks outside the component');
  process.exit(1);
}

// Extract the hooks code
const outsideHooks = match[0];
// Remove hooks from the original location (after component export)
content = content.replace(outsideHooksPattern, '// Export the component\nexport { CampaignWidget };');

// Extract just the hooks content, removing the export statement
const hooksCodePattern = /\/\/ Add global listener[\s\S]+$/;
const hooksMatch = outsideHooks.match(hooksCodePattern);
const hooksCode = hooksMatch ? hooksMatch[0] : '';

// Find the return statement to insert before
const returnPattern = /(\s+return\s+\([\s\S]+)(<Card[\s\S]+)/;
const returnMatch = content.match(returnPattern);

if (!returnMatch) {
  console.error('Could not find the return statement');
  process.exit(1);
}

// Insert the hooks before the return statement
content = content.replace(
  returnPattern, 
  `\n  ${hooksCode}\n$1$2`
);

// Write the modified content back to the file
fs.writeFileSync(filePath, content, 'utf8');
console.log('File successfully modified!'); 