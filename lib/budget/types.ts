export type TransactionKind = "income" | "expense";
export type ExpenseClass = "fixed" | "variable" | "sporadic";

export type Transaction = {
  id: string;
  kind: TransactionKind;
  amountCents: number;
  date: string;
  category: string;
  description: string;
  expenseClass?: ExpenseClass;
};

export type MonthlyBudget = {
  id: string;
  month: string;
  category: string;
  amountCents: number;
};

export type BudgetState = {
  transactions: Transaction[];
  budgets: MonthlyBudget[];
};

export type CategoryTotal = {
  category: string;
  amountCents: number;
  color: string;
};

export type MonthSummary = {
  incomeCents: number;
  expenseCents: number;
  remainingCents: number;
  budgetCents: number;
};

export const EMPTY_BUDGET_STATE: BudgetState = {
  transactions: [],
  budgets: [],
};

export function createId(prefix: string): string {
  const randomPart =
    typeof globalThis.crypto !== "undefined" && "randomUUID" in globalThis.crypto
      ? globalThis.crypto.randomUUID()
      : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  return `${prefix}-${randomPart}`;
}
