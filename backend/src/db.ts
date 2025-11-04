import { Pool } from 'pg'; // 'pg' is the postgres driver we installed

// Create a new connection pool
const pool = new Pool({
  // 'DATABASE_URL' is the environment variable we set in
  // the .env file and passed via docker-compose.
  connectionString: process.env.DATABASE_URL,
  
  // Since we are running inside Docker's internal network
  // and not on the public internet, we do NOT need SSL.
  ssl: false, 
});

// A simple query function
export const query = (text: string, params?: any[]) => {
  return pool.query(text, params);
};

// Log a message when we successfully connect
pool.connect((err, client, release) => {
  if (err) {
    console.error('Error acquiring client', err.stack);
  } else if (client) {
    console.log('✅ Database connection successful');
    release();
  }
});

export default pool;