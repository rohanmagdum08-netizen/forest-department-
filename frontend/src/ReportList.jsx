import { useEffect, useState } from 'react'
import { ArrowLeft, ArrowRight, Flame, ShieldCheck } from 'lucide-react'

export default function ReportList({ kind }) {
  const isFire = kind === 'fires'
  const [items, setItems] = useState([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    fetch(`/api/${kind}`, { credentials: 'include' }).then(async response => {
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Could not load reports.')
      setItems(result.items || [])
    }).catch(cause => setError(cause.message)).finally(() => setLoading(false))
  }, [kind])
  const Icon = isFire ? Flame : ShieldCheck
  return <main className="min-h-screen bg-[#f6f7f4] px-5 py-10 text-[#232a24]"><div className="mx-auto max-w-5xl">
    <a href="/dashboard" className="inline-flex items-center gap-2 text-sm text-[#647367]"><ArrowLeft size={16}/>Dashboard</a>
    <div className="mt-8 flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-wider text-[#719276]">Forest operations</p><h1 className="mt-2 text-3xl font-semibold">{isFire?'Fire reports':'Conflict reports'}</h1><p className="mt-2 text-sm text-[#788178]">Review the latest reports and their response status.</p></div><a href={`/${kind}/new`} className="inline-flex items-center gap-2 rounded-xl bg-[#2c6643] px-4 py-3 text-sm font-semibold text-white">New report<ArrowRight size={16}/></a></div>
    {error?<div className="mt-6 rounded-2xl border border-[#f0d9cf] bg-white p-6 text-sm text-[#a14e35]">{error}</div>:<div className="mt-6 overflow-hidden rounded-2xl border border-[#e9ece7] bg-white">{loading?<p className="p-8 text-sm text-[#788178]">Loading reports…</p>:items.length?<div className="divide-y divide-[#edf0eb]">{items.map(item=><article key={item.id} className="flex items-start gap-4 p-5"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#fff1e8] text-[#ce7952]"><Icon size={18}/></span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h2 className="font-semibold">{item.title}</h2><span className="rounded-md bg-[#f5f2eb] px-2 py-1 text-[11px] font-semibold text-[#7f6a3d]">{item.severity}</span></div><p className="mt-1 text-sm text-[#788178]">{item.description || 'No additional details.'}</p><p className="mt-2 text-xs text-[#9aa29a]">{item.latitude && item.longitude ? `${item.latitude}, ${item.longitude}` : 'Location pending'} · {new Date(item.created_at).toLocaleString('en-IN')}</p>{item.image_url&&<img src={item.image_url} alt="Report evidence" loading="lazy" className="mt-3 max-h-48 rounded-xl object-cover"/>}</div><span className="shrink-0 text-xs text-[#647367]">{item.status}</span></article>)}</div>:<p className="p-12 text-center text-sm text-[#929b92]">No reports yet.</p>}</div>}
  </div></main>
}
