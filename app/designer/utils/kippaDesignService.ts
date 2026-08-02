// ── שירות העלאת עיצוב כיפה ל-Cloudinary ──────────────────────────────────────
// unsigned upload עם ה-preset הקיים של האתר. אין תלות בשרת — רץ מהדפדפן.

const CLOUD_NAME = 'dyxzq3ucy';
const UPLOAD_PRESET = 'yoursofer_upload';

export function generateDesignId(): string {
  return `kd-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * מעלה data-URL של PNG ל-Cloudinary ומחזיר secure_url.
 * זורק שגיאה אם ההעלאה נכשלה — הקורא אחראי להציג הודעה ידידותית.
 */
export async function uploadDesignToCloudinary(dataUrl: string): Promise<string> {
  const form = new FormData();
  form.append('file', dataUrl);
  form.append('upload_preset', UPLOAD_PRESET);
  form.append('folder', 'kippa-designs');

  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
    method: 'POST',
    body: form,
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Cloudinary upload failed (${res.status}): ${body.slice(0, 200)}`);
  }
  const json = (await res.json()) as { secure_url?: string };
  if (!json.secure_url) throw new Error('Cloudinary upload: missing secure_url');
  return json.secure_url;
}

/** קישור הורדה של הקובץ המלא (fl_attachment) — לשימוש באדמין */
export function designDownloadUrl(previewImageUrl: string): string {
  try {
    return previewImageUrl.replace('/upload/', '/upload/fl_attachment/');
  } catch {
    return previewImageUrl;
  }
}
