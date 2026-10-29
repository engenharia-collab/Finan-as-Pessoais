import { categoryColor, normalizeCategory } from "./categories";
import type {
  BudgetState,
  CategoryTotal,
  MonthSummary,
  MonthlyBudget,
  Transaction,
} from "./types";

type MoneyFormatOptions = { compact?: boolean };

const MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;
const DATE_PATTERN = /^(\d{4})-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;

function assertMonth(month: string): void {
  if (typeof month !== "string" || !MONTH_PATTERN.test(month)) {
    throw new RangeError(`Mês inválido: ${String(month)}. Use YYYY-MM.`);
  }
}

function assertISODate(date: string): [number, number, number] {
  if (typeof date !== "string") {
    throw new RangeError(`Data inválida: ${String(date)}. Use YYYY-MM-DD.`);
  }
  const match = DATE_PATTERN.exec(date);
  if (!match) throw new RangeError(`Data inválida: ${date}. Use YYYY-MM-DD.`);
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  if (day > daysInMonth) throw new RangeError(`Data inválida: ${date}.`);
  return [year, month, day];
}

function cents(value: number): number {
  return Number.isFinite(value) ? Math.round(value) : 0;
}

function sumCents(values: number[]): number {
  return values.reduce((sum, value) => sum + cents(value), 0);
}

function transactionsFor(state: BudgetState, month: string): Transaction[] {
  return (Array.isArray(state?.transactions) ? state.transactions : []).filter(
    (transaction) =>
      transaction &&
      typeof transaction.date === "string" &&
      DATE_PATTERN.test(transaction.date) &&
      transaction.date.slice(0, 7) === month,
  );
}

function budgetsFor(state: BudgetState, month: string): MonthlyBudget[] {
  return (Array.isArray(state?.budgets) ? state.budgets : []).filter(
    (budget) => budget && budget.month === month,
  );
}

function formatPercent(value: number): string {
  return `${Math.round(value)}%`;
}

