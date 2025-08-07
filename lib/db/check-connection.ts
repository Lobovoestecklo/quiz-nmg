import 'server-only';
import postgres from 'postgres';

export async function checkDatabaseConnection() {
  try {
    if (!process.env.POSTGRES_URL) {
      console.error('❌ POSTGRES_URL is not defined');
      return false;
    }

    const client = postgres(process.env.POSTGRES_URL, { max: 1 });

    // Test the connection
    await client`SELECT 1`;

    console.log('✅ Database connection successful');
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    return false;
  }
}
