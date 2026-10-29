import 'dotenv/config'
import express from 'express'
import session from 'express-session'
import pgSession from 'connect-pg-simple'
import bcrypt from 'bcryptjs'
import { v2 as cloudinary } from 'cloudinary'
import { fileURLToPath } from 'node:url'
import { pool } from './db.js'

const app = express()
const port = Number(process.env.PORT || 8000)
const PgStore = pgSession(session)
const root = fileURLToPath(new URL('../', import.meta.url))

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
})

app.set('trust proxy', process.env.NODE_ENV === 'production' ? 1 : false)
app.use(express.json({ limit: '1mb' }))
app.use(session({
  store: new PgStore({ pool, tableName: 'user_sessions', createTableIfMissing: true }),
  secret: process.env.SESSION_SECRET || 'local-dev-only-change-me-before-deployment',
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', maxAge: 1000 * 60 * 60 * 24 * 7 },
}))
app.use('/static', express.static(`${root}/static`))

const asyncRoute = (handler) => (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next)
const requireUser = (req, res, next) => req.session.user ? next() : res.status(401).json({ error: 'Sign in required' })
const requireStaff = (req, res, next) => {
  if (!req.session.user) return res.status(401).json({ error: 'Sign in required' })
  if (!['ADMIN', 'OFFICER', 'RESCUE', 'TOURISM'].includes(req.session.user.role)) return res.status(403).json({ error: 'Staff access required' })
  next()
}
const sessionUser = (user) => ({ id: user.id, name: user.name, email: user.email, role: user.role })

app.get('/api/health', (_req, res) => res.json({ status: 'ok', database: 'postgresql' }))
app.get('/api/auth/session', (req, res) => res.json({ user: req.session.user || null }))
app.post('/api/auth/register', asyncRoute(async (req, res) => {
  const { name, email, password } = req.body || {}
  if (!name?.trim() || !email?.trim() || typeof password !== 'string' || password.length < 8) {
    return res.status(400).json({ error: 'Enter your name, a valid email, and a password with at least 8 characters.' })
  }
  const passwordHash = await bcrypt.hash(password, 12)
  try {
    const { rows } = await pool.query(
      'INSERT INTO users(name,email,password_hash,role) VALUES($1,$2,$3,$4) RETURNING id,name,email,role',
      [name.trim(), email.trim().toLowerCase(), passwordHash, 'CITIZEN'],
    )
    req.session.user = sessionUser(rows[0])
    res.status(201).json({ user: req.session.user })
  } catch (error) {
    if (error.code === '23505') return res.status(409).json({ error: 'An account with that email already exists.' })
    throw error
  }
}))
app.post('/api/auth/login', asyncRoute(async (req, res) => {
  const email = String(req.body?.email || '').trim().toLowerCase()
  const password = req.body?.password
  const { rows } = await pool.query('SELECT id,name,email,password_hash,role FROM users WHERE email=$1', [email])
  if (!rows[0] || typeof password !== 'string' || !(await bcrypt.compare(password, rows[0].password_hash))) {
    return res.status(401).json({ error: 'Email or password is incorrect.' })
  }
  req.session.user = sessionUser(rows[0])
  res.json({ user: req.session.user })
}))
app.post('/api/auth/logout', (req, res) => req.session.destroy(() => {
  res.clearCookie('connect.sid')
  res.status(204).end()
}))

app.get('/api/admin/overview', requireStaff, asyncRoute(async (req, res) => {
  const [counts, recent, severities] = await Promise.all([
    pool.query(`SELECT
      (SELECT COUNT(*) FROM users)::int AS users,
      (SELECT COUNT(*) FROM patrols WHERE status NOT IN ('COMPLETED','CANCELLED'))::int AS patrols,
      (SELECT COUNT(*) FROM fire_reports WHERE status <> 'RESOLVED')::int AS fires,
      (SELECT COUNT(*) FROM rescue_cases WHERE status NOT IN ('RELEASED','TRANSFERRED','CLOSED'))::int AS rescues,
      (SELECT COUNT(*) FROM plantations)::int AS plantations,
      (SELECT COUNT(*) FROM bookings WHERE visit_date=CURRENT_DATE AND status='CONFIRMED')::int AS bookings_today,
      (SELECT COUNT(*) FROM conflict_reports WHERE status NOT IN ('RESOLVED','CLOSED'))::int AS conflicts`),
    pool.query(`SELECT * FROM (
      SELECT id, 'Fire report' AS type, title, COALESCE(NULLIF(latitude::text,''),'Location pending') AS location, status, severity AS priority, created_at, is_demo AS demo FROM fire_reports
      UNION ALL
      SELECT id, 'Wildlife conflict' AS type, title, COALESCE(NULLIF(latitude::text,''),'Location pending') AS location, status, severity AS priority, created_at, FALSE AS demo FROM conflict_reports
    ) reports ORDER BY created_at DESC LIMIT 7`),
    pool.query('SELECT severity, COUNT(*)::int AS total FROM fire_reports GROUP BY severity ORDER BY severity'),
  ])
  const stats = counts.rows[0]
  res.json({ user: req.session.user, stats, recent: recent.rows.map((row) => ({ ...row, id: `${row.type === 'Fire report' ? 'F' : 'C'}-${String(row.id).padStart(4, '0')}`, severity: row.priority })), fires_by_severity: severities.rows, open_fires: stats.fires, open_rescues: stats.rescues, open_conflicts: stats.conflicts })
}))

app.post('/api/cloudinary/signature', requireUser, (req, res) => {
  if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
    return res.status(503).json({ error: 'Cloudinary is not configured. Add its credentials to .env.' })
  }
  const folder = 'forestguard/reports'
  const timestamp = Math.floor(Date.now() / 1000)
  const signature = cloudinary.utils.api_sign_request({ folder, timestamp }, process.env.CLOUDINARY_API_SECRET)
  res.json({ cloudName: process.env.CLOUDINARY_CLOUD_NAME, apiKey: process.env.CLOUDINARY_API_KEY, folder, timestamp, signature })
})

for (const [path, table] of [['fires', 'fire_reports'], ['conflicts', 'conflict_reports']]) {
  app.get(`/api/${path}`, requireStaff, asyncRoute(async (_req, res) => {
    const { rows } = await pool.query(`SELECT id,title,description,latitude,longitude,severity,status,image_url,created_at FROM ${table} ORDER BY created_at DESC LIMIT 100`)
    res.json({ items: rows })
  }))
  app.post(`/api/${path}`, requireUser, asyncRoute(async (req, res) => {
    const { title, description = '', latitude = null, longitude = null, severity = 'MEDIUM', imageUrl = null, cloudinaryPublicId = null } = req.body || {}
    if (!title?.trim() || !['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].includes(severity)) return res.status(400).json({ error: 'A title and valid severity are required.' })
    const { rows } = await pool.query(
      `INSERT INTO ${table}(title,description,latitude,longitude,severity,image_url,cloudinary_public_id,reported_by) VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [title.trim(), description, latitude, longitude, severity, imageUrl, cloudinaryPublicId, req.session.user.id],
    )
    res.status(201).json({ item: rows[0] })
  }))
}

app.use('/api', (_req, res) => res.status(404).json({ error: 'API route not found.' }))
app.use(express.static(`${root}/static/frontend`))
app.get('/{*splat}', (_req, res) => res.sendFile(`${root}/static/frontend/index.html`))
app.use((error, _req, res, _next) => {
  console.error(error)
  res.status(500).json({ error: 'The server could not complete that request.' })
})

app.listen(port, () => console.log(`ForestGuard Node server listening at http://localhost:${port}`))
