import 'dotenv/config'
import { readFile } from 'node:fs/promises'
import { pool } from './db.js'

try {
  const schema = await readFile(new URL('./schema.sql', import.meta.url), 'utf8')
  await pool.query(schema)
  console.log('ForestGuard PostgreSQL tables are ready.')
} catch (error) {
  console.error('Could not prepare PostgreSQL schema:', error.message)
  process.exitCode = 1
} finally {
  await pool.end()
}
