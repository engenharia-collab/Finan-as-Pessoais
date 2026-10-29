import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import { EMPTY_BUDGET_STATE, type BudgetState, type ExpenseClass, type MonthlyBudget, type Transaction } from "./types";
import { isISODate, isISOMonth } from "./input";

const STORAGE_KEY = "meu-orcamento.local.v1";
const VALID_EXPENSE_CLASSES: ExpenseClass[] = ["fixed", "variable", "sporadic"];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeState(value: unknown): BudgetState {
  if (!isRecord(value)) return EMPTY_BUDGET_STATE;
  const rawTransactions = Array.isArray(value.transactions) ? value.transactions : [];
  const rawBudgets = Array.isArray(value.budgets) ? value.budgets : [];
  const transactions: Transaction[] = rawTransactions.flatMap((raw) => {
    if (!isRecord(raw)) return [];
    const { id, kind, amountCents, date, category, description, expenseClass } = raw;
    if (
      typeof id !== "string" ||
      (kind !== "income" && kind !== "expense") ||
      typeof amountCents !== "number" || !Number.isFinite(amountCents) || amountCents <= 0 ||
      typeof date !== "string" || !isISODate(date) ||
      typeof category !== "string" || !category.trim()
    ) return [];
    return [{
      id,
      kind,
      amountCents: Math.round(amountCents),
      date,
      category: category.trim(),
      description: typeof description === "string" ? description : "",
      ...(kind === "expense"
        ? { expenseClass: VALID_EXPENSE_CLASSES.includes(expenseClass as ExpenseClass) ? expenseClass as ExpenseClass : "variable" as const }
        : {}),
    }];
  });
  const budgets: MonthlyBudget[] = rawBudgets.flatMap((raw) => {
    if (!isRecord(raw)) return [];
    const { id, month, category, amountCents } = raw;
    if (
      typeof id !== "string" || typeof month !== "string" || !isISOMonth(month) ||
      typeof category !== "string" || !category.trim() ||
      typeof amountCents !== "number" || !Number.isFinite(amountCents) || amountCents <= 0
    ) return [];
    return [{ id, month, category: category.trim(), amountCents: Math.round(amountCents) }];
  });
  return { transactions, budgets };
}

export async function loadBudgetState(): Promise<BudgetState> {
  try {
    const raw = Platform.OS === "web"
      ? globalThis.localStorage?.getItem(STORAGE_KEY) ?? null
      : await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY_BUDGET_STATE;
    const parsed: unknown = JSON.parse(raw);
    const payload = isRecord(parsed) && parsed.version === 1 ? parsed.state : parsed;
    return normalizeState(payload);
  } catch {
    return EMPTY_BUDGET_STATE;
  }
}

export async function saveBudgetState(state: BudgetState): Promise<void> {
  const value = JSON.stringify({ version: 1, state });
  if (Platform.OS === "web") {
    if (!globalThis.localStorage) throw new Error("O armazenamento local do navegador está indisponível.");
    globalThis.localStorage.setItem(STORAGE_KEY, value);
    return;
  }
  await AsyncStorage.setItem(STORAGE_KEY, value);
}

export async function clearBudgetState(): Promise<void> {
  if (Platform.OS === "web") {
    globalThis.localStorage?.removeItem(STORAGE_KEY);
    return;
  }
  await AsyncStorage.removeItem(STORAGE_KEY);
}
