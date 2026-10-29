import { useEffect, useState } from 'react'
import {
  Activity, AlertTriangle, ArrowDownRight, ArrowRight, ArrowUpRight, Bell, CalendarDays,
  ChevronDown, CircleHelp, Compass, Flame, Leaf, LifeBuoy, LoaderCircle, MapPinned,
  Menu, MoreHorizontal, Search, ShieldCheck, Sprout, Trees, Users, PawPrint, X
} from 'lucide-react'
import Login from './Login.jsx'
import ReportForm from './ReportForm.jsx'
import ReportList from './ReportList.jsx'

const django = ''
const sections = [
  { label: 'OVERVIEW', items: [{ name: 'Dashboard', href: '/', icon: Activity, active: true }] },
  { label: 'FOREST OPERATIONS', items: [
    { name: 'Patrols', href: `${django}/patrols/`, icon: Compass },
    { name: 'Wildlife & rescue', href: `${django}/wildlife/`, icon: PawPrint },
    { name: 'Fire reports', href: `${django}/fires/`, icon: Flame, alert: true },
    { name: 'Plantations', href: `${django}/plantations/`, icon: Sprout },
  ] },
  { label: 'COMMUNITY', items: [
    { name: 'Eco-tourism', href: `${django}/tourism/`, icon: Trees },
    { name: 'Conflict reports', href: `${django}/conflicts/`, icon: ShieldCheck },
    { name: 'Activity map', href: `${django}/map/`, icon: MapPinned },
    { name: 'Reports', href: `${django}/reports/`, icon: CalendarDays },
  ] },
]
const metrics = [
  { key: 'patrols', label: 'Active patrols', icon: Compass, note: 'Assigned or in progress', tone: 'green' },
  { key: 'fires', label: 'Open fire reports', icon: Flame, note: 'Needs attention', tone: 'amber' },
  { key: 'rescues', label: 'Rescue cases', icon: LifeBuoy, note: 'Open or in treatment', tone: 'blue' },
  { key: 'conflicts', label: 'Conflict cases', icon: ShieldCheck, note: 'Awaiting resolution', tone: 'violet' },
]
const severityColor = { LOW: '#84a88c', MEDIUM: '#deb66c', HIGH: '#e68a57', CRITICAL: '#d96356' }

