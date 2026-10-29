import { useEffect, useState } from 'react'
import { LoaderCircle } from 'lucide-react'
import { api } from './api.js'
import Dashboard from './Dashboard.jsx'
import IncidentQueue from './IncidentQueue.jsx'
import IncidentDetail from './IncidentDetail.jsx'
import Layout from './Layout.jsx'
import Login from './Login.jsx'
import MyReports from './MyReports.jsx'
import ReportForm from './ReportForm.jsx'
import TeamPage from './TeamPage.jsx'

const staffRoles=['ADMIN','OFFICER','RESCUE']

export default function App(){
  const [user,setUser]=useState(null);const [loading,setLoading]=useState(true);const [openCount,setOpenCount]=useState(0);const [sessionError,setSessionError]=useState('')
  const path=window.location.pathname.replace(/\/$/,'')||'/dashboard'
  useEffect(()=>{api('/api/auth/session').then(result=>setUser(result.user)).catch(error=>setSessionError(error.message)).finally(()=>setLoading(false))},[])
  useEffect(()=>{if(user&&staffRoles.includes(user.role))api('/api/admin/overview').then(result=>setOpenCount(result.stats.open)).catch(()=>{})},[user])
  async function logout(){try{await api('/api/auth/logout',{method:'POST'})}finally{setUser(null);window.location.assign('/login')}}
  function onLogin(nextUser){setUser(nextUser);window.location.assign(nextUser.role==='CITIZEN'||nextUser.role==='TOURIST'?'/my-reports':'/dashboard')}
  if(loading)return <main className="grid min-h-screen place-items-center bg-[#f5f7f3] text-[#5c725d]"><LoaderCircle className="animate-spin" size={23}/></main>
  if(!user||path==='/login')return <Login onLogin={onLogin}/>
  const isStaff=staffRoles.includes(user.role)
  if(path==='/report/fire'||path==='/fires/new')return <ReportForm kind="fires"/>
  if(path==='/report/conflict'||path==='/conflicts/new')return <ReportForm kind="conflicts"/>
  let page
  if(path==='/incidents'&&isStaff)page=<IncidentQueue user={user}/>
  else if(path.startsWith('/incidents/')&&isStaff){const [, ,type,id]=path.split('/');page=<IncidentDetail type={type} id={id} user={user}/>}
  else if(path==='/team'&&user.role==='ADMIN')page=<TeamPage/>
  else if(path==='/my-reports'||!isStaff)page=<MyReports/>
  else page=<Dashboard user={user}/>
  return <Layout user={user} path={path} onLogout={logout} openCount={openCount}>{page}</Layout>
}
