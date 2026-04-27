type ImageContext = 'thumbnail' | 'card' | 'full' | 'hero';

export function getCloudinaryUrl(
  publicId: string,
  context: ImageContext = 'card'
): string {
  const transforms: Record<ImageContext, string> = {
    thumbnail: 'w_150,h_150,c_fill,q_auto,f_auto',
    card:      'w_400,h_400,c_fill,q_auto:good,f_auto',
    full:      'w_800,q_auto:good,f_auto',
    hero:      'w_1200,q_auto:low,f_auto',
  };
  const base = 'https://res.cloudinary.com/dyxzq3ucy/image/upload';
  return `${base}/${transforms[context]}/${publicId}`;
}
