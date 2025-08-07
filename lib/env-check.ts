export function checkEnvironmentVariables() {
  const requiredVars = ['POSTGRES_URL', 'AUTH_SECRET', 'ANTHROPIC_API_KEY'];

  const missingVars = requiredVars.filter((varName) => !process.env[varName]);

  if (missingVars.length > 0) {
    console.warn('⚠️ Missing environment variables:', missingVars);
    return false;
  }

  console.log('✅ All required environment variables are set');
  return true;
}
