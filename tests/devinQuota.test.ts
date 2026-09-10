import { describe, expect, test } from 'bun:test';
import {
  buildDevinState,
  buildDevinWindows,
  devinQuotaUrl,
} from '@/features/quota/providers/devin/data';
import { isDevinFile } from '@/utils/quota';
import { classifyQuotaFiles } from '@/features/quota/logic';
import { collectQuotaRowInstants } from '@/features/quota/resetSchedule';
import { buildTimelineLane } from '@/features/quota/quotaTimelineModel';
import type { AuthFileItem, DevinQuotaState } from '@/types';

const file = (name: string, extra: Partial<AuthFileItem> = {}): AuthFileItem =>
  ({ name, type: 'devin', provider: 'devin', ...extra }) as AuthFileItem;

describe('isDevinFile', () => {
  test('accepts devin and cognition, rejects others', () => {
    expect(isDevinFile(file('devin-paul.json'))).toBe(true);
    expect(isDevinFile({ name: 'c.json', type: 'cognition' } as AuthFileItem)).toBe(true);
    expect(isDevinFile({ name: 'c.json', type: 'claude' } as AuthFileItem)).toBe(false);
  });
});

describe('buildDevinWindows', () => {
  test('maps daily then weekly with used percent, period hours, and reset instants', () => {
    const windows = buildDevinWindows({
      usage: {
        daily: { status: 'ok', percent: 30, resets_at: '2026-09-11T00:00:00Z' },
        weekly: { status: 'rate-limited', percent: 100, resets_at: '2026-09-15T00:00:00Z' },
      },
    });
    expect(windows.map((w) => w.id)).toEqual(['daily', 'weekly']);
    expect(windows[0]?.usedPercent).toBe(30);
    expect(windows[0]?.periodHours).toBe(24);
    expect(windows[0]?.resetAtMs).toBe(Date.parse('2026-09-11T00:00:00Z'));
    expect(windows[1]?.usedPercent).toBe(100);
    expect(windows[1]?.periodHours).toBe(168);
  });

  test('Max plans have no daily window and still produce a weekly row', () => {
    const windows = buildDevinWindows({
      usage: { weekly: { status: 'ok', percent: 12, resets_at: '2026-09-15T00:00:00Z' } },
    });
    expect(windows).toHaveLength(1);
    expect(windows[0]?.id).toBe('weekly');
  });
});

describe('buildDevinState', () => {
  test('carries plan and extra-usage balance, treating missing balance as null', () => {
    const state = buildDevinState({
      plan: 'Max',
      usage: { weekly: { status: 'ok', percent: 5, resets_at: '2026-09-15T00:00:00Z' } },
      extra_usage_balance_usd: 12.5,
    });
    expect(state.status).toBe('success');
    expect(state.plan).toBe('Max');
    expect(state.extraUsageBalanceUsd).toBe(12.5);
    expect(buildDevinState({ usage: {} }).extraUsageBalanceUsd).toBeNull();
  });
});

describe('devinQuotaUrl', () => {
  test('strips the management prefix and appends the shim route', () => {
    expect(devinQuotaUrl('https://cliproxy.lab.datahaze.co.uk/v0/management')).toBe(
      'https://cliproxy.lab.datahaze.co.uk/devin/quota'
    );
    expect(devinQuotaUrl('cliproxy.lab:8317/')).toBe('http://cliproxy.lab:8317/devin/quota');
  });
});

describe('page wiring', () => {
  const quota: DevinQuotaState = buildDevinState({
    usage: {
      daily: { status: 'ok', percent: 40, resets_at: '2026-09-11T00:00:00Z' },
      weekly: { status: 'ok', percent: 10, resets_at: '2026-09-15T00:00:00Z' },
    },
  });

  test('classifies devin auth files into the devin tab', () => {
    const entries = classifyQuotaFiles([
      file('devin-paul.json'),
      file('claude.json', { type: 'claude', provider: 'claude' }),
    ]);
    expect(entries.map((e) => e.type)).toContain('devin');
  });

  test('reset schedule and timeline read the window rows', () => {
    expect(collectQuotaRowInstants('devin', quota).map((r) => r.rowId)).toEqual([
      'daily',
      'weekly',
    ]);
    const day = buildTimelineLane({
      name: 'devin-paul.json',
      displayName: 'devin-paul.json',
      provider: 'devin',
      quota,
      maxPeriodHours: 24,
    });
    expect(day.periodHours).toBe(24);
    expect(day.remaining).toBe(60);
    const fortnight = buildTimelineLane({
      name: 'devin-paul.json',
      displayName: 'devin-paul.json',
      provider: 'devin',
      quota,
      maxPeriodHours: 24 * 14,
    });
    expect(fortnight.periodHours).toBe(168);
    expect(fortnight.remaining).toBe(90);
  });
});
