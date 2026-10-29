import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type PropsWithChildren } from "react";
import { monthKeyFromDate } from "./calculations";
import { normalizeCategory } from "./categories";
import { clearBudgetState, loadBudgetState, saveBudgetState } from "./storage";
import { EMPTY_BUDGET_STATE, createId, type BudgetState, type MonthlyBudget, type Transaction } from "./types";

const STORAGE_ERROR = "Não foi possível salvar neste dispositivo. Confira o espaço disponível e as permissões do navegador.";

type ImportedData = Pick<BudgetState, "transactions" | "budgets">;
type ImportSummary = { addedTransactions: number; addedBudgets: number; duplicates: number };
type BudgetContextValue = {
  state: BudgetState;
  selectedMonth: string;
  setSelectedMonth: (month: string) => void;
  hydrated: boolean;
  storageIssue: string | null;
  addTransaction: (transaction: Omit<Transaction, "id">) => void;
  updateTransaction: (transaction: Transaction) => void;
  deleteTransaction: (id: string) => void;
  saveBudget: (month: string, category: string, amountCents: number) => void;
  deleteBudget: (id: string) => void;
  importData: (data: ImportedData) => ImportSummary;
  clearAllData: () => Promise<void>;
};

const BudgetContext = createContext<BudgetContextValue | null>(null);

function localCurrentMonth(): string {
  const now = new Date();
  return monthKeyFromDate(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`);
}

function transactionSignature(item: Transaction): string {
  return [item.kind, item.date, item.amountCents, normalizeCategory(item.category), item.description.trim().toLocaleLowerCase(), item.expenseClass ?? ""].join("|");
}

export function BudgetProvider({ children }: PropsWithChildren) {
  const [state, setState] = useState<BudgetState>(EMPTY_BUDGET_STATE);
  const [selectedMonth, setSelectedMonth] = useState(localCurrentMonth);
  const [hydrated, setHydrated] = useState(false);
  const [storageIssue, setStorageIssue] = useState<string | null>(null);
  const stateRef = useRef(state);

  useEffect(() => {
    let active = true;
    void loadBudgetState().then((loaded) => {
      if (!active) return;
      stateRef.current = loaded;
      setState(loaded);
      setHydrated(true);
    });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    stateRef.current = state;
    if (!hydrated) return;
    void saveBudgetState(state).then(() => setStorageIssue(null)).catch(() => setStorageIssue(STORAGE_ERROR));
  }, [state, hydrated]);

  const addTransaction = useCallback((transaction: Omit<Transaction, "id">) => {
    setState((current) => ({ ...current, transactions: [{ ...transaction, id: createId("tx") }, ...current.transactions] }));
  }, []);

  const updateTransaction = useCallback((transaction: Transaction) => {
    setState((current) => ({ ...current, transactions: current.transactions.map((item) => item.id === transaction.id ? transaction : item) }));
  }, []);

  const deleteTransaction = useCallback((id: string) => {
    setState((current) => ({ ...current, transactions: current.transactions.filter((item) => item.id !== id) }));
  }, []);

  const saveBudget = useCallback((month: string, category: string, amountCents: number) => {
    setState((current) => {
      const existing = current.budgets.find((item) => item.month === month && normalizeCategory(item.category) === normalizeCategory(category));
      const budgets: MonthlyBudget[] = existing
        ? current.budgets.map((item) => item.id === existing.id ? { ...item, category: category.trim(), amountCents: Math.round(amountCents) } : item)
        : [...current.budgets, { id: createId("budget"), month, category: category.trim(), amountCents: Math.round(amountCents) }];
      return { ...current, budgets };
    });
  }, []);

  const deleteBudget = useCallback((id: string) => {
    setState((current) => ({ ...current, budgets: current.budgets.filter((item) => item.id !== id) }));
  }, []);

  const importData = useCallback((data: ImportedData): ImportSummary => {
    const current = stateRef.current;
    const knownTransactions = new Set(current.transactions.map(transactionSignature));
    const knownBudgets = new Set(current.budgets.map((item) => `${item.month}|${normalizeCategory(item.category)}`));
    const transactions: Transaction[] = [];
    const budgets: MonthlyBudget[] = [];
    let duplicates = 0;
    for (const item of data.transactions) {
      const signature = transactionSignature(item);
      if (knownTransactions.has(signature)) { duplicates += 1; continue; }
      knownTransactions.add(signature);
      transactions.push({ ...item, id: createId("tx") });
    }
    for (const item of data.budgets) {
      const signature = `${item.month}|${normalizeCategory(item.category)}`;
      if (knownBudgets.has(signature)) { duplicates += 1; continue; }
      knownBudgets.add(signature);
      budgets.push({ ...item, id: createId("budget") });
    }
    setState((previous) => ({
      transactions: [...transactions, ...previous.transactions],
      budgets: [...budgets, ...previous.budgets],
    }));
    return { addedTransactions: transactions.length, addedBudgets: budgets.length, duplicates };
  }, []);

  const clearAllData = useCallback(async () => {
    await clearBudgetState();
    stateRef.current = EMPTY_BUDGET_STATE;
    setState(EMPTY_BUDGET_STATE);
    setStorageIssue(null);
  }, []);

  const value = useMemo<BudgetContextValue>(() => ({
    state,
    selectedMonth,
    setSelectedMonth,
    hydrated,
    storageIssue,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    saveBudget,
    deleteBudget,
    importData,
    clearAllData,
  }), [state, selectedMonth, hydrated, storageIssue, addTransaction, updateTransaction, deleteTransaction, saveBudget, deleteBudget, importData, clearAllData]);

  return <BudgetContext.Provider value={value}>{children}</BudgetContext.Provider>;
}

export function useBudget(): BudgetContextValue {
  const value = useContext(BudgetContext);
  if (!value) throw new Error("useBudget precisa estar dentro de BudgetProvider.");
  return value;
}
