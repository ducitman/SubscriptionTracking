// Email services never expose a mailbox just from its address. This endpoint is
// deliberately the post-OAuth boundary: send a provider access token here only
// after the owner approves Gmail or Microsoft permissions.
import { readData } from './_data.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' })
  const data = await readData()
  if (!data.account.authorized) return res.status(401).json({ message: 'Authorize the linked email before checking subscription confirmations.' })

  return res.status(501).json({
    message: 'Inbox scanning needs Gmail or Microsoft OAuth setup. Add OAuth credentials and a callback before enabling scans.',
    requiredScopes: ['Gmail: gmail.readonly', 'Microsoft: Mail.Read'],
    nextStep: 'Search receipt and renewal messages, classify matched sender domains, then return reviewable subscription candidates.'
  })
}
