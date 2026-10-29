import pg from 'pg'

const { Pool } = pg
if (!process.env.DATABASE_URL) {
  console.warn('DATABASE_URL is not set. Configure PostgreSQL before starting the app.')
}

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.PGSSL === 'true' ? { rejectUnauthorized: false } : undefined,
})

pool.on('error', (error) => console.error('Unexpected PostgreSQL pool error:', error))
