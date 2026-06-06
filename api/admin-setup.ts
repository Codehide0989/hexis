import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'

// Use SERVICE ROLE key — bypasses RLS completely
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // Allow CORS
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Content-Type', 'application/json')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' })
  }

  try {
    const { username, email, passwordHash, md5Hash } = req.body

    if (!username || !passwordHash || !md5Hash) {
      return res.status(400).json({
        ok: false,
        error: 'Missing required fields'
      })
    }

    // Check if admin already exists
    const { data: existing } = await supabase
      .from('admin_users')
      .select('id')
      .limit(1)

    if (existing && existing.length > 0) {
      return res.status(409).json({
        ok: false,
        error: 'Admin already exists. Go to /admin/login'
      })
    }

    // Create admin
    const { data, error } = await supabase
      .from('admin_users')
      .insert({
        username: username.trim(),
        email: email?.trim() || null,
        password_hash: passwordHash,
        md5_hash: md5Hash,
        is_super_admin: true,
      })
      .select('id, username, email, is_super_admin')
      .single()

    if (error) throw error

    return res.status(200).json({ ok: true, admin: data })
  } catch (err: any) {
    console.error('Admin setup error:', err)
    return res.status(500).json({
      ok: false,
      error: err.message || 'Setup failed'
    })
  }
}
