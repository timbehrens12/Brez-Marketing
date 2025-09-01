// Environment Check Script
// Run with: node scripts/check-env.js

console.log('🔍 Checking environment configuration...\n')

// Check OpenAI API Key
const openaiKey = process.env.OPENAI_API_KEY
if (openaiKey) {
  console.log('✅ OPENAI_API_KEY is configured')
  console.log(`   Key starts with: ${openaiKey.substring(0, 7)}...`)
} else {
  console.log('❌ OPENAI_API_KEY is NOT configured')
  console.log('   Please add your OpenAI API key to .env.local:')
  console.log('   OPENAI_API_KEY=your_api_key_here')
  console.log('   Get your key from: https://platform.openai.com/api-keys')
}

console.log('\n📋 Current environment variables:')
Object.keys(process.env)
  .filter(key => key.includes('OPENAI') || key.includes('API'))
  .forEach(key => {
    const value = process.env[key]
    if (value) {
      console.log(`   ${key}: ${value.substring(0, 10)}...`)
    } else {
      console.log(`   ${key}: (not set)`)
    }
  })

console.log('\n💡 To fix the 504 error:')
console.log('1. Create .env.local file in project root')
console.log('2. Add: OPENAI_API_KEY=your_actual_api_key')
console.log('3. Restart your development server')
console.log('4. Test the outreach tool again') 