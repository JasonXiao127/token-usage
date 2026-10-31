import type { OrBase } from './match.ts';
import type { OrCatalogModel } from './openrouter.ts';

/**
 * Display name for a lab id: the known OpenCode name when it differs from
 * the id, else a title-cased provider (never a raw lowercase id).
 * Pure (takes `known` instead of closing over collector state) so it is unit-testable.
 */
export function prettyLabName(labId: string, prov: string, known: string): string {
  if (known !== labId) return known;
  const raw = prov && prov !== labId ? prov : labId;
  const titled = raw.replace(/[-_]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()).trim();
  return titled || labId;
}

/**
 * OpenRouter catalog architecture (modalities) for an aggregated OR base.
 * Tries the version-stripped base then each full variant permaslug
 * (de-dated — catalog ids carry no date suffix), with and without `:free`.
 * Returns null when nothing matches; callers keep OpenCode detail data authoritative.
 */
export function catalogArchFor(
  catById: Map<string, OrCatalogModel>,
  or: OrBase,
): { input: string[]; output: string[] } | null {
  const cands: string[] = [or.base, `${or.base}:free`];
  for (const perma of or.permas) {
    const bare = perma.split(':')[0]!;
    cands.push(bare, `${bare}:free`);
    const dated = bare.match(/-\d{8}$/);
    if (dated) {
      const debased = bare.slice(0, -9);
      cands.push(debased, `${debased}:free`);
    }
  }
  for (const c of cands) {
    const hit = catById.get(c);
    if (hit?.architecture) {
      return {
        input: hit.architecture.input_modalities || [],
        output: hit.architecture.output_modalities || [],
      };
    }
  }
  return null;
}
