import { useEffect, useState } from 'react'
import { Activity, Flame, Leaf, LogOut, Menu, Plus, ShieldAlert, UsersRound, X } from 'lucide-react'
import { api } from './api.js'

const links = [
  { href: '/dashboard', label: 'Command center', icon: Activity, section: 'OPERATIONS' },
  { href: '/incidents', label: 'Incident queue', icon: ShieldAlert, section: 'OPERATIONS' },
  { href: '/team', label: 'Response team', icon: UsersRound, section: 'OPERATIONS', adminOnly: true },
  { href: '/report/fire', label: 'Report a fire', icon: Flame, section: 'COMMUNITY' },
  { href: '/report/conflict', label: 'Report a wildlife conflict', icon: Plus, section: 'COMMUNITY' },
]

export default function Layout({ user, path, children, onLogout, openCount = 0 }) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [connected,setConnected]=useState(null)
  useEffect(()=>{api('/api/health').then(()=>setConnected(true)).catch(()=>setConnected(false))},[])
  const active = path.startsWith('/report/') ? path : path.startsWith('/incidents') ? '/incidents' : path === '/team' ? '/team' : path === '/my-reports' ? '/my-reports' : '/dashboard'
  const visibleLinks = links.filter(link => (link.href !== '/incidents' || ['ADMIN','OFFICER','RESCUE'].includes(user.role)) && (!link.adminOnly || user.role === 'ADMIN'))
  const Sidebar = () => <aside className="flex h-full w-[260px] shrink-0 flex-col bg-[#163b2d] text-white">
    <a href="/dashboard" className="flex h-[76px] items-center gap-3 border-b border-white/10 px-5"><div className="grid h-10 w-10 place-items-center rounded-xl bg-[#d6e9b6] text-[#163b2d]"><Leaf size={22}/></div><div><div className="font-semibold tracking-tight">ForestGuard <span className="text-[#d6e9b6]">360</span></div><div className="mt-0.5 text-[10px] uppercase tracking-[.16em] text-white/50">Forest response</div></div></a>
    <nav className="flex-1 overflow-y-auto px-3 py-6">{['OPERATIONS','COMMUNITY'].map(group=>{const groupLinks=visibleLinks.filter(link=>link.section===group);return groupLinks.length>0&&<div className="mb-7" key={group}><p className="mb-2 px-3 text-[10px] font-semibold tracking-[.15em] text-white/45">{group}</p><div className="space-y-1">{groupLinks.map(link=>{const Icon=link.icon;const selected=active===link.href;return <a key={link.href} href={link.href} onClick={()=>setMobileOpen(false)} className={`flex min-h-11 items-center gap-3 rounded-xl px-3 text-[13px] transition ${selected?'bg-[#2d5c43] font-medium text-white':'text-white/70 hover:bg-white/8 hover:text-white'}`}><Icon size={17} className={selected?'text-[#d6e9b6]':'text-white/55'}/><span className="flex-1">{link.label}</span>{link.href==='/incidents'&&openCount>0&&<span className="rounded-md bg-white/10 px-2 py-0.5 text-[10px]">{openCount}</span>}</a>})}</div></div>})}
      <a href="/my-reports" className={`flex min-h-11 items-center gap-3 rounded-xl px-3 text-[13px] transition ${active==='/my-reports'?'bg-[#2d5c43] font-medium text-white':'text-white/70 hover:bg-white/8 hover:text-white'}`}><Activity size={17} className="text-white/55"/>My reports</a>
    </nav>
    <div className="border-t border-white/10 p-4"><div className="flex items-center gap-3 px-2"><div className="grid h-9 w-9 place-items-center rounded-full bg-[#416b50] text-sm font-semibold">{user.name?.slice(0,1).toUpperCase()}</div><div className="min-w-0 flex-1"><p className="truncate text-xs font-semibold">{user.name}</p><p className="mt-0.5 text-[10px] text-white/50">{user.role.toLowerCase().replace('_',' ')}</p></div><button onClick={onLogout} aria-label="Sign out" title="Sign out" className="grid h-10 w-10 place-items-center rounded-lg text-white/60 hover:bg-white/10 hover:text-white"><LogOut size={17}/></button></div></div>
  </aside>
  return <div className="min-h-screen bg-[#f5f7f3] text-[#222a23]"><div className="flex min-h-screen"><div className="hidden lg:block"><Sidebar/></div>
    {mobileOpen&&<div className="fixed inset-0 z-50 flex lg:hidden"><button aria-label="Close navigation" className="absolute inset-0 bg-black/40" onClick={()=>setMobileOpen(false)}/><div className="relative"><Sidebar/><button aria-label="Close navigation" onClick={()=>setMobileOpen(false)} className="absolute right-3 top-5 rounded-lg p-2 text-white"><X size={18}/></button></div></div>}
    <main className="min-w-0 flex-1"><header className="sticky top-0 z-20 flex h-[68px] items-center justify-between border-b border-[#e6ebe4] bg-white/95 px-5 backdrop-blur md:px-8"><div className="flex items-center gap-3"><button aria-label="Open navigation" onClick={()=>setMobileOpen(true)} className="grid h-10 w-10 place-items-center rounded-lg text-[#667067] hover:bg-[#f2f5f0] lg:hidden"><Menu size={20}/></button><span className="hidden text-xs text-[#788178] sm:inline">Operations desk</span></div><div className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-[11px] font-medium ${connected===false?'bg-[#fbe9e7] text-[#a7473e]':'bg-[#edf4ea] text-[#3d7045]'}`}><span className={`h-1.5 w-1.5 rounded-full ${connected===false?'bg-[#c95b50]':'bg-[#53965c]'}`}/>{connected===null?'Checking connection':connected?'PostgreSQL connected':'Connection unavailable'}</div></header><div className="mx-auto max-w-[1440px] p-5 md:p-8">{children}</div></main>
  </div></div>
}
