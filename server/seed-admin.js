import 'dotenv/config'
import bcrypt from 'bcryptjs'
import { pool } from './db.js'

const email = process.env.ADMIN_EMAIL?.trim().toLowerCase()
const password = process.env.ADMIN_PASSWORD
const name = process.env.ADMIN_NAME || 'Forest Administrator'
if (!email || !password || password.length < 12) {
  console.error('Set ADMIN_EMAIL and ADMIN_PASSWORD (at least 12 characters) in .env.')
  process.exitCode = 1
} else {
  try {
    const passwordHash = await bcrypt.hash(password, 12)
    await pool.query(
      `INSERT INTO users(name,email,password_hash,role) VALUES($1,$2,$3,'ADMIN')
       ON CONFLICT(email) DO UPDATE SET name=EXCLUDED.name,password_hash=EXCLUDED.password_hash,role='ADMIN'`,
      [name, email, passwordHash],
    )
    console.log(`Administrator account is ready for ${email}.`)
  } catch (error) {
    console.error('Could not create administrator:', error.message)
    process.exitCode = 1
  } finally {
    await pool.end()
  }
}
