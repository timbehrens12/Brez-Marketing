// Test script to see what the AI API returns
async function testAIResponse() {
  try {
    const response = await fetch('/api/ai/analyze-marketing', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        metrics: { test: 'data' },
        brandId: 'test-brand'
      })
    });

    const result = await response.json();
    console.log('AI API Response:', result);
    console.log('Response keys:', Object.keys(result));
    console.log('Has analysis field:', !!result.analysis);
    console.log('Has result field:', !!result.result);
    console.log('Has message field:', !!result.message);
  } catch (error) {
    console.error('Error testing AI response:', error);
  }
}

// Run in browser console
testAIResponse(); 