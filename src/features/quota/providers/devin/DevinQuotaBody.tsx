/**
 * Devin quota body: daily / weekly meters plus plan and extra-usage balance.
 */

import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { DevinQuotaState } from '@/types';
import { buildResetDisplay } from '@/utils/quota';
import { useNow } from '@/hooks/useNow';
import { QuotaMeter } from '../../components/QuotaMeter';
import { QuotaResetLabel } from '../../components/QuotaResetLabel';
import { collectQuotaRowInstants, pickUrgentRowId } from '../../resetSchedule';
import type { QuotaBodyProps } from '../../types';

export function DevinQuotaBody({ quota, classes }: QuotaBodyProps<DevinQuotaState>) {
  const { t, i18n } = useTranslation();
  const now = useNow();
  const soonestRowId = useMemo(
    () => pickUrgentRowId(collectQuotaRowInstants('devin', quota), now),
    [quota, now]
  );
  const windows = quota.windows ?? [];

  if (windows.length === 0) {
    return <div className={classes.quotaMessage}>{t('devin_quota.empty_data')}</div>;
  }

  return (
    <>
      {windows.map((window, index) => {
        const remaining =
          typeof window.usedPercent === 'number'
            ? Math.max(0, Math.min(100, Math.round(100 - window.usedPercent)))
            : null;
        const percentLabel = remaining === null ? '--' : `${remaining}%`;
        const rowLabel = window.labelKey ? t(window.labelKey) : window.id;
        const resetDisplay = buildResetDisplay(null, window.resetAtMs, now, i18n.resolvedLanguage);
        const soon = window.id === soonestRowId;

        return (
          <div
            key={window.id}
            className={classes.quotaRow}
            title={soon ? t('quota_management.soonest_row_hint') : undefined}
          >
            <div className={classes.quotaRowHeader}>
              <span className={classes.quotaModel}>{rowLabel}</span>
              <div className={classes.quotaMeta}>
                <span className={classes.quotaPercent}>{percentLabel}</span>
                {resetDisplay && (
                  <QuotaResetLabel display={resetDisplay} classes={classes} soon={soon} />
                )}
              </div>
            </div>
            <QuotaMeter percent={remaining} classes={classes} index={index} />
          </div>
        );
      })}
      {(quota.plan || quota.extraUsageBalanceUsd !== null) && (
        <div className={classes.quotaMessage}>
          {quota.plan ? t('devin_quota.plan', { plan: quota.plan }) : null}
          {quota.plan && quota.extraUsageBalanceUsd !== null ? ' · ' : null}
          {quota.extraUsageBalanceUsd !== null
            ? t('devin_quota.extra_balance', { amount: quota.extraUsageBalanceUsd.toFixed(2) })
            : null}
        </div>
      )}
    </>
  );
}
