import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { dirname, join } from 'node:path'

const file = join(process.cwd(), 'data', 'subscriptions.json')
export const blank = { account: { email: '', plan: 'free', authorized: false }, subscriptions: [] }

export async function readData() {
  try { return JSON.parse(await readFile(file, 'utf8')) } catch { return blank }
}

export async function saveData(data) {
  await mkdir(dirname(file), { recursive: true })
  await writeFile(file, JSON.stringify(data, null, 2) + '\n', 'utf8')
}
