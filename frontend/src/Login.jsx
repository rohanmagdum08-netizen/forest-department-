import { useState } from 'react'
import { Leaf, LoaderCircle } from 'lucide-react'

export default function Login({ onLogin }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(event) {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Could not sign in.')
      onLogin(result.user)
    } catch (cause) { setError(cause.message) } finally { setBusy(false) }
  }

  return <main className="grid min-h-screen place-items-center bg-[#f6f7f4] p-5 text-[#232a24]">
    <form onSubmit={submit} className="w-full max-w-[420px] rounded-3xl border border-[#e9ece7] bg-white p-8 shadow-[0_12px_40px_#2133220c]">
      <div className="mb-7 flex items-center gap-3"><div className="grid h-11 w-11 place-items-center rounded-2xl bg-[#eaf3ec] text-[#34734a]"><Leaf size={23}/></div><div><div className="font-semibold">ForestGuard 360</div><div className="mt-0.5 text-xs text-[#8b948b]">Operations console</div></div></div>
      <h1 className="text-2xl font-semibold tracking-tight">Welcome back</h1><p className="mt-2 text-sm text-[#788178]">Sign in with your ForestGuard account.</p>
      {error && <p role="alert" className="mt-5 rounded-xl bg-[#fff0e9] p-3 text-sm text-[#a14e35]">{error}</p>}
      <label className="mt-6 block text-sm font-medium">Email address<input required type="email" autoComplete="username" value={email} onChange={e=>setEmail(e.target.value)} className="mt-2 h-11 w-full rounded-xl border border-[#dfe5dd] px-3 outline-none focus:border-[#76a57c]"/></label>
      <label className="mt-4 block text-sm font-medium">Password<input required type="password" autoComplete="current-password" value={password} onChange={e=>setPassword(e.target.value)} className="mt-2 h-11 w-full rounded-xl border border-[#dfe5dd] px-3 outline-none focus:border-[#76a57c]"/></label>
      <button disabled={busy} className="mt-6 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#2c6643] text-sm font-semibold text-white hover:bg-[#235538] disabled:opacity-60">{busy&&<LoaderCircle size={16} className="animate-spin"/>}Sign in</button>
    </form>
  </main>
}
