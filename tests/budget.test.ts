import { describe, expect, it } from "vitest";
import { getBudgetProgress, getCategoryBreakdown, getInsights, getSummary } from "../lib/budget/calculations";
import { exportCsv, parseCsv } from "../lib/budget/csv";
import { isISODate, isISOMonth } from "../lib/budget/input";
import type { BudgetState } from "../lib/budget/types";

describe("cálculos do orçamento pessoal", () => {
  const state: BudgetState = {
    transactions: [
      { id: "income-1", kind: "income", amountCents: 100_000, date: "2026-10-01", category: "Salário", description: "Pagamento" },
      { id: "expense-1", kind: "expense", amountCents: 13_200, date: "2026-10-12", category: "Restaurantes", description: "Jantar", expenseClass: "variable" },
      { id: "expense-2", kind: "expense", amountCents: 9_000, date: "2026-09-28", category: "Moradia", description: "Aluguel", expenseClass: "fixed" },
    ],
    budgets: [{ id: "budget-1", month: "2026-10", category: "Restaurantes", amountCents: 10_000 }],
  };

  it("calcula receitas, despesas, saldo e orçamento apenas do mês selecionado", () => {
    expect(getSummary(state, "2026-10")).toEqual({
      incomeCents: 100_000,
      expenseCents: 13_200,
      remainingCents: 86_800,
      budgetCents: 10_000,
    });
  });

  it("sinaliza a ultrapassagem exata de uma categoria", () => {
    const [progress] = getBudgetProgress(state, "2026-10");
    expect(progress.overPercent).toBe(32);
    expect(getInsights(state, "2026-10").join(" ")).toContain("Restaurantes está 32% acima do orçamento");
  });

  it("agrupa os gastos por categoria do mês", () => {
    expect(getCategoryBreakdown(state, "2026-10").map(({ category, amountCents }) => ({ category, amountCents }))).toEqual([
      { category: "Restaurantes", amountCents: 13_200 },
    ]);
  });

  it("compara e agrupa categorias ignorando espaços e maiúsculas/minúsculas", () => {
    const variants: BudgetState = {
      transactions: [
        { id: "tx-lower", kind: "expense", amountCents: 13_200, date: "2026-10-12", category: " restaurantes ", description: "Jantar", expenseClass: "variable" },
        { id: "tx-upper", kind: "expense", amountCents: 3_000, date: "2026-10-14", category: "RESTAURANTES", description: "Almoço", expenseClass: "variable" },
      ],
      budgets: state.budgets,
    };
    expect(getBudgetProgress(variants, "2026-10")[0].spentCents).toBe(16_200);
    expect(getInsights(variants, "2026-10").join(" ")).toContain("Restaurantes está 62% acima do orçamento");
    expect(getCategoryBreakdown(variants, "2026-10")).toHaveLength(1);
    expect(getCategoryBreakdown(variants, "2026-10")[0].amountCents).toBe(16_200);
  });
});

describe("CSV financeiro local", () => {
  it("exporta e importa lançamentos e orçamentos, preservando descrições com delimitadores", () => {
    const source: BudgetState = {
      transactions: [
        { id: "tx-1", kind: "expense", amountCents: 12_345, date: "2026-10-02", category: "Restaurantes", description: 'Café; "da casa"', expenseClass: "fixed" },
        { id: "tx-2", kind: "income", amountCents: 450_000, date: "2026-10-05", category: "Freelance", description: "Projeto" },
      ],
      budgets: [{ id: "budget-1", month: "2026-10", category: "Restaurantes", amountCents: 40_000 }],
    };
    const imported = parseCsv(exportCsv(source));
    expect(imported.errors).toEqual([]);
    expect(imported.validCount).toBe(3);
    expect(imported.transactions).toHaveLength(2);
    expect(imported.transactions[0].description).toBe('Café; "da casa"');
    expect(imported.transactions[0].expenseClass).toBe("fixed");
    expect(imported.budgets).toEqual([expect.objectContaining({ month: "2026-10", category: "Restaurantes", amountCents: 40_000 })]);
  });

  it("valida movimentos simples e classifica despesas sem classe como variáveis", () => {
    const imported = parseCsv("data;tipo;valor;categoria;descricao\n2026-10-12;despesa;123,45;Restaurantes;Almoço");
    expect(imported.errors).toEqual([]);
    expect(imported.validCount).toBe(1);
    expect(imported.transactions[0]).toMatchObject({
      kind: "expense",
      amountCents: 12_345,
      category: "Restaurantes",
      expenseClass: "variable",
    });
  });

  it("não aceita linhas inválidas silenciosamente", () => {
    const imported = parseCsv("data;tipo;valor;categoria\n2026-02-30;despesa;25,00;Moradia");
    expect(imported.validCount).toBe(0);
    expect(imported.errors.some((error) => error.includes("data inválida"))).toBe(true);
  });

  it("reconhece somente datas e meses ISO existentes no calendário", () => {
    expect(isISODate("2026-02-28")).toBe(true);
    expect(isISODate("2026-02-31")).toBe(false);
    expect(isISOMonth("2026-12")).toBe(true);
    expect(isISOMonth("2026-13")).toBe(false);
  });
});
