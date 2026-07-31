/** Shared finance domain types. Consumed by web, services, and the API. */

export type Currency = "BRL" | "USD" | "EUR";

export type ExpenseCategory =
  | "Alimentação"
  | "Moradia"
  | "Transporte"
  | "Saúde"
  | "Educação"
  | "Lazer"
  | "Vestuário"
  | "Outros";

export interface Expense {
  id: string;
  userId: string;
  amount: number;
  currency: Currency;
  category: ExpenseCategory;
  description?: string;
  date: string; // ISO 8601
  createdAt: string;
}

export interface Income {
  id: string;
  userId: string;
  amount: number;
  currency: Currency;
  source: string;
  date: string;
  createdAt: string;
}

export interface Bill {
  id: string;
  userId: string;
  name: string;
  amount: number;
  currency: Currency;
  dueDate: string;
  recurring: boolean;
  paid: boolean;
}

export interface Goal {
  id: string;
  userId: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  currency: Currency;
  deadline?: string;
}
