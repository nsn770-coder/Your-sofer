const CLOUDINARY_CLOUD = 'dyxzq3ucy';
const CLOUDINARY_PRESET = 'yoursofer_upload';

export async function uploadToCloudinary(file: File): Promise<string> {
  const fd = new FormData();
  fd.append('file', file);
  fd.append('upload_preset', CLOUDINARY_PRESET);
  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD}/image/upload`, {
    method: 'POST',
    body: fd,
  });
  if (!res.ok) throw new Error('Upload failed');
  return (await res.json()).secure_url as string;
}
