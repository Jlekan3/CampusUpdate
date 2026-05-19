import { supabase } from '../config/supabase';

const LOCATIONS_BUCKET   = 'locations';
const DEPARTMENTS_BUCKET = 'departments';
const REPORTS_BUCKET     = 'reports';

// ─── helpers ─────────────────────────────────────────────────────────────────

const getPublicUrl = (bucket, path) =>
  supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;

const blobFromUri = async (uri) => {
  const res = await fetch(uri);
  return res.blob();
};

// ─── Location images ─────────────────────────────────────────────────────────

export const uploadLocationImages = async (locationId, imageAssets) => {
  const urls = [];
  for (let i = 0; i < imageAssets.length; i++) {
    const asset = imageAssets[i];
    const uri   = asset.uri || asset;
    const ext   = (uri.split('.').pop() || 'jpg').toLowerCase();
    const path  = `${locationId}/${Date.now()}_${i}.${ext}`;
    const blob  = await blobFromUri(uri);

    const { error } = await supabase.storage.from(LOCATIONS_BUCKET).upload(path, blob, {
      contentType: `image/${ext === 'jpg' ? 'jpeg' : ext}`,
    });
    if (error) { console.warn('uploadLocationImage:', error.message); continue; }
    urls.push(getPublicUrl(LOCATIONS_BUCKET, path));
  }
  return urls;
};

export const deleteLocationImage = async (imageUrl) => {
  try {
    const url  = new URL(imageUrl);
    const path = url.pathname.split(`/${LOCATIONS_BUCKET}/`)[1];
    if (path) await supabase.storage.from(LOCATIONS_BUCKET).remove([path]);
  } catch (_) {}
};

export const deleteLocationImages = async (locationId) => {
  const { data: files } = await supabase.storage.from(LOCATIONS_BUCKET).list(locationId);
  if (!files?.length) return;
  await supabase.storage.from(LOCATIONS_BUCKET).remove(files.map((f) => `${locationId}/${f.name}`));
};

export const updateLocationImages = async (locationId, newImageAssets, imagesToDelete) => {
  for (const url of (imagesToDelete || [])) await deleteLocationImage(url);
  return uploadLocationImages(locationId, newImageAssets || []);
};

// ─── Department images ────────────────────────────────────────────────────────

export const uploadDepartmentImage = async (filename, uri) => {
  const ext  = (uri.split('.').pop() || 'jpg').toLowerCase();
  const path = `${Date.now()}_${filename}`;
  const blob = await blobFromUri(uri);

  const { data, error } = await supabase.storage.from(DEPARTMENTS_BUCKET).upload(path, blob, {
    contentType: `image/${ext === 'jpg' ? 'jpeg' : ext}`,
    upsert: true,
  });
  if (error) throw error;
  return getPublicUrl(DEPARTMENTS_BUCKET, path);
};

export const deleteDepartmentImage = async (imageUrl) => {
  try {
    const url  = new URL(imageUrl);
    const path = url.pathname.split(`/${DEPARTMENTS_BUCKET}/`)[1];
    if (path) await supabase.storage.from(DEPARTMENTS_BUCKET).remove([path]);
  } catch (_) {}
};

// ─── Report photos ────────────────────────────────────────────────────────────

export const uploadReportPhoto = async (userId, uri) => {
  const ext  = (uri.split('.').pop() || 'jpg').toLowerCase();
  const path = `${userId}/${Date.now()}.${ext}`;
  const blob = await blobFromUri(uri);

  const { error } = await supabase.storage.from(REPORTS_BUCKET).upload(path, blob, {
    contentType: `image/${ext === 'jpg' ? 'jpeg' : ext}`,
  });
  if (error) throw error;
  return getPublicUrl(REPORTS_BUCKET, path);
};
