const SLUG = 'forgetting-repair-queue';
const API_BASE = 'https://api.sociobot.in/api/v1';
const TOKEN_KEY = `sb_license:${SLUG}`;
const VERDICT_KEY = `sb_license_verdict:${SLUG}`;
const DAY = 86_400_000;

interface Verdict { valid: boolean; checkedAt: number; reason?: string }

export const checkoutUrl = `${API_BASE}/products/${SLUG}/checkout`;

function cachedVerdict(): Verdict | null {
  try { return JSON.parse(localStorage.getItem(VERDICT_KEY) ?? 'null') as Verdict | null; }
  catch { return null; }
}

export function captureReturnedLicense(): void {
  const url = new URL(location.href);
  const token = url.searchParams.get('license');
  if (!token) return;
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(VERDICT_KEY, JSON.stringify({ valid: true, checkedAt: 0 }));
  url.searchParams.delete('license');
  history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
}

export function isOptimisticallyUnlocked(): boolean {
  const token = localStorage.getItem(TOKEN_KEY);
  const verdict = cachedVerdict();
  return Boolean(token && verdict?.valid);
}

export async function verifyLicense(force = false): Promise<Verdict> {
  const token = localStorage.getItem(TOKEN_KEY);
  if (!token) return { valid: false, checkedAt: Date.now(), reason: 'missing' };
  const cached = cachedVerdict();
  if (!force && cached && Date.now() - cached.checkedAt < DAY) return cached;
  try {
    const response = await fetch(`${API_BASE}/products/${SLUG}/verify?license=${encodeURIComponent(token)}`);
    if (!response.ok) throw new Error('Verification service unavailable');
    const result = await response.json() as { valid: boolean; reason?: string };
    const verdict = { valid: result.valid, reason: result.reason, checkedAt: Date.now() };
    localStorage.setItem(VERDICT_KEY, JSON.stringify(verdict));
    return verdict;
  } catch {
    return cached ?? { valid: false, checkedAt: 0, reason: 'offline' };
  }
}

export async function restoreLicense(token: string): Promise<Verdict> {
  localStorage.setItem(TOKEN_KEY, token.trim());
  localStorage.removeItem(VERDICT_KEY);
  return verifyLicense(true);
}

export function removeLicense(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(VERDICT_KEY);
}
