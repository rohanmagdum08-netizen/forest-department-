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
const requireResponseStaff = (req, res, next) => {
  if (!req.session.user) return res.status(401).json({ error: 'Sign in required' })
  if (!staffRoles.includes(req.session.user.role)) return res.status(403).json({ error: 'Response staff access required.' })
  next()
}
const sessionUser = (user) => ({ id: user.id, name: user.name, email: user.email, role: user.role })
const incidentTables = { fire: 'fire_reports', conflict: 'conflict_reports' }
const staffRoles = ['ADMIN', 'OFFICER', 'RESCUE']
const transitions = {
  REPORTED: ['VERIFIED', 'ASSIGNED', 'CLOSED'],
  VERIFIED: ['ASSIGNED', 'CLOSED'],
  ASSIGNED: ['RESPONDING', 'VERIFIED', 'CLOSED'],
  RESPONDING: ['ASSIGNED', 'RESOLVED', 'CLOSED'],
  RESOLVED: ['RESPONDING', 'CLOSED'],
  CLOSED: [],
}
const incidentUnion = `
  SELECT id,'fire'::text AS type,title,description,latitude,longitude,severity,status,image_url,cloudinary_public_id,reported_by,assigned_to,verified_by,created_at,updated_at FROM fire_reports
  UNION ALL
  SELECT id,'conflict'::text AS type,title,description,latitude,longitude,severity,status,image_url,cloudinary_public_id,reported_by,assigned_to,verified_by,created_at,updated_at FROM conflict_reports
`

app.get('/api/health', asyncRoute(async (_req, res) => {
  await pool.query('SELECT 1')
  res.json({ status: 'ok', database: 'connected' })
}))
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

app.get('/api/admin/overview', requireResponseStaff, asyncRoute(async (req, res) => {
  const scoped = req.session.user.role === 'RESCUE'
  const filter = scoped ? 'WHERE assigned_to=$1' : ''
  const values = scoped ? [req.session.user.id] : []
  const [counts, recent, severities] = await Promise.all([
    pool.query(`WITH incidents AS (${incidentUnion}) SELECT
      COUNT(*) FILTER (WHERE status NOT IN ('RESOLVED','CLOSED'))::int AS open,
      COUNT(*) FILTER (WHERE status IN ('REPORTED','VERIFIED') AND assigned_to IS NULL)::int AS unassigned,
      COUNT(*) FILTER (WHERE status IN ('ASSIGNED','RESPONDING'))::int AS active_response,
      COUNT(*) FILTER (WHERE severity='CRITICAL' AND status NOT IN ('RESOLVED','CLOSED'))::int AS critical,
      COUNT(*) FILTER (WHERE status='RESOLVED' AND updated_at >= NOW()-INTERVAL '7 days')::int AS resolved_week
      FROM incidents ${filter}`, values),
    pool.query(`WITH incidents AS (${incidentUnion}) SELECT i.id::text || ':' || i.type AS key, i.id, i.type, i.title, i.description, i.latitude, i.longitude, i.severity, i.status, i.image_url, i.reported_by, i.assigned_to, i.created_at, i.updated_at, reporter.name AS reporter_name, assignee.name AS assignee_name FROM incidents i LEFT JOIN users reporter ON reporter.id=i.reported_by LEFT JOIN users assignee ON assignee.id=i.assigned_to ${scoped?'WHERE i.assigned_to=$1':''} ORDER BY i.created_at DESC LIMIT 8`, values),
    pool.query(`WITH incidents AS (${incidentUnion}) SELECT severity, COUNT(*)::int AS total FROM incidents WHERE type='fire' GROUP BY severity`),
  ])
  res.json({ user: req.session.user, stats: counts.rows[0], recent: recent.rows, fires_by_severity: severities.rows })
}))

app.get('/api/staff', requireResponseStaff, asyncRoute(async (_req, res) => {
  const { rows } = await pool.query("SELECT id,name,role FROM users WHERE role IN ('ADMIN','OFFICER','RESCUE') ORDER BY name")
  res.json({ staff: rows })
}))
app.post('/api/staff', requireResponseStaff, asyncRoute(async (req, res) => {
  if (req.session.user.role !== 'ADMIN') return res.status(403).json({ error: 'Administrator access required.' })
  const name = String(req.body?.name || '').trim()
  const email = String(req.body?.email || '').trim().toLowerCase()
  const password = req.body?.password
  const role = req.body?.role
  if (!name || name.length > 120 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || typeof password !== 'string' || password.length < 12 || !['OFFICER','RESCUE'].includes(role)) {
    return res.status(400).json({ error: 'Enter a name, valid email, 12-character password, and response role.' })
  }
  try {
    const hash = await bcrypt.hash(password, 12)
    const { rows } = await pool.query('INSERT INTO users(name,email,password_hash,role) VALUES($1,$2,$3,$4) RETURNING id,name,role', [name,email,hash,role])
    res.status(201).json({ staff: rows[0] })
  } catch (error) {
    if (error.code === '23505') return res.status(409).json({ error: 'An account with that email already exists.' })
    throw error
  }
}))

