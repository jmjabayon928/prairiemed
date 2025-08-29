import { gql } from 'graphql-tag';

export const typeDefs = gql/* GraphQL */ `
  scalar DateTime

  type Patient {
    id: ID!
    mrn: String
    firstName: String!
    lastName: String!
    dateOfBirth: String
    sexAtBirth: String
    phone: String
    email: String
    address: String
    city: String
    provinceState: String
    postalCode: String
    status: String
    createdAt: String
    updatedAt: String
    appointments(limit: Int = 20, offset: Int = 0): [Appointment!]!
    billingSummary: BillingSummary!
  }

  type Appointment {
    id: ID!
    patientId: ID!
    date: String!
    reason: String
    status: String
  }

  type BillingInvoice {
    id: ID!
    status: String!
    totalAmount: Float!
    currency: String!
    createdAt: String!
  }

  type BillingSummary {
    patientId: ID!
    outstandingBalance: Float!
    lastInvoiceDate: String
    invoices: [BillingInvoice!]!
  }

  type Query {
    patients(q: String = "", limit: Int = 20, offset: Int = 0): [Patient!]!
    patient(id: ID!): Patient
    appointments(patientId: ID!, limit: Int = 20, offset: Int = 0): [Appointment!]!
  }

  type Mutation {
    createAppointment(patientId: ID!, date: String!, reason: String, status: String): Appointment!
    cancelAppointment(id: ID!): Boolean!
  }
`;
