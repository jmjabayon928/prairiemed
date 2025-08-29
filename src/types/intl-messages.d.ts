// src/types/intl-messages.d.ts
// Loosened recursive shape so next-intl can infer string keys instead of `never`.
declare global {
  type IntlMessages = { [key: string]: string | IntlMessages };
}
export {};
