/**
 * OpenCode Go quota data layer. React-free / SCSS-free.
 *
 * Fetches rolling (5h), weekly, and monthly windows from the lab
 * opencode-go-cliproxyapi plugin, which already holds the API keys.
 */

import type { TFunction } from 'i18next';
import type { AuthFileItem, OpencodeGoQuotaState, OpencodeGoQuotaWindow } from '@/types';
import { apiClient } from '@/services/api';
import { createStatusError, isDisabledAuthFile, parseIsoToMs } from '@/utils/quota';
import { resolveAuthProvider } from '@/utils/quota/validators';
import type { QuotaProviderData } from '../types';

export const OPENCODE_GO_PLUGIN_ID = 'opencode-go-cliproxyapi';

const WINDOW_PERIOD_HOURS: Record<string, number | null> = {
  rolling: 5,
  weekly: 24 * 7,
  monthly: null,
};

const WINDOW_ORDER = ['rolling', 'weekly', 'monthly'] as const;

export function isOpencodeGoFile(file: AuthFileItem): boolean {
  const provider = resolveAuthProvider(file);
  return provider === 'opencode-go' || provider === 'opencode';
}

export function opencodeGoKeyId(file: AuthFileItem): string {
  const raw = file.id ?? file['id'];
  if (typeof raw === 'string' && raw.trim()) return raw.trim();
  return file.name.replace(/\.json$/i, '').trim();
}

interface UpstreamWindow {
  status?: string;
  percent?: number;
  resets_at?: string;
  resetsAt?: string;
}

interface PluginQuotaCard {
  key_id?: string;
  usage?: {
    rolling?: UpstreamWindow;
    weekly?: UpstreamWindow;
    monthly?: UpstreamWindow;
  };
}

const clampPercent = (value: number) => Math.min(100, Math.max(0, Math.round(value)));

export function buildOpencodeGoWindows(payload: PluginQuotaCard): OpencodeGoQuotaWindow[] {
  const usage = payload.usage;
  if (!usage) return [];

  const windows: OpencodeGoQuotaWindow[] = [];
  for (const id of WINDOW_ORDER) {
    const raw = usage[id];
    if (!raw || typeof raw !== 'object') continue;
    const usedPercent =
      typeof raw.percent === 'number' && Number.isFinite(raw.percent)
        ? clampPercent(raw.percent)
        : null;
    const spent = String(raw.status ?? '').toLowerCase() === 'rate-limited';
    const resetAt = raw.resets_at ?? raw.resetsAt;
    windows.push({
      id,
      labelKey: `opencode_go_quota.window_${id}`,
      usedPercent: spent ? 100 : usedPercent,
      resetAtMs: parseIsoToMs(resetAt),
      periodHours: WINDOW_PERIOD_HOURS[id],
      status: typeof raw.status === 'string' ? raw.status : undefined,
    });
  }
  return windows;
}

const fetchOpencodeGoQuota = async (
  file: AuthFileItem,
  t: TFunction
): Promise<OpencodeGoQuotaWindow[]> => {
  const keyId = opencodeGoKeyId(file);
  if (!keyId) {
    throw new Error(t('opencode_go_quota.missing_key_id'));
  }

  try {
    const payload = await apiClient.post<PluginQuotaCard>(
      `/plugins/${OPENCODE_GO_PLUGIN_ID}/quota`,
      { key_id: keyId }
    );
    const windows = buildOpencodeGoWindows(payload ?? {});
    if (windows.length === 0) {
      throw new Error(t('opencode_go_quota.empty_data'));
    }
    return windows;
  } catch (error) {
    const status =
      error && typeof error === 'object' && 'status' in error
        ? Number((error as { status?: number }).status)
        : undefined;
    const message = error instanceof Error ? error.message : t('opencode_go_quota.empty_data');
    throw createStatusError(message, status);
  }
};

export const OPENCODE_GO_CONFIG: QuotaProviderData<OpencodeGoQuotaState, OpencodeGoQuotaWindow[]> =
  {
    type: 'opencode-go',
    i18nPrefix: 'opencode_go_quota',
    filterFn: (file) => isOpencodeGoFile(file) && !isDisabledAuthFile(file),
    fetchQuota: fetchOpencodeGoQuota,
    storeSelector: (state) => state.opencodeGoQuota,
    storeSetter: 'setOpencodeGoQuota',
    buildLoadingState: () => ({ status: 'loading', windows: [] }),
    buildSuccessState: (windows) => ({ status: 'success', windows }),
    buildErrorState: (message, status) => ({
      status: 'error',
      windows: [],
      error: message,
      errorStatus: status,
    }),
  };
