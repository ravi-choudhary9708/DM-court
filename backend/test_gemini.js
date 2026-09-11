require('dotenv').config();
const { GoogleGenAI } = require('@google/genai');

async function run() {
  console.log('--- Vertex AI Test (Service Account) ---');
  console.log('Project:', process.env.GOOGLE_CLOUD_PROJECT);
  console.log('Location:', process.env.GOOGLE_CLOUD_LOCATION);

  try {
    // With GOOGLE_APPLICATION_CREDENTIALS set, we don't pass an apiKey
    const client = new GoogleGenAI({
      vertexai: true,
      project: process.env.GOOGLE_CLOUD_PROJECT,
      location: process.env.GOOGLE_CLOUD_LOCATION
    });

    const response = await client.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: 'Hello, say "Vertex AI is working with my Service Account!" in one sentence. and explain about yourself'
    });

    console.log('\n✅ SUCCESS! Response:');
    console.log(response.text);
  } catch (err) {
    console.error('\n❌ ERROR:', err.message);
    if (err.status) console.error('HTTP Status:', err.status);
  }
}

run();

