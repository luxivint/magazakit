import { createHash } from 'node:crypto';
import type { TrendyolTariff } from '@magazakit/contracts';
import { CARGO_BAREM_URL, CARGO_PDF_URL, PHB_RULE_URL, normalizeTariff } from './trendyol-tariff';

const STALE_MS = 6 * 60 * 60 * 1000;

async function fetchMeta(url: string, method: 'HEAD' | 'GET'): Promise<{
  lastModified: string | null;
  etag: string | null;
  contentLength: string | null;
  hash: string | null;
}> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 8000);
  try {
    const res = await fetch(url, {
      method,
      signal: ctrl.signal,
      headers: { 'User-Agent': 'Magazam-tariff-watch/1.0' },
    });
    const lastModified = res.headers.get('last-modified');
    const etag = res.headers.get('etag');
    const contentLength = res.headers.get('content-length');
    let hash: string | null = null;
    if (method === 'GET') {
      const text = await res.text();
      hash = createHash('sha256').update(text.slice(0, 12_000)).digest('hex');
    }
    return { lastModified, etag, contentLength, hash };
  } catch {
    return { lastModified: null, etag: null, contentLength: null, hash: null };
  } finally {
    clearTimeout(timer);
  }
}

/** HEAD/GET fingerprints only. Never parse PDF or HTML tables into amounts. */
export async function watchTariffSources(tariff: TrendyolTariff, force = false): Promise<TrendyolTariff> {
  const next = normalizeTariff(tariff);
  if (process.env.NODE_ENV === 'test' && !force) return next;
  const last = next.watch.checkedAt ? Date.parse(next.watch.checkedAt) : 0;
  if (!force && last > 0 && Date.now() - last < STALE_MS) return next;
  const [pdf, barem, phb] = await Promise.all([
    fetchMeta(CARGO_PDF_URL, 'HEAD'),
    fetchMeta(CARGO_BAREM_URL, 'GET'),
    fetchMeta(PHB_RULE_URL, 'GET'),
  ]);
  const hadSnapshot = Boolean(
    next.watch.pdfLastModified || next.watch.pdfEtag || next.watch.akademiBaremHash || next.watch.akademiPhbHash,
  );
  const changed =
    hadSnapshot &&
    ((pdf.lastModified && next.watch.pdfLastModified && pdf.lastModified !== next.watch.pdfLastModified) ||
      (pdf.etag && next.watch.pdfEtag && pdf.etag !== next.watch.pdfEtag) ||
      (pdf.contentLength && next.watch.pdfContentLength && pdf.contentLength !== next.watch.pdfContentLength) ||
      (barem.hash && next.watch.akademiBaremHash && barem.hash !== next.watch.akademiBaremHash) ||
      (phb.hash && next.watch.akademiPhbHash && phb.hash !== next.watch.akademiPhbHash));
  next.watch = {
    pdfUrl: CARGO_PDF_URL,
    pdfLastModified: pdf.lastModified ?? next.watch.pdfLastModified,
    pdfEtag: pdf.etag ?? next.watch.pdfEtag,
    pdfContentLength: pdf.contentLength ?? next.watch.pdfContentLength,
    akademiBaremHash: barem.hash ?? next.watch.akademiBaremHash,
    akademiPhbHash: phb.hash ?? next.watch.akademiPhbHash,
    checkedAt: new Date().toISOString(),
    sourceChanged: Boolean(changed) || next.watch.sourceChanged,
  };
  if (changed) {
    next.watch.sourceChanged = true;
    next.sourceCheckNotice = 'Tarifeyi kontrol et — Akademi/PDF kaynağı değişmiş olabilir. Tutarlar otomatik güncellenmez.';
  }
  return next;
}
