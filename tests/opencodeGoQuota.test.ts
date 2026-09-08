import { describe, expect, test } from 'bun:test';
import {
  buildOpencodeGoWindows,
  isOpencodeGoFile,
  opencodeGoKeyId,
} from '@/features/quota/providers/opencodeGo/data';
import { classifyQuotaFiles, buildTabCounts } from '@/features/quota/logic';
import { collectQuotaRowInstants } from '@/features/quota/resetSchedule';
import { buildTimelineLane } from '@/features/quota/quotaTimelineModel';
import type { AuthFileItem, OpencodeGoQuotaState } from '@/types';

const file = (name: string, extra: Partial<AuthFileItem> = {}): AuthFileItem =>
  ({ name, type: 'opencode-go', provider: 'opencode-go', ...extra }) as AuthFileItem;

describe('isOpencodeGoFile', () => {
  test('accepts opencode-go and opencode types', () => {
    expect(isOpencodeGoFile(file('a.json'))).toBe(true);
    expect(isOpencodeGoFile({ name: 'b.json', type: 'opencode' } as AuthFileItem)).toBe(true);
    expect(isOpencodeGoFile({ name: 'c.json', type: 'claude' } as AuthFileItem)).toBe(false);
  });
});

describe('opencodeGoKeyId', () => {
  test('prefers id then strips .json from the file name', () => {
    expect(opencodeGoKeyId(file('opencode-go-key-abc.json', { id: 'opencode-go-key-abc' }))).toBe(
      'opencode-go-key-abc'
    );
    expect(opencodeGoKeyId(file('opencode-go-key-abc.json'))).toBe('opencode-go-key-abc');
  });
});

describe('buildOpencodeGoWindows', () => {
  test('maps used percent, rate-limited as spent, and period hours', () => {
    const windows = buildOpencodeGoWindows({
      usage: {
        rolling: { status: 'ok', percent: 16, resets_at: '2026-09-08T20:00:00Z' },
        weekly: { status: 'ok', percent: 40, resetsAt: '2026-09-14T00:00:00Z' },
        monthly: { status: 'rate-limited', percent: 12, resets_at: '2026-10-01T00:00:00Z' },
      },
    });
    expect(windows.map((window) => window.id)).toEqual(['rolling', 'weekly', 'monthly']);
    expect(windows[0]?.usedPercent).toBe(16);
    expect(windows[0]?.periodHours).toBe(5);
    expect(windows[1]?.periodHours).toBe(168);
    expect(windows[2]?.usedPercent).toBe(100);
    expect(windows[2]?.periodHours).toBeNull();
    expect(windows[0]?.resetAtMs).toBe(Date.parse('2026-09-08T20:00:00Z'));
  });

  test('skips malformed windows instead of failing the card', () => {
    const windows = buildOpencodeGoWindows({
      usage: {
        rolling: { status: 'ok', percent: 10, resets_at: '2026-09-08T20:00:00Z' },
        weekly: undefined,
      },
    });
    expect(windows).toHaveLength(1);
    expect(windows[0]?.id).toBe('rolling');
  });
});

describe('classifyQuotaFiles', () => {
  test('includes opencode-go files and zero-fills the tab', () => {
    const entries = classifyQuotaFiles([
      file('opencode-go-key-abc.json', { id: 'opencode-go-key-abc' }),
      { name: 'claude.json', type: 'claude', provider: 'claude' } as AuthFileItem,
    ]);
    expect(entries.map((entry) => entry.type)).toEqual(['claude', 'opencode-go']);
    expect(buildTabCounts(entries)).toMatchObject({
      all: 2,
      claude: 1,
      'opencode-go': 1,
      kimi: 0,
    });
  });
});

describe('opencode-go schedule and timeline', () => {
  const quota: OpencodeGoQuotaState = {
    status: 'success',
    windows: [
      {
        id: 'rolling',
        labelKey: 'opencode_go_quota.window_rolling',
        usedPercent: 20,
        resetAtMs: Date.parse('2026-09-08T20:00:00Z'),
        periodHours: 5,
      },
      {
        id: 'weekly',
        labelKey: 'opencode_go_quota.window_weekly',
        usedPercent: 40,
        resetAtMs: Date.parse('2026-09-14T00:00:00Z'),
        periodHours: 168,
      },
    ],
  };

  test('collects recovery instants from windows', () => {
    expect(collectQuotaRowInstants('opencode-go', quota).map((row) => row.rowId)).toEqual([
      'rolling',
      'weekly',
    ]);
  });

  test('timeline uses the 5-hour window in session view and weekly in fortnight view', () => {
    const session = buildTimelineLane({
      name: 'go.json',
      displayName: 'go.json',
      provider: 'opencode-go',
      quota,
      maxPeriodHours: 5,
    });
    expect(session.periodHours).toBe(5);
    expect(session.remaining).toBe(80);

    const weekly = buildTimelineLane({
      name: 'go.json',
      displayName: 'go.json',
      provider: 'opencode-go',
      quota,
      maxPeriodHours: 24 * 14,
    });
    expect(weekly.periodHours).toBe(168);
    expect(weekly.remaining).toBe(60);
  });
});