function MetricCard({ item, value }) {
  const Icon = item.icon
  const tones = { green: 'bg-[#eaf3ec] text-[#34734a]', amber: 'bg-[#fbf0df] text-[#b17b2e]', blue: 'bg-[#eaf1f8] text-[#4e789a]', violet: 'bg-[#f0ecf7] text-[#7965a0]' }
  return <article className="rounded-2xl border border-[#e9ece7] bg-white p-5 shadow-[0_3px_14px_#21332207]">
    <div className="flex items-start justify-between"><div className={`grid h-10 w-10 place-items-center rounded-xl ${tones[item.tone]}`}><Icon size={19}/></div><button className="rounded-lg p-1.5 text-[#9ba39a] hover:bg-[#f4f5f2]" aria-label={`More about ${item.label}`}><MoreHorizontal size={18}/></button></div>
    <div className="mt-5 text-[29px] font-semibold tracking-tight text-[#232a24]">{value ?? '—'}</div><div className="mt-1 text-sm font-medium text-[#566056]">{item.label}</div><div className="mt-1 text-xs text-[#9aa198]">{item.note}</div>
  </article>
}
function ActivityChart({ rows }) {
  const order = ['LOW','MEDIUM','HIGH','CRITICAL']; const values = Object.fromEntries((rows || []).map(x => [x.severity,x.total])); const max = Math.max(1,...Object.values(values))
  return <div className="mt-5 space-y-4">{order.map((name) => <div key={name} className="grid grid-cols-[76px_1fr_24px] items-center gap-3 text-xs"><span className="text-[#7d867d]">{name[0]+name.slice(1).toLowerCase()}</span><div className="h-2 overflow-hidden rounded-full bg-[#f0f2ee]"><div className="h-full rounded-full transition-all" style={{width:`${((values[name]||0)/max)*100}%`,background:severityColor[name]}}/></div><span className="text-right font-semibold text-[#586258]">{values[name]||0}</span></div>)}</div>
}
function dateLabel(value) { if (!value) return '—'; return new Intl.DateTimeFormat('en-IN',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'}).format(new Date(value)) }

export default function App() {
  const [data,setData]=useState(null); const [error,setError]=useState(''); const [loading,setLoading]=useState(true); const [mobileOpen,setMobileOpen]=useState(false)
  const path = window.location.pathname.replace(/\/$/, '')
  useEffect(()=>{let live=true;fetch('/api/admin/overview/',{credentials:'include'}).then(async r=>{const body=await r.json();if(!r.ok)throw new Error(body.error||'Could not load the dashboard.');return body}).then(body=>{if(live)setData(body)}).catch(e=>{if(live)setError(e.message)}).finally(()=>{if(live)setLoading(false)});return()=>{live=false}},[])
  if (path === '/fires/new') return <ReportForm kind="fires" />
  if (path === '/conflicts/new') return <ReportForm kind="conflicts" />
  if (path === '/fires' || path === '/conflicts') return <ReportList kind={path.slice(1)} />
  if (path === '/login' || error === 'Sign in required') return <Login onLogin={()=>window.location.assign('/dashboard')} />
  const today = new Intl.DateTimeFormat('en-IN',{weekday:'long',day:'numeric',month:'long',year:'numeric'}).format(new Date())
  const Sidebar = () => <aside className="flex h-full w-[252px] shrink-0 flex-col bg-[#183b2d] text-white">
    <a href="/" className="flex h-[76px] items-center gap-3 border-b border-white/10 px-6"><div className="grid h-9 w-9 place-items-center rounded-xl bg-[#c7e49a] text-[#183b2d]"><Leaf size={21} fill="currentColor"/></div><div className="font-semibold tracking-tight">ForestGuard <span className="text-[#c7e49a]">360</span><div className="mt-0.5 text-[10px] font-medium uppercase tracking-[.16em] text-white/45">Management console</div></div></a>
    <div className="flex-1 overflow-y-auto px-3 py-6">{sections.map(section=><div className="mb-7" key={section.label}><div className="mb-2 px-3 text-[10px] font-semibold tracking-[.15em] text-white/40">{section.label}</div><nav className="space-y-1">{section.items.map(item=>{const Icon=item.icon;return <a key={item.name} href={item.href} onClick={()=>setMobileOpen(false)} className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] transition ${item.active?'bg-[#2d5a43] font-medium text-white shadow-sm':'text-white/65 hover:bg-white/8 hover:text-white'}`}><Icon size={17} className={item.active?'text-[#c7e49a]':'text-white/55 group-hover:text-white'}/><span className="flex-1">{item.name}</span>{item.alert&&data?.stats.fires>0&&<span className="h-2 w-2 rounded-full bg-[#e78d63]"/>}</a>})}</nav></div>)}</div>
    <div className="border-t border-white/10 p-4"><a href={`${django}/admin/`} className="flex items-center gap-3 rounded-xl p-2 hover:bg-white/8"><div className="grid h-9 w-9 place-items-center rounded-full bg-[#416b50] text-sm font-semibold">{data?.user.name?.slice(0,1).toUpperCase()||'A'}</div><div className="min-w-0 flex-1"><div className="truncate text-xs font-semibold">{data?.user.name||'Administrator'}</div><div className="mt-0.5 text-[10px] text-white/50">Admin account</div></div><ChevronDown size={15} className="text-white/45"/></a></div>
  </aside>
  return <div className="min-h-screen bg-[#f6f7f4] text-[#232a24]">
    <div className="flex min-h-screen">
      <div className="hidden lg:block"><Sidebar/></div>
      {mobileOpen&&<div className="fixed inset-0 z-50 flex lg:hidden"><button aria-label="Close menu" className="absolute inset-0 bg-black/30" onClick={()=>setMobileOpen(false)}/><div className="relative"><Sidebar/><button className="absolute right-3 top-5 rounded-lg p-2 text-white" onClick={()=>setMobileOpen(false)}><X size={18}/></button></div></div>}
      <main className="min-w-0 flex-1">
        <header className="sticky top-0 z-20 flex h-[76px] items-center justify-between border-b border-[#e9ece7] bg-white/90 px-5 backdrop-blur md:px-9"><div className="flex items-center gap-3"><button onClick={()=>setMobileOpen(true)} className="rounded-lg p-2 text-[#667067] hover:bg-[#f3f5f1] lg:hidden"><Menu size={20}/></button><div className="relative hidden sm:block"><Search size={16} className="absolute left-3 top-2.5 text-[#9da69d]"/><input placeholder="Search records..." className="h-9 w-56 rounded-xl border border-[#e9ece7] bg-[#fafbf9] pl-9 pr-3 text-xs outline-none placeholder:text-[#a1aaa1] focus:border-[#89ad8e]"/></div></div><div className="flex items-center gap-4"><span className="hidden text-xs text-[#7e887e] md:block">{today}</span><button className="relative rounded-xl p-2 text-[#758075] hover:bg-[#f3f5f1]" aria-label="Notifications"><Bell size={18}/><span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full border-2 border-white bg-[#e1825b]"/></button><a href={`${django}/profile/`} className="grid h-9 w-9 place-items-center rounded-full bg-[#e3eddf] text-xs font-semibold text-[#386244]">{data?.user.name?.slice(0,1).toUpperCase()||'A'}</a></div></header>
        <div className="mx-auto max-w-[1440px] px-5 py-7 md:px-9 md:py-9">
          <div className="mb-7 flex flex-wrap items-end justify-between gap-4"><div><div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[.14em] text-[#719276]"><span className="h-1.5 w-1.5 rounded-full bg-[#76a57c]"/> Forest operations</div><h1 className="text-[28px] font-semibold tracking-tight text-[#202720] md:text-[32px]">Good morning{data?.user.name?`, ${data.user.name.split(' ')[0]}`:''}</h1><p className="mt-1.5 text-sm text-[#858e85]">Here’s your forest network at a glance.</p></div><a href={`${django}/admin/`} className="inline-flex items-center gap-2 rounded-xl bg-[#2c6643] px-4 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-[#235538]">Admin tools <ArrowRight size={15}/></a></div>
          {error?<div className="rounded-2xl border border-[#f0d9cf] bg-white p-7"><div className="flex items-start gap-3"><div className="rounded-xl bg-[#fff0e9] p-2 text-[#c66c4a]"><AlertTriangle size={20}/></div><div><h2 className="font-semibold">{error}</h2><p className="mt-1 text-sm text-[#788178]">The dashboard could not load. Try again after the service is available.</p><button onClick={()=>window.location.reload()} className="mt-4 inline-flex rounded-lg bg-[#2c6643] px-4 py-2 text-sm font-semibold text-white">Retry</button></div></div></div>:<>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{metrics.map(item=><MetricCard key={item.key} item={item} value={loading?null:data?.stats[item.key]}/>)}</div>
            <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1.65fr)_minmax(300px,.85fr)]">
              <section className="overflow-hidden rounded-2xl border border-[#e9ece7] bg-white shadow-[0_3px_14px_#21332207]"><div className="flex items-center justify-between border-b border-[#edf0eb] px-5 py-4"><div><h2 className="text-sm font-semibold">Recent reports</h2><p className="mt-1 text-xs text-[#969e96]">Latest updates from your forest teams</p></div><a href={`${django}/fires/`} className="inline-flex items-center gap-1 text-xs font-semibold text-[#39724a] hover:text-[#214f33]">View all <ArrowRight size={14}/></a></div><div className="overflow-x-auto"><table className="w-full min-w-[620px] text-left"><thead><tr className="text-[10px] font-semibold uppercase tracking-[.1em] text-[#9aa29a]"><th className="px-5 py-3">Report</th><th className="px-4 py-3">Location</th><th className="px-4 py-3">Priority</th><th className="px-4 py-3">Status</th><th className="px-5 py-3">Reported</th></tr></thead><tbody>{loading?Array.from({length:4}).map((_,i)=><tr key={i} className="border-t border-[#f0f2ef]"><td colSpan="5" className="px-5 py-4"><div className="h-4 animate-pulse rounded bg-[#f2f4f0]"/></td></tr>):data?.recent.length?data.recent.map(row=><tr key={row.id} className="border-t border-[#f0f2ef] text-xs hover:bg-[#fbfcfa]"><td className="px-5 py-3.5"><div className="flex items-center gap-3"><span className={`grid h-8 w-8 place-items-center rounded-lg ${row.type==='Fire report'?'bg-[#fff1e8] text-[#ce7952]':'bg-[#f1edf8] text-[#8067a5]'}`}>{row.type==='Fire report'?<Flame size={15}/>:<ShieldCheck size={15}/>}</span><span><span className="block max-w-[190px] truncate font-semibold text-[#39423a]">{row.title}</span><span className="mt-1 block text-[10px] text-[#a1a8a1]">{row.id}{row.demo?' · Demo':''}</span></span></div></td><td className="max-w-[150px] truncate px-4 py-3.5 text-[#737d73]">{row.location||'Location pending'}</td><td className="px-4 py-3.5"><span className="rounded-md px-2 py-1 text-[10px] font-semibold" style={{color:severityColor[row.priority],background:`${severityColor[row.priority]}1c`}}>{row.severity}</span></td><td className="px-4 py-3.5"><span className="inline-flex items-center gap-1.5 text-[#667466]"><span className="h-1.5 w-1.5 rounded-full bg-[#84a88c]"/>{row.status}</span></td><td className="whitespace-nowrap px-5 py-3.5 text-[#8b948b]">{dateLabel(row.created_at)}</td></tr>):<tr><td colSpan="5" className="px-5 py-12 text-center text-sm text-[#929b92]">No reports yet. New reports will appear here.</td></tr>}</tbody></table></div></section>
              <div className="space-y-5"><section className="rounded-2xl border border-[#e9ece7] bg-white p-5 shadow-[0_3px_14px_#21332207]"><div className="flex items-start justify-between"><div><h2 className="text-sm font-semibold">Fire risk overview</h2><p className="mt-1 text-xs text-[#969e96]">Reports grouped by severity</p></div><div className="rounded-lg bg-[#fbf0df] p-2 text-[#b17b2e]"><Flame size={17}/></div></div>{loading?<div className="mt-5 h-24 animate-pulse rounded bg-[#f2f4f0]"/>:<ActivityChart rows={data?.fires_by_severity}/>}<div className="mt-5 flex items-center justify-between border-t border-[#edf0eb] pt-4 text-xs"><span className="text-[#8e978e]">Open fire reports</span><strong className="text-[#333c34]">{data?.open_fires??0}</strong></div></section>
                <section className="rounded-2xl bg-[#eaf1e8] p-5"><div className="flex items-start gap-3"><div className="rounded-xl bg-white/80 p-2 text-[#477c53]"><Trees size={18}/></div><div><h2 className="text-sm font-semibold text-[#315b3a]">Field response queue</h2><p className="mt-1 text-xs text-[#728875]">Cases requiring team follow-up</p></div></div><div className="mt-4 space-y-2"><a href={`${django}/rescues/`} className="flex items-center justify-between rounded-xl bg-white/75 px-3.5 py-3 text-xs hover:bg-white"><span className="flex items-center gap-2 text-[#647367]"><PawPrint size={15}/> Wildlife rescue</span><strong className="text-[#344537]">{data?.open_rescues??0}</strong></a><a href={`${django}/conflicts/`} className="flex items-center justify-between rounded-xl bg-white/75 px-3.5 py-3 text-xs hover:bg-white"><span className="flex items-center gap-2 text-[#647367]"><Users size={15}/> Human-wildlife conflict</span><strong className="text-[#344537]">{data?.open_conflicts??0}</strong></a></div></section>
              </div>
            </div>
            <div className="mt-5 grid gap-4 sm:grid-cols-3"><a href={`${django}/patrols/`} className="group flex items-center justify-between rounded-2xl border border-[#e9ece7] bg-white p-4 hover:border-[#c6d9c8]"><span className="flex items-center gap-3"><span className="rounded-xl bg-[#eaf3ec] p-2.5 text-[#34734a]"><Compass size={17}/></span><span><b className="block text-xs">Assign a patrol</b><small className="mt-1 block text-[10px] text-[#9aa29a]">Plan field coverage</small></span></span><ArrowUpRight size={16} className="text-[#a5ada5] group-hover:text-[#39724a]"/></a><a href={`${django}/fires/new/`} className="group flex items-center justify-between rounded-2xl border border-[#e9ece7] bg-white p-4 hover:border-[#ecd2c4]"><span className="flex items-center gap-3"><span className="rounded-xl bg-[#fff1e8] p-2.5 text-[#ce7952]"><Flame size={17}/></span><span><b className="block text-xs">Review fire reports</b><small className="mt-1 block text-[10px] text-[#9aa29a]">Coordinate a response</small></span></span><ArrowUpRight size={16} className="text-[#a5ada5] group-hover:text-[#c87550]"/></a><a href={`${django}/plantations/`} className="group flex items-center justify-between rounded-2xl border border-[#e9ece7] bg-white p-4 hover:border-[#c6d9c8]"><span className="flex items-center gap-3"><span className="rounded-xl bg-[#eef3df] p-2.5 text-[#728747]"><Sprout size={17}/></span><span><b className="block text-xs">Track restoration</b><small className="mt-1 block text-[10px] text-[#9aa29a]">Check planting progress</small></span></span><ArrowUpRight size={16} className="text-[#a5ada5] group-hover:text-[#728747]"/></a></div>
            </>}
            <footer className="mt-9 flex flex-wrap items-center justify-between gap-3 border-t border-[#e5e9e3] pt-5 text-[10px] text-[#9aa29a]"><span>ForestGuard 360 · Smart forest management</span><span className="flex items-center gap-1.5"><CircleHelp size={13}/> Sample records are marked Demo. Locations are manually recorded.</span></footer>
          </div>
      </main>
    </div>
  </div>
}
