import { useEffect, useMemo, useState } from 'react'
import { jsonStorage } from './lib/storage'

const platforms = [
  { name: 'ChatGPT', logo: 'openai', color: '412991' }, { name: 'Grok', logo: 'x', color: '000000' },
  { name: 'Seedance', logo: 'bytedance', color: '3c82e6' }, { name: 'Kling', logo: 'kuaishou', color: 'ff4906' },
  { name: 'Netflix', logo: 'netflix', color: 'e50914' }, { name: 'Spotify', logo: 'spotify', color: '1db954' },
  { name: 'Google Gemini', logo: 'google', color: '4285f4' }, { name: 'Claude', logo: 'anthropic', color: 'd97757' },
  { name: 'Notion', logo: 'notion', color: '111111' }, { name: 'Canva', logo: 'canva', color: '00c4cc' }
]
const money = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })
const dateFormat = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

function PlatformLogo({ name }) {
  const platform = platforms.find(item => item.name === name)
  return <span className="platform-icon" title={name}>
    {platform && <img src={`https://cdn.simpleicons.org/${platform.logo}/${platform.color}`} alt="" onError={event => { event.currentTarget.style.display = 'none'; event.currentTarget.nextElementSibling.style.display = 'grid' }} />}
    <b>{name[0]}</b>
  </span>
}

