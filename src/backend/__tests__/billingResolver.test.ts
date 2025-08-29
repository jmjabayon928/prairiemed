import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ApolloServer, HeaderMap } from '@apollo/server';
import gql from 'graphql-tag';
import { normalizeBillingSummary } from '../../lib/billing';

/* ----------------------------- Minimal GQL types ----------------------------- */
type TotalsGql = {
  draftCount: number;
  draftAmount: number;
  paidCount: number;
  paidAmount: number;
  currency: string;
};
type BillingSummaryGql = { totals: TotalsGql };
type PatientGql = { id: string; billingSummary: BillingSummaryGql };
type QueryData = { patient: PatientGql | null };

/* --------------------------------- Schema ---------------------------------- */
const typeDefs = gql`
  type Totals {
    draftCount: Int!
    draftAmount: Float!
    paidCount: Int!
    paidAmount: Float!
    currency: String!
  }
  type BillingSummary {
    totals: Totals!
  }
  type Patient {
    id: ID!
    billingSummary: BillingSummary!
  }
  type Query {
    patient(id: ID!): Patient
  }
`;

/* ------------------------------- Resolvers --------------------------------- */
const resolvers = {
  Query: {
    patient: (_: unknown, args: { id: string }) => ({ id: args.id }),
  },
  Patient: {
    billingSummary: async (parent: { id: string }) => {
      const base = process.env.BILLING_BASE_URL ?? 'http://localhost:8081';
      const url = `${base}/api/billing/patients/${encodeURIComponent(parent.id)}/summary`;

      const res = await fetch(url, { headers: { accept: 'application/json' } });
      if (!res.ok) {
        throw new Error('Billing REST not OK');
      }
      const json = (await res.json()) as unknown;
      return normalizeBillingSummary(json);
    },
  },
};

/* --------------------------------- Mocks ----------------------------------- */
type MinimalFetchResponse = { ok: boolean; json: () => Promise<unknown> };
const makeFetchMock = (payload: unknown, ok = true) =>
  vi.fn((): Promise<MinimalFetchResponse> =>
    Promise.resolve({
      ok,
      json: async () => payload,
    }),
  );

/* --------------------------------- Tests ----------------------------------- */
describe('patient(id).billingSummary resolver', () => {
  const server = new ApolloServer({ typeDefs, resolvers });

  beforeEach(() => {
    vi.unstubAllGlobals();
    process.env.BILLING_BASE_URL = 'http://billing.local';
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns normalized totals and calls Spring REST once', async () => {
    const payload = {
      totals: {
        draftCount: 1,
        draftAmount: 50,
        paidCount: 2,
        paidAmount: 200,
        currency: 'CAD',
      },
    };

    const fetchSpy = makeFetchMock(payload);
    // Override global.fetch for this test
    global.fetch = fetchSpy as unknown as typeof fetch;

    const query = gql`
      query Billing($id: ID!) {
        patient(id: $id) {
          billingSummary {
            totals {
              draftCount
              draftAmount
              paidCount
              paidAmount
              currency
            }
          }
        }
      }
    `;

    const result = await server.executeOperation<QueryData>({
      query,
      variables: { id: '767b8d60-7e6b-410f-9de5-cb42292d3c61' },
      http: {
        method: 'POST',
        headers: new HeaderMap([['authorization', 'Bearer dev-admin']]),
        search: '',
        body: null,
      },
    });

    expect(result.body.kind).toBe('single');
    if (result.body.kind === 'single') {
      expect(result.body.singleResult.errors).toBeUndefined();

      const totals = result.body.singleResult.data?.patient?.billingSummary.totals ?? null;
      expect(totals).toBeTruthy();
      expect(totals).toMatchObject({
        draftCount: 1,
        draftAmount: 50,
        paidCount: 2,
        paidAmount: 200,
        currency: 'CAD',
      });
    }

    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });
});
