// lib/taxonomy/helpers.js

export function normStr(v) {
  return String(v == null ? '' : v).trim();
}

export function normLower(v) {
  return normStr(v).toLowerCase();
}

export function compactSpaces(v) {
  return normStr(v).replace(/\s+/g, ' ');
}

export function safeKey(v) {
  // Convert to a safe ascii-ish slug (for matching only). Does NOT translate Arabic.
  return normLower(v)
    .replace(/\s+/g, '_')
    .replace(/-+/g, '_')
    .replace(/__+/g, '_')
    .replace(/[^a-z0-9_]/g, '');
}

export function matchKeyFromValue(value, items) {
  const raw = normStr(value);
  if (!raw) return '';

  const lower = raw.toLowerCase();
  const safe = safeKey(raw);

  for (const it of items || []) {
    if (!it || !it.key) continue;
    if (lower === it.key || safe === it.key) return it.key;

    const aliases = it.aliases || [];
    for (const a of aliases) {
      const al = String(a || '').trim();
      if (!al) continue;
      if (lower === al.toLowerCase()) return it.key;
      if (safe === safeKey(al)) return it.key;
    }
  }

  return '';
}

export function detectKeyFromText(text, items) {
  const t = normLower(text);
  if (!t) return '';

  for (const it of items || []) {
    if (!it || !it.key) continue;

    // match key
    if (t.includes(it.key)) return it.key;

    const aliases = it.aliases || [];
    for (const a of aliases) {
      const al = normLower(a);
      if (!al) continue;
      if (t.includes(al)) return it.key;
    }
  }

  return '';
}

export function countBy(list, getKeyFn) {
  const m = new Map();
  for (const x of list || []) {
    const k = getKeyFn(x);
    if (!k) continue;
    m.set(k, (m.get(k) || 0) + 1);
  }
  return m;
}
