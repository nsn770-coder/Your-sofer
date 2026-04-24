export function optimizeCloudinaryUrl(
  url: string,
  width: number = 800,
  quality: string = 'auto:good'
): string {
  if (!url || !url.includes('cloudinary.com')) return url;
  return url.replace(
    '/upload/',
    `/upload/f_auto,q_${quality},w_${width}/`
  );
}