/**
 * Devin quota data layer. React-free / SCSS-free.
 *
 * Devin has no 5-hour window: plan quota is daily + weekly (Max plans are weekly
 * only) plus an extra-usage balance. The Devin CLI has no HTTP API, so the Mini
 * runs a shim (~/proxy/scripts/devin-acp-shim.py) that reads Cognition's
 * GetUserStatus RPC with the `devin auth login` credential. Caddy exposes it
 * read-only at /devin/quota on the same origin as the management API.
 */

import type { TFunction } from 'i18next';
import type { AuthFileItem, DevinQuotaState, DevinQuotaWindow } from '@/types';
import { useAuthStore } from '@/stores';
import { normalizeApiBase } from '@/utils/connection';
import { createStatusError, isDevinFile, isDisabledAuthFile, parseIsoToMs } from '@/utils/quota';
import type { QuotaProviderData } from '../types';

export const DEVIN_QUOTA_PATH = '/devin/quota';

const WINDOW_PERIOD_HOURS: Record<string, number> = { daily: 24, weekly: 24 * 7 };
const WINDOW_ORDER = ['daily', 'weekly'] as const;

interface ShimWindow {
  status?: string;
  percent?: number;
  remaining_percent?: number;
  resets_at?: string | null;
  period_hours?: number;
}

export interface DevinShimQuota {
  provider?: string;
  plan?: string | null;
  usage?: { daily?: ShimWindow; weekly?: ShimWindow };
  extra_usage_balance_usd?: number | null;
}

const clampPercent = (value: number) => Math.min(100, Math.max(0, Math.round(value)));

export function buildDevinWindows(payload: DevinShimQuota): DevinQuotaWindow[] {
  const usage = payload.usage;
  if (!usage) return [];
  const windows: DevinQuotaWindow[] = [];
  for (const id of WINDOW_ORDER) {
    const raw = usage[id];
    if (!raw || typeof raw !== 'object') continue;
    const usedPercent =
      typeof raw.percent === 'number' && Number.isFinite(raw.percent)
        ? clampPercent(raw.percent)
        : null;
    const spent = String(raw.status ?? '').toLowerCase() === 'rate-limited';
    windows.push({
      id,
      labelKey: `devin_quota.window_${id}`,
      usedPercent: spent ? 100 : usedPercent,
      resetAtMs: parseIsoToMs(raw.resets_at),
      periodHours: WINDOW_PERIOD_HOURS[id] ?? null,
      status: typeof raw.status === 'string' ? raw.status : undefined,
    });
  }
  return windows;
}

export function buildDevinState(payload: DevinShimQuota): DevinQuotaState {
  const balance = payload.extra_usage_balance_usd;
  return {
    status: 'success',
    windows: buildDevinWindows(payload),
    plan: typeof payload.plan === 'string' && payload.plan.trim() ? payload.plan.trim() : null,
    extraUsageBalanceUsd: typeof balance === 'number' && Number.isFinite(balance) ? balance : null,
  };
}

export function devinQuotaUrl(apiBase: string): string {
  return `${normalizeApiBase(apiBase)}${DEVIN_QUOTA_PATH}`;
}

const fetchDevinQuota = async (_file: AuthFileItem, t: TFunction): Promise<DevinShimQuota> => {
  const url = devinQuotaUrl(useAuthStore.getState().apiBase);
  let response: Response;
  try {
    response = await fetch(url, { headers: { Accept: 'application/json' } });
  } catch (error) {
    const message = error instanceof Error ? error.message : t('devin_quota.empty_data');
    throw createStatusError(message);
  }
  const body = (await response.json().catch(() => null)) as
    (DevinShimQuota & { error?: { message?: string; code?: string } }) | null;
  if (!response.ok) {
    const code = body?.error?.code;
    const message =
      code === 'not_logged_in'
        ? t('devin_quota.not_logged_in')
        : (body?.error?.message ?? t('devin_quota.empty_data'));
    throw createStatusError(message, response.status);
  }
  if (!body || !body.usage || Object.keys(body.usage).length === 0) {
    throw createStatusError(t('devin_quota.empty_data'));
  }
  return body;
};

export const DEVIN_CONFIG: QuotaProviderData<DevinQuotaState, DevinShimQuota> = {
  type: 'devin',
  i18nPrefix: 'devin_quota',
  filterFn: (file) => isDevinFile(file) && !isDisabledAuthFile(file),
  fetchQuota: fetchDevinQuota,
  storeSelector: (state) => state.devinQuota,
  storeSetter: 'setDevinQuota',
  buildLoadingState: () => ({
    status: 'loading',
    windows: [],
    plan: null,
    extraUsageBalanceUsd: null,
  }),
  buildSuccessState: buildDevinState,
  buildErrorState: (message, status) => ({
    status: 'error',
    windows: [],
    plan: null,
    extraUsageBalanceUsd: null,
    error: message,
    errorStatus: status,
  }),
};
