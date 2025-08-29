// src/lib/billing.test.ts
import { describe, it, expect } from 'vitest';
import { normalizeBillingSummary } from './billing';

describe('normalizeBillingSummary', () => {
  it('normalizes a valid REST payload', () => {
    const raw: unknown = {
      patientId: 'p1',
      invoices: [
        { id: 'a', status: 'DRAFT', total: 50, currency: 'CAD', createdAt: '2025-01-01' },
        { id: 'b', status: 'PAID', total: 75.5, currency: 'CAD', createdAt: '2025-01-02' },
      ],
      totals: {
        draftCount: 1,
        draftAmount: 50,
        paidCount: 1,
        paidAmount: 75.5,
        currency: 'CAD',
      },
    };

    const out = normalizeBillingSummary(raw);
    expect(out.patientId).toBe('p1');
    expect(out.totals).toBeTruthy();
    expect(out.totals).toMatchObject({
      draftCount: 1,
      draftAmount: 50,
      paidCount: 1,
      paidAmount: 75.5,
      currency: 'CAD',
    });
  });

  it('applies safe defaults when fields are missing', () => {
    // Missing patientId/totals; derive from invoices and default strings
    const raw: unknown = {
      invoices: [
        { status: 'DRAFT', total: 10 },
        { status: 'PAID', total: 0 },
        { status: 'PAID' }, // total undefined -> treated as 0
      ],
    };

    const out = normalizeBillingSummary(raw);

    // patientId defaults to empty string
    expect(typeof out.patientId).toBe('string');

    // totals exist and are numbers
    expect(typeof out.totals?.draftCount).toBe('number');
    expect(typeof out.totals?.draftAmount).toBe('number');
    expect(typeof out.totals?.paidCount).toBe('number');
    expect(typeof out.totals?.paidAmount).toBe('number');

    // derived expectations from invoices above
    expect(out.totals?.draftCount).toBe(1);
    expect(out.totals?.paidCount).toBe(2);
  });
});
