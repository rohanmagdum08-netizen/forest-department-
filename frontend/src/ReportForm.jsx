import { useState } from 'react'
import { ArrowLeft, ImagePlus, LoaderCircle, Leaf } from 'lucide-react'
import { uploadImageToCloudinary } from './cloudinary.js'

export default function ReportForm({ kind }) {
  const isFire = kind === 'fires'
  const [busy, setBusy] = useState(false)
  const [photo, setPhoto] = useState(null)
  const [message, setMessage] = useState('')

  async function submit(event) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    setBusy(true); setMessage('')
    try {
      const image = photo ? await uploadImageToCloudinary(photo) : {}
      const response = await fetch(`/api/${kind}`, {
        method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: form.get('title'), description: form.get('description'), severity: form.get('severity'), latitude: form.get('latitude') || null, longitude: form.get('longitude') || null, ...image }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Could not save report.')
      window.location.assign('/dashboard')
    } catch (error) { setMessage(error.message) } finally { setBusy(false) }
  }

  return <main className="min-h-screen bg-[#f6f7f4] px-5 py-10 text-[#232a24]">
    <div className="mx-auto max-w-2xl"><a href="/dashboard" className="inline-flex items-center gap-2 text-sm text-[#647367]"><ArrowLeft size={16}/>Dashboard</a>
      <header className="mb-6 mt-8 flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-2xl bg-[#eaf3ec] text-[#34734a]"><Leaf size={22}/></span><div><p className="text-xs font-semibold uppercase tracking-wider text-[#719276]">ForestGuard 360</p><h1 className="mt-1 text-2xl font-semibold">{isFire?'Report a forest fire':'Report a wildlife conflict'}</h1></div></header>
      <form onSubmit={submit} className="space-y-5 rounded-3xl border border-[#e9ece7] bg-white p-6 shadow-[0_3px_14px_#21332207] md:p-8">
        {message&&<p role="alert" className="rounded-xl bg-[#fff0e9] p-3 text-sm text-[#a14e35]">{message}</p>}
        <label className="block text-sm font-medium">Title<input name="title" required maxLength="180" className="mt-2 h-11 w-full rounded-xl border border-[#dfe5dd] px-3 outline-none focus:border-[#76a57c]"/></label>
        <label className="block text-sm font-medium">Details<textarea name="description" rows="4" className="mt-2 w-full rounded-xl border border-[#dfe5dd] p-3 outline-none focus:border-[#76a57c]"/></label>
        <div className="grid gap-4 sm:grid-cols-3"><label className="text-sm font-medium">Severity<select name="severity" className="mt-2 h-11 w-full rounded-xl border border-[#dfe5dd] bg-white px-3"><option>LOW</option><option selected>MEDIUM</option><option>HIGH</option><option>CRITICAL</option></select></label><label className="text-sm font-medium">Latitude<input name="latitude" type="number" step="any" min="-90" max="90" className="mt-2 h-11 w-full rounded-xl border border-[#dfe5dd] px-3"/></label><label className="text-sm font-medium">Longitude<input name="longitude" type="number" step="any" min="-180" max="180" className="mt-2 h-11 w-full rounded-xl border border-[#dfe5dd] px-3"/></label></div>
        <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-[#cbd8ca] p-4 text-sm text-[#647367]"><ImagePlus size={19}/><span className="flex-1">{photo?.name || 'Add a photo (Cloudinary)'}</span><input type="file" accept="image/*" className="sr-only" onChange={e=>setPhoto(e.target.files?.[0]||null)}/></label>
        <button disabled={busy} className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#2c6643] text-sm font-semibold text-white hover:bg-[#235538] disabled:opacity-60">{busy&&<LoaderCircle size={16} className="animate-spin"/>}Submit report</button>
      </form>
    </div>
  </main>
}
