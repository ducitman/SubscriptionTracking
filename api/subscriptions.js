import { readData, saveData } from './_data.js'

export default async function handler(req, res) {
  if (req.method === 'GET') return res.status(200).json(await readData())
  if (req.method !== 'PUT') return res.status(405).json({ error: 'Method not allowed' })
  const data = req.body
  if (!data?.account || !Array.isArray(data?.subscriptions)) return res.status(400).json({ error: 'Invalid data' })
  await saveData(data)
  return res.status(200).json(data)
}