export default function App() {
  const [data, setData] = useState(null)
  const [emailDraft, setEmailDraft] = useState('')
  const [adding, setAdding] = useState(false)
  const [selectedPlatform, setSelectedPlatform] = useState('ChatGPT')
  const [step, setStep] = useState('catalog')
  const [discovery, setDiscovery] = useState(null)
  const isPro = data?.account.plan === 'pro'
  const limitReached = !isPro && data?.subscriptions.length >= 5
  const monthlySpend = useMemo(() => (data?.subscriptions || []).reduce((total, item) => total + Number(item.price || 0) / (item.billing === 'yearly' ? 12 : 1), 0), [data])

  useEffect(() => { jsonStorage.load().then(setData) }, [])
  const update = next => { setData(next); jsonStorage.save(next) }
  const closeModal = () => { setAdding(false); setStep('catalog'); setDiscovery(null) }
  const openModal = () => { setAdding(true); setStep('catalog'); setDiscovery(null) }
  const saveEmail = event => { event.preventDefault(); update({ ...data, account: { ...data.account, email: emailDraft.trim(), authorized: false } }) }
  const togglePlan = () => update({ ...data, account: { ...data.account, plan: isPro ? 'free' : 'pro' } })
  const remove = id => update({ ...data, subscriptions: data.subscriptions.filter(item => item.id !== id) })

  async function choosePlatform(platform) {
    setSelectedPlatform(platform); setStep('checking'); setDiscovery(null)
    try {
      const response = await fetch('/api/discover-subscriptions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: data.account.email, platform }) })
      const result = await response.json()
      setDiscovery(response.ok ? result : { message: result.message || 'Email discovery needs to be connected.', setupRequired: true })
    } catch { setDiscovery({ message: 'Could not reach the subscription discovery service. Please try again.', setupRequired: true }) }
  }
  function confirmDiscovery() {
    if (!discovery?.candidate || limitReached) return
    const candidate = discovery.candidate
    update({ ...data, subscriptions: [...data.subscriptions, { ...candidate, id: crypto.randomUUID(), platform: selectedPlatform, price: Number(candidate.price) }] })
    closeModal()
  }
  async function authorizeEmail() {
    try {
      const response = await fetch('/api/authorize-email', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: data.account.email }) })
      const body = await response.text()
      let result
      try { result = body ? JSON.parse(body) : {} } catch { throw new Error('The email authorization service is unavailable. Start the app with npm.cmd run dev.') }
      if (!response.ok) throw new Error(result.message || 'Could not start email authorization.')
      window.location.assign(result.authorizationUrl)
    } catch (error) { setDiscovery({ message: error.message, setupRequired: true }) }
  }

  if (!data) return <main className="loading">Loading your subscription pocket...</main>
  if (!data.account.email) return <main className="onboarding"><section className="welcome-card"><div className="logo">S</div><p className="eyebrow">SUBSCRIPTION POCKET</p><h1>Everything you subscribe to, in one calm place.</h1><p>Start with the email whose subscriptions you want to track.</p><form onSubmit={saveEmail}><label>Email address<input autoFocus type="email" placeholder="you@example.com" value={emailDraft} onChange={event => setEmailDraft(event.target.value)} required /></label><button>Continue -&gt;</button></form><small>Free includes one email and up to five subscriptions.</small></section></main>
  if (!data.account.authorized) return <main className="onboarding"><section className="welcome-card authorization-card"><div className="logo">S</div><p className="eyebrow">SECURE EMAIL CONNECTION</p><h1>Authorize your inbox once.</h1><p>Allow read-only access to <strong>{data.account.email}</strong> so we can find subscription receipts and renewals. We never send, delete, or change email.</p>{discovery?.message && <p className="authorization-error">{discovery.message}</p>}<button onClick={authorizeEmail}>Connect Gmail securely</button><small>You will not be asked again after authorization. You can disconnect anytime from account settings.</small></section></main>

  return <main className="app-shell"><header><div className="brand"><div className="logo">S</div><span>subscription<br />pocket</span></div><button className="plan-pill" onClick={togglePlan}>{isPro ? 'Pro plan' : 'Free plan'}</button></header>
    <section className="hero"><div><p className="eyebrow">YOUR DASHBOARD</p><h1>Your subscriptions.</h1><p className="muted">Tracking <strong>{data.account.email}</strong></p></div><button className="primary" onClick={openModal} disabled={limitReached}>+ Add subscription</button></section>
    <section className="stats"><article><span>MONTHLY SPEND</span><strong>{money.format(monthlySpend)}</strong><small>across {data.subscriptions.length} subscription{data.subscriptions.length === 1 ? '' : 's'}</small></article><article><span>NEXT PAYMENT</span><strong>{data.subscriptions.length ? dateFormat.format(new Date([...data.subscriptions].sort((a, b) => new Date(a.nextBilling) - new Date(b.nextBilling))[0].nextBilling)) : '-'}</strong><small>{data.subscriptions.length ? 'Stay ahead of renewals' : 'Add your first subscription'}</small></article><article className="tier"><span>YOUR PLAN</span><strong>{isPro ? 'Pro' : 'Free'}</strong><small>{isPro ? 'Unlimited subscriptions' : `${data.subscriptions.length} of 5 subscriptions used`}</small></article></section>
    <section className="list-section"><div className="section-head"><div><h2>Your subscriptions</h2><p>Confirmed from your linked email.</p></div>{!isPro && <span className="usage">{data.subscriptions.length}/5 used</span>}</div>{limitReached && <div className="upgrade"><div><strong>You have reached the Free plan limit.</strong><p>Switch to Pro to track all your subscriptions.</p></div><button onClick={togglePlan}>Upgrade</button></div>}
      <div className="subscriptions">{data.subscriptions.map(item => <article className="subscription" key={item.id}><PlatformLogo name={item.platform} /><div className="subscription-name"><strong>{item.platform}</strong><span>{item.plan} · {item.billing}</span></div><div className="renewal"><span>Next payment</span><strong>{dateFormat.format(new Date(item.nextBilling))}</strong></div><div className="price"><strong>{money.format(item.price)}</strong><span>/{item.billing === 'yearly' ? 'year' : 'mo'}</span></div><button className="delete" aria-label={'Delete ' + item.platform} onClick={() => remove(item.id)}>x</button></article>)}</div>
      {!data.subscriptions.length && <div className="empty"><div>+</div><h3>Your list is ready.</h3><p>Choose a platform and we will check your linked email for its subscription confirmation.</p><button className="secondary" onClick={openModal}>Choose a platform</button></div>}</section>
    {adding && <div className="modal-backdrop" onMouseDown={closeModal}><section className="modal catalog-modal" onMouseDown={event => event.stopPropagation()}>{step === 'catalog' ? <><div className="modal-title"><div><p className="eyebrow">ADD SUBSCRIPTION</p><h2>Choose a platform</h2><p className="modal-copy">We will automatically check its confirmation email.</p></div><button type="button" onClick={closeModal}>x</button></div><div className="catalog">{platforms.map(platform => <button type="button" className={'catalog-item ' + (selectedPlatform === platform.name ? 'selected' : '')} key={platform.name} onClick={() => choosePlatform(platform.name)}><PlatformLogo name={platform.name} /><span>{platform.name}</span></button>)}</div></> : <><div className="modal-title"><div><p className="eyebrow">CHECKING EMAIL</p><h2>{selectedPlatform}</h2></div><button type="button" onClick={closeModal}>x</button></div>{!discovery ? <div className="checking"><div className="spinner" /><strong>Checking your linked email</strong><p>Looking for {selectedPlatform} receipts and renewal notices.</p></div> : discovery.candidate ? <div className="confirmation"><PlatformLogo name={selectedPlatform} /><h3>Subscription found</h3><p>Confirm the subscription found for <strong>{data.account.email}</strong>.</p><dl><div><dt>Plan</dt><dd>{discovery.candidate.plan}</dd></div><div><dt>Price</dt><dd>{money.format(discovery.candidate.price)} / {discovery.candidate.billing === 'yearly' ? 'year' : 'month'}</dd></div><div><dt>Next billing</dt><dd>{dateFormat.format(new Date(discovery.candidate.nextBilling))}</dd></div></dl><button className="primary" onClick={confirmDiscovery}>Confirm subscription</button><button className="text-button" onClick={() => setStep('catalog')}>Choose another platform</button></div> : <div className="confirmation setup"><div className="scan-symbol">@</div><h3>Inbox connection needed</h3><p>{discovery.message}</p><p className="muted">Authorize Gmail or Outlook once, then the app can find and classify subscription receipts automatically.</p><button className="secondary" onClick={() => setStep('catalog')}>Back to platforms</button></div>}</>}</section></div>}</main>
}
