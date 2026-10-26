/**
 * What zapbots needs from whoever brings Open Finance data in (docs/adr/0020), in our own words.
 * The rest of the app speaks only this; changing provider is writing another adapter.
 */

/** A bank authorized once, as the provider keeps it. */
export interface ProviderItem {
  consentExpiresAt: Date | null;
  /** Why it stopped, while `status` is not ACTIVE. */
  error: string | null;
  institution: string;
  status: 'ACTIVE' | 'ERROR' | 'EXPIRED';
}

export interface ProviderAccount {
  /** Whole cents; for a CREDIT account, how much of its limit is in use. */
  balanceCents: number | null;
  /** A CREDIT account's limit and days, as far as the bank reports them; `null` for a BANK one. */
  credit: {
    closingDay: number | null;
    dueDay: number | null;
    limitCents: number | null;
  } | null;
  externalId: string;
  kind: 'BANK' | 'CREDIT';
  name: string;
  number: string | null;
}

/** A card's Fatura, closed by the bank. */
export interface ProviderBill {
  amountCents: number;
  /** `YYYY-MM-DD`, when the bank says. */
  closingDate: string | null;
  /** `YYYY-MM-DD`. */
  dueDate: string;
}

/** One line of an account: money out (`OUT`) or in, in positive whole cents. */
export interface ProviderTransaction {
  amountCents: number;
  date: string;
  description: string;
  direction: 'IN' | 'OUT';
  /** The provider's id for the line, unique and the same on every read. */
  externalId: string;
}

export interface OpenFinanceProvider {
  key: 'PLUGGY';
  /** Whether this server has the provider's credentials. */
  configured(): boolean;
  /** `null` when the provider has no such item. */
  item(id: string): Promise<ProviderItem | null>;
  accounts(itemId: string): Promise<ProviderAccount[]>;
  /** The Faturas of a CREDIT account. */
  bills(accountId: string): Promise<ProviderBill[]>;
  /** The settled lines of an account dated `since` (`YYYY-MM-DD`) or later. */
  transactions(accountId: string, since: string): Promise<ProviderTransaction[]>;
}
