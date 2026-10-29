import type { ExpenseClass } from "./types";

export const INCOME_CATEGORIES = ["Salário", "Freelance", "Investimentos", "Reembolso", "Outros"];
export const EXPENSE_CATEGORIES = [
  "Moradia",
  "Contas",
  "Alimentação",
  "Restaurantes",
  "Transporte",
  "Saúde",
  "Educação",
  "Lazer",
  "Compras",
  "Outros",
];

export const EXPENSE_CLASS_LABELS: Record<ExpenseClass, string> = {
  fixed: "Fixa mensal",
  variable: "Variável mensal",
  sporadic: "Esporádica",
};

export const CATEGORY_COLORS = [
  "#176B52",
  "#4A9076",
  "#84AF9C",
  "#D28B63",
  "#BF5A43",
  "#68879A",
  "#B8A46D",
  "#9277A7",
  "#5674A1",
  "#9A795D",
];

export const PALETTE = {
  background: "#F7F5EF",
  surface: "#FFFFFF",
  ink: "#1E2A25",
  muted: "#737D77",
  line: "#E8E6DE",
  green: "#176B52",
  greenPale: "#E6F1EA",
  terracotta: "#BF5A43",
  terracottaPale: "#F8EAE5",
  gold: "#B28B42",
  white: "#FFFFFF",
};

export function categoryColor(index: number): string {
  return CATEGORY_COLORS[((index % CATEGORY_COLORS.length) + CATEGORY_COLORS.length) % CATEGORY_COLORS.length];
}

export function normalizeCategory(category: string): string {
  return category.normalize("NFKC").trim().toLocaleLowerCase("pt-BR");
}
