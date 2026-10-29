export async function uploadImageToCloudinary(file) {
  const auth = await fetch('/api/cloudinary/signature', { method: 'POST', credentials: 'include' })
  const signed = await auth.json()
  if (!auth.ok) throw new Error(signed.error || 'Could not prepare image upload.')

  const form = new FormData()
  form.append('file', file)
  form.append('api_key', signed.apiKey)
  form.append('timestamp', String(signed.timestamp))
  form.append('folder', signed.folder)
  form.append('signature', signed.signature)

  const response = await fetch(`https://api.cloudinary.com/v1_1/${signed.cloudName}/image/upload`, { method: 'POST', body: form })
  const result = await response.json()
  if (!response.ok) throw new Error(result.error?.message || 'Cloudinary could not upload this image.')
  return { imageUrl: result.secure_url, cloudinaryPublicId: result.public_id }
}
