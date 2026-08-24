const CACHE_KEY = 'subscription-pocket-data'
const initialData = { account: { email: '', plan: 'free', authorized: false }, subscriptions: [] }

/** Storage boundary: replace this adapter with the Supabase version below when ready. */
export const jsonStorage = {
  async load() {
    try {
      const response = await fetch('/api/subscriptions')
      if (response.ok) return await response.json()
    } catch { /* deployed static sites use browser backup */ }
    return JSON.parse(localStorage.getItem(CACHE_KEY) || JSON.stringify(initialData))
  },
  async save(data) {
    localStorage.setItem(CACHE_KEY, JSON.stringify(data))
    try {
      await fetch('/api/subscriptions', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data)
      })
    } catch { /* local browser copy remains available */ }
  }
}

// Future adapter outline (install @supabase/supabase-js and configure env vars):
// export const supabaseStorage = {
//   load: async () => (await supabase.from('subscription_accounts').select('*').single()).data,
//   save: async data => supabase.from('subscription_accounts').upsert(data)
// }
