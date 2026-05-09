// Test: run through the full bypass and report result
const { bypass } = require('./bypass');

(async () => {
  const url = process.argv[2] || 'https://linkshortx.in/dWSIi';
  console.log('Testing:', url);
  try {
    const result = await bypass(url, msg => console.log('[LOG]', msg));
    console.log('\nRESULT:', JSON.stringify(result, null, 2));
  } catch (e) {
    console.error('ERROR:', e.message);
  }
})();
