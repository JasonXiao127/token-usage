import type { Metric } from '../../shared/types';

export interface DashboardState {
  metric: Metric;
  q: string;
  lab: string; // '' = all, else lab id
  status: '' | 'matched' | 'opencode-only' | 'openrouter-only';
  modality: string;
  hasUsage: boolean;
  showAll: boolean;
  groupVariants: boolean;
  sort: string;
  dir: 'asc' | 'desc';
  page: number;
  model: string; // open drawer key
}

export const DEFAULT_STATE: DashboardState = {
  metric: 'week',
  q: '',
  lab: '',
  status: '',
  modality: 'all',
  hasUsage: true,
  showAll: false,
  groupVariants: true,
  sort: 'oc',
  dir: 'desc',
  page: 1,
  model: '',
};

const VALID_METRICS: Metric[] = ['day', 'week', 'month'];

export function parseState(search: string): DashboardState {
  const p = new URLSearchParams(search);
  const metric = p.get('metric');
  const dir = p.get('dir');
  const page = parseInt(p.get('page') || '1', 10);
  return {
    metric: VALID_METRICS.includes(metric as Metric) ? (metric as Metric) : 'week',
    q: p.get('q') || '',
    lab: p.get('lab') || '',
    status: (['matched', 'opencode-only', 'openrouter-only'].includes(p.get('status') || '') ? p.get('status') : '') as DashboardState['status'],
    modality: p.get('mod') || 'all',
    hasUsage: p.get('usage') !== '0',
    showAll: p.get('all') === '1',
    groupVariants: p.get('grp') !== '0',
    sort: p.get('sort') || 'oc',
    dir: dir === 'asc' ? 'asc' : 'desc',
    page: isFinite(page) && page >= 1 ? page : 1,
    model: p.get('model') || '',
  };
}

export function serializeState(s: DashboardState): string {
  const p = new URLSearchParams();
  if (s.metric !== 'week') p.set('metric', s.metric);
  if (s.q) p.set('q', s.q);
  if (s.lab) p.set('lab', s.lab);
  if (s.status) p.set('status', s.status);
  if (s.modality !== 'all') p.set('mod', s.modality);
  if (!s.hasUsage) p.set('usage', '0');
  if (s.showAll) p.set('all', '1');
  if (!s.groupVariants) p.set('grp', '0');
  if (s.sort !== 'oc') p.set('sort', s.sort);
  if (s.dir !== 'desc') p.set('dir', s.dir);
  if (s.page !== 1) p.set('page', String(s.page));
  if (s.model) p.set('model', s.model);
  const str = p.toString();
  return str ? '?' + str : '';
}