app.get('/api/incidents', requireResponseStaff, asyncRoute(async (req, res) => {
  const filters = []
  const values = []
  if (req.query.type && ['fire', 'conflict'].includes(req.query.type)) {
    values.push(req.query.type)
    filters.push(`type=$${values.length}`)
  }
  if (req.query.status && ['REPORTED','VERIFIED','ASSIGNED','RESPONDING','RESOLVED','CLOSED'].includes(req.query.status)) {
    values.push(req.query.status)
    filters.push(`status=$${values.length}`)
  }
  if (req.query.q?.trim()) {
    values.push(`%${req.query.q.trim().slice(0, 100)}%`)
    filters.push(`(title ILIKE $${values.length} OR description ILIKE $${values.length})`)
  }
  if (req.session.user.role === 'RESCUE') {
    values.push(req.session.user.id)
    filters.push(`assigned_to=$${values.length}`)
  }
  const { rows } = await pool.query(`WITH incidents AS (${incidentUnion}) SELECT i.id::text || ':' || i.type AS key,i.id,i.type,i.title,i.description,i.latitude,i.longitude,i.severity,i.status,i.image_url,i.reported_by,i.assigned_to,i.created_at,i.updated_at,reporter.name AS reporter_name,assignee.name AS assignee_name FROM incidents i LEFT JOIN users reporter ON reporter.id=i.reported_by LEFT JOIN users assignee ON assignee.id=i.assigned_to ${filters.length ? `WHERE ${filters.join(' AND ')}` : ''} ORDER BY CASE WHEN i.severity='CRITICAL' THEN 0 WHEN i.severity='HIGH' THEN 1 WHEN i.severity='MEDIUM' THEN 2 ELSE 3 END, i.created_at DESC LIMIT 150`, values)
  res.json({ items: rows })
}))

app.get('/api/incidents/:type/:id', requireResponseStaff, asyncRoute(async (req, res) => {
  const table = incidentTables[req.params.type]
  if (!table || !/^\d+$/.test(req.params.id)) return res.status(404).json({ error: 'Incident not found.' })
  const { rows } = await pool.query(`SELECT i.*,r.name AS reporter_name,a.name AS assignee_name FROM ${table} i LEFT JOIN users r ON r.id=i.reported_by LEFT JOIN users a ON a.id=i.assigned_to WHERE i.id=$1`, [req.params.id])
  if (!rows[0]) return res.status(404).json({ error: 'Incident not found.' })
  if (req.session.user.role === 'RESCUE' && rows[0].assigned_to !== req.session.user.id) return res.status(403).json({ error: 'This incident is assigned to another team.' })
  const events = await pool.query('SELECT e.id,e.event_type,e.status,e.message,e.created_at,u.name AS actor_name FROM incident_events e LEFT JOIN users u ON u.id=e.actor_id WHERE e.incident_type=$1 AND e.incident_id=$2 ORDER BY e.created_at DESC', [req.params.type, req.params.id])
  res.json({ incident: rows[0], events: events.rows })
}))

