import { supabase } from './client';

/**
 * Sube un avatar al bucket `avatars` y devuelve la URL pública.
 * Path canónico: {user_id}/avatar.{ext}.
 *
 * IMPORTANTE: el bucket `avatars` debe estar creado en Supabase Storage
 * (público de lectura, escritura solo por dueño). La migración de Fase 1
 * configura las policies; el bucket en sí lo creas manualmente desde el
 * dashboard de Supabase la primera vez.
 */
export async function uploadAvatar(
  userId: string,
  fileBlob: Blob,
  ext: string,
): Promise<string> {
  const safeExt = ext.replace(/[^a-z0-9]/gi, '').toLowerCase() || 'jpg';
  const path = `${userId}/avatar.${safeExt}`;

  const { error } = await supabase.storage
    .from('avatars')
    .upload(path, fileBlob, {
      upsert: true,
      contentType: blobMimeForExt(safeExt),
      cacheControl: '3600',
    });
  if (error) throw error;

  const { data } = supabase.storage.from('avatars').getPublicUrl(path);
  // Añadimos un cache-buster para que la app vea inmediatamente la nueva imagen.
  return `${data.publicUrl}?t=${Date.now()}`;
}

function blobMimeForExt(ext: string): string {
  switch (ext) {
    case 'png':
      return 'image/png';
    case 'webp':
      return 'image/webp';
    case 'gif':
      return 'image/gif';
    case 'jpg':
    case 'jpeg':
    default:
      return 'image/jpeg';
  }
}
