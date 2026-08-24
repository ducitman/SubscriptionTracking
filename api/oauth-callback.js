import { createHmac, timingSafeEqual } from 'node:crypto'
import { readData, saveData } from './_data.js'

function validState(state) {
  const [payload, signature] = (state || '').split('.')
  const expected = createHmac('sha256', process.env.OAUTH_STATE_SECRET || '').update(payload || '').digest('base64url')
  if (!payload || !signature || signature.length !== expected.length || !timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null
  try { return JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) } catch { return null }
}

export default async function handler(req, res) {
  const state = validState(req.query.state)
  if (!state || !req.query.code) return res.status(400).send('Email authorization could not be verified.')
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET || !process.env.GOOGLE_REDIRECT_URI) return res.status(500).send('Gmail OAuth environment variables are incomplete.')
  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ code: req.query.code, client_id: process.env.GOOGLE_CLIENT_ID, client_secret: process.env.GOOGLE_CLIENT_SECRET, redirect_uri: process.env.GOOGLE_REDIRECT_URI, grant_type: 'authorization_code' })
  })
  const tokens = await tokenResponse.json()
  if (!tokenResponse.ok) return res.status(400).send('Google authorization could not be completed.')
  const data = await readData()
  if (data.account.email !== state.email) return res.status(403).send('This authorization does not match the linked email.')
  // Tokens should move into an encrypted Supabase table before production use.
  data.account.authorized = true
  data.account.emailProvider = 'google'
  data.account.googleRefreshToken = tokens.refresh_token || data.account.googleRefreshToken || null
  await saveData(data)
  return res.redirect(302, '/')
}