export function monthKeyFromDate(date: string): string {
  const [year, month] = assertISODate(date);
  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}`;
}

export function shiftMonth(month: string, offset: number): string {
  assertMonth(month);
  if (!Number.isInteger(offset)) throw new RangeError("O deslocamento de mês deve ser inteiro.");
  const [year, monthNumber] = month.split("-").map(Number);
  const index = year * 12 + (monthNumber - 1) + offset;
  const shiftedYear = Math.floor(index / 12);
  const shiftedMonth = ((index % 12) + 12) % 12 + 1;
  if (shiftedYear < 0 || shiftedYear > 9999) throw new RangeError("Mês fora do intervalo suportado.");
  return `${String(shiftedYear).padStart(4, "0")}-${String(shiftedMonth).padStart(2, "0")}`;
}

export function formatMonthLabel(month: string): string {
  assertMonth(month);
  const date = new Date(`${month}-01T12:00:00Z`);
  return new Intl.DateTimeFormat("pt-BR", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

export function formatMoney(amountCents: number, options: MoneyFormatOptions = {}): string {
  const amount = cents(amountCents) / 100;
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    notation: options.compact ? "compact" : "standard",
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  }).format(amount);
}

export function formatDate(date: string): string {
  const [year, month, day] = assertISODate(date);
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, day, 12)));
}

export function getSummary(state: BudgetState, month: string): MonthSummary {
  assertMonth(month);
  const transactions = transactionsFor(state, month);
  const incomeCents = sumCents(
    transactions.filter((transaction) => transaction.kind === "income").map((transaction) => transaction.amountCents),
  );
  const expenseCents = sumCents(
    transactions.filter((transaction) => transaction.kind === "expense").map((transaction) => transaction.amountCents),
  );
  const budgetCents = sumCents(budgetsFor(state, month).map((budget) => budget.amountCents));
  return { incomeCents, expenseCents, remainingCents: incomeCents - expenseCents, budgetCents };
}

export function getMonthTransactions(state: BudgetState, month: string): Transaction[] {
  assertMonth(month);
  return transactionsFor(state, month).sort((a, b) => b.date.localeCompare(a.date));
}

export function getMonthBudgets(state: BudgetState, month: string): MonthlyBudget[] {
  assertMonth(month);
  return budgetsFor(state, month);
}

export function getCategoryBreakdown(state: BudgetState, month: string): CategoryTotal[] {
  assertMonth(month);
  const totals = new Map<string, { category: string; amountCents: number }>();
  for (const transaction of transactionsFor(state, month)) {
    if (transaction.kind !== "expense") continue;
    const key = normalizeCategory(transaction.category);
    const current = totals.get(key);
    if (current) current.amountCents += cents(transaction.amountCents);
    else totals.set(key, { category: transaction.category.trim(), amountCents: cents(transaction.amountCents) });
  }
  return [...totals.values()]
    .map(({ category, amountCents }) => ({ category, amountCents, color: "" }))
    .sort((a, b) => b.amountCents - a.amountCents || a.category.localeCompare(b.category, "pt-BR"))
    .map((total, index) => ({ ...total, color: categoryColor(index) }));
}

export function getTrend(
  state: BudgetState,
  endMonth: string,
  length = 6,
): { month: string; label: string; incomeCents: number; expenseCents: number; remainingCents: number }[] {
  assertMonth(endMonth);
  if (!Number.isInteger(length) || length < 0) throw new RangeError("O tamanho da tendência deve ser um inteiro não negativo.");
  const firstMonth = shiftMonth(endMonth, -(length - 1));
  return Array.from({ length }, (_, index) => {
    const month = shiftMonth(firstMonth, index);
    const summary = getSummary(state, month);
    return {
      month,
      label: formatMonthLabel(month),
      incomeCents: summary.incomeCents,
      expenseCents: summary.expenseCents,
      remainingCents: summary.remainingCents,
    };
  });
}

export function getBudgetProgress(
  state: BudgetState,
  month: string,
): { budget: MonthlyBudget; spentCents: number; remainingCents: number; percentUsed: number; overPercent: number }[] {
  assertMonth(month);
  const spentByCategory = new Map<string, number>();
  for (const transaction of transactionsFor(state, month)) {
    if (transaction.kind === "expense") {
      const key = normalizeCategory(transaction.category);
      spentByCategory.set(key, (spentByCategory.get(key) ?? 0) + cents(transaction.amountCents));
    }
  }
  return budgetsFor(state, month).map((budget) => {
    const budgetCents = cents(budget.amountCents);
    const spentCents = spentByCategory.get(normalizeCategory(budget.category)) ?? 0;
    const hasPositiveBudget = budgetCents > 0;
    const percentUsed = hasPositiveBudget ? (spentCents / budgetCents) * 100 : 0;
    const overPercent = hasPositiveBudget && spentCents > budgetCents
      ? ((spentCents - budgetCents) / budgetCents) * 100
      : 0;
    return {
      budget,
      spentCents,
      remainingCents: budgetCents - spentCents,
      percentUsed,
      overPercent,
    };
  });
}

export function getInsights(state: BudgetState, month: string): string[] {
  assertMonth(month);
  const insights: string[] = [];
  const label = formatMonthLabel(month);

  for (const progress of getBudgetProgress(state, month)) {
    const category = progress.budget.category;
    if (progress.overPercent > 0) {
      insights.push(`${category} está ${formatPercent(progress.overPercent)} acima do orçamento em ${label}.`);
    } else if (progress.percentUsed >= 80 && progress.percentUsed < 100) {
      insights.push(`${category} já utilizou ${formatPercent(progress.percentUsed)} do orçamento em ${label}.`);
    }
  }

  const trend = getTrend(state, month, 2);
  if (trend.length === 2) {
    const previous = trend[0];
    const current = trend[1];
    if (previous.expenseCents > 0 && current.expenseCents !== previous.expenseCents) {
      const changePercent = Math.abs((current.expenseCents - previous.expenseCents) / previous.expenseCents) * 100;
      const direction = current.expenseCents > previous.expenseCents ? "aumentaram" : "diminuíram";
      insights.push(`Os gastos ${direction} ${formatPercent(changePercent)} em relação a ${previous.label}.`);
    }
  }

  return insights;
}
