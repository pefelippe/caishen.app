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
  /** Whole cents; for a CREDIT account, what the provider reports as its balance. */
  balanceCents: number | null;
  externalId: string;
  kind: 'BANK' | 'CREDIT';
  name: string;
  number: string | null;
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
  /** The settled lines of an account dated `since` (`YYYY-MM-DD`) or later. */
  transactions(accountId: string, since: string): Promise<ProviderTransaction[]>;
}