app.patch('/api/incidents/:type/:id', requireResponseStaff, asyncRoute(async (req, res) => {
  const table = incidentTables[req.params.type]
  if (!table || !/^\d+$/.test(req.params.id)) return res.status(404).json({ error: 'Incident not found.' })
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const current = await client.query(`SELECT * FROM ${table} WHERE id=$1 FOR UPDATE`, [req.params.id])
    const item = current.rows[0]
    if (!item) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'Incident not found.' }) }
    if (req.session.user.role === 'RESCUE' && item.assigned_to !== req.session.user.id) { await client.query('ROLLBACK'); return res.status(403).json({ error: 'This incident is assigned to another team.' }) }
    const status = req.body?.status
    const assignTo = req.body?.assignedTo
    const message = String(req.body?.message || '').trim().slice(0, 1000)
    let assignedName = ''
    if (assignTo !== undefined && !['ADMIN','OFFICER'].includes(req.session.user.role)) { await client.query('ROLLBACK'); return res.status(403).json({ error: 'Only administrators and officers can assign cases.' }) }
    if (assignTo !== undefined && assignTo !== null) {
      const person = await client.query("SELECT id,name FROM users WHERE id=$1 AND role IN ('ADMIN','OFFICER','RESCUE')", [assignTo])
      if (!person.rows[0]) { await client.query('ROLLBACK'); return res.status(400).json({ error: 'Choose an active response team member.' }) }
      assignedName = person.rows[0].name
    }
    const nextAssignee = assignTo === undefined ? item.assigned_to : assignTo
    const changedStatus = status && status !== item.status
    if (changedStatus && !transitions[item.status]?.includes(status)) { await client.query('ROLLBACK'); return res.status(409).json({ error: `This case cannot move from ${item.status} to ${status}.` }) }
    const assignmentStarted = nextAssignee && nextAssignee !== item.assigned_to && ['REPORTED','VERIFIED'].includes(item.status)
    const nextStatus = changedStatus ? status : assignmentStarted ? 'ASSIGNED' : (status || item.status)
    if (!status && !message && assignTo === undefined) { await client.query('ROLLBACK'); return res.status(400).json({ error: 'Choose a status, assignee, or add an update.' }) }
    const updated = await client.query(`UPDATE ${table} SET status=$1,assigned_to=$2,verified_by=CASE WHEN $1='VERIFIED' THEN $3 ELSE verified_by END,updated_at=NOW() WHERE id=$4 RETURNING *`, [nextStatus, nextAssignee, req.session.user.id, req.params.id])
    const changes = []
    if (nextStatus !== item.status) changes.push({ type: 'STATUS', status: nextStatus, message: message || `Status changed to ${nextStatus.toLowerCase().replace('_',' ')}.` })
    if (nextAssignee !== item.assigned_to) changes.push({ type: 'ASSIGNED', status: nextStatus, message: nextAssignee ? `Assigned to ${assignedName}.` : 'Response team assignment removed.' })
    if (message && nextStatus === item.status) changes.push({ type: 'UPDATE', status: nextStatus, message })
    for (const change of changes) await client.query('INSERT INTO incident_events(incident_type,incident_id,actor_id,event_type,status,message) VALUES($1,$2,$3,$4,$5,$6)', [req.params.type, req.params.id, req.session.user.id, change.type, change.status, change.message])
    await client.query('COMMIT')
    res.json({ incident: updated.rows[0] })
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally { client.release() }
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
  app.post(`/api/${path}`, requireUser, asyncRoute(async (req, res) => {
    const { title, description = '', latitude = null, longitude = null, severity = 'MEDIUM', animalType = '', imageUrl = null, cloudinaryPublicId = null } = req.body || {}
    if (typeof title !== 'string' || !title.trim() || title.trim().length > 180 || typeof description !== 'string' || description.length > 4000 || !['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].includes(severity)) return res.status(400).json({ error: 'Enter a short title, details under 4,000 characters, and a valid severity.' })
    const coordinates = [latitude, longitude]
    if (coordinates.some((value) => value !== null && (!Number.isFinite(Number(value))))) return res.status(400).json({ error: 'Enter valid map coordinates.' })
    if (latitude !== null && (Number(latitude) < -90 || Number(latitude) > 90) || longitude !== null && (Number(longitude) < -180 || Number(longitude) > 180)) return res.status(400).json({ error: 'Coordinates are outside the valid range.' })
    if (path === 'conflicts' && (typeof animalType !== 'string' || animalType.length > 100)) return res.status(400).json({ error: 'Enter an animal type under 100 characters.' })
    if (imageUrl) {
      try { if (new URL(imageUrl).hostname !== 'res.cloudinary.com' || typeof cloudinaryPublicId !== 'string' || cloudinaryPublicId.length > 255) throw new Error() }
      catch { return res.status(400).json({ error: 'Attach an image uploaded to the ForestGuard Cloudinary folder.' }) }
    }
    const client = await pool.connect()
    try {
      await client.query('BEGIN')
      const insertSql = path === 'conflicts'
        ? `INSERT INTO ${table}(title,description,latitude,longitude,severity,image_url,cloudinary_public_id,reported_by,animal_type) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`
        : `INSERT INTO ${table}(title,description,latitude,longitude,severity,image_url,cloudinary_public_id,reported_by) VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`
      const values = [title.trim(), description, latitude, longitude, severity, imageUrl, cloudinaryPublicId, req.session.user.id]
      if (path === 'conflicts') values.push(animalType.trim())
      const { rows } = await client.query(insertSql, values)
      await client.query('INSERT INTO incident_events(incident_type,incident_id,actor_id,event_type,status,message) VALUES($1,$2,$3,$4,$5,$6)', [path === 'fires' ? 'fire' : 'conflict', rows[0].id, req.session.user.id, 'REPORTED', 'REPORTED', 'Report submitted.'])
      await client.query('COMMIT')
      res.status(201).json({ item: rows[0] })
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally { client.release() }
  }))
}

app.get('/api/my-reports', requireUser, asyncRoute(async (req, res) => {
  const { rows } = await pool.query(`WITH incidents AS (${incidentUnion}) SELECT i.id::text || ':' || i.type AS key,i.id,i.type,i.title,i.description,i.latitude,i.longitude,i.severity,i.status,i.image_url,i.assigned_to,i.created_at,i.updated_at,assignee.name AS assignee_name FROM incidents i LEFT JOIN users assignee ON assignee.id=i.assigned_to WHERE i.reported_by=$1 ORDER BY i.created_at DESC LIMIT 100`, [req.session.user.id])
  res.json({ items: rows })
}))

app.use('/api', (_req, res) => res.status(404).json({ error: 'API route not found.' }))
app.use(express.static(`${root}/static/frontend`))
app.get('/{*splat}', (_req, res) => res.sendFile(`${root}/static/frontend/index.html`))
app.use((error, _req, res, _next) => {
  console.error(error)
  res.status(500).json({ error: 'The server could not complete that request.' })
})

app.listen(port, () => console.log(`ForestGuard Node server listening at http://localhost:${port}`))
