const buckets = new Map();

function getCacheBucket(name) {
  if (!buckets.has(name)) buckets.set(name, new Map());
  return buckets.get(name);
}

async function remember(name, key, ttlMs, loader) {
  const bucket = getCacheBucket(name);
  const now = Date.now();
  const cached = bucket.get(key);
  if (cached && cached.expiresAt > now) return cached.value;

  const value = await loader();
  bucket.set(key, { value, expiresAt: now + ttlMs });
  return value;
}

function clearCache(name) {
  if (name) buckets.delete(name);
  else buckets.clear();
}

module.exports = { remember, clearCache };
