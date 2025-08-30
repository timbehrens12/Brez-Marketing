// Quick test script for template generation API
const testTemplateAPI = async () => {
  console.log('🧪 Testing Template Generation API...');

  try {
    const response = await fetch('http://localhost:3000/api/generate-from-template', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        exampleImage: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD...', // dummy base64
        productImage: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD...', // dummy base64
        additionalNotes: 'Make it more vibrant',
        brandId: 'test-brand-id',
        aspectRatio: 'portrait'
      })
    });

    const result = await response.json();
    console.log('✅ API Response:', result);

  } catch (error) {
    console.error('❌ API Test Failed:', error);
  }
};

// Uncomment to run test
// testTemplateAPI();
