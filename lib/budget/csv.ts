import { createId } from "./types";
import type {
  BudgetState,
  ExpenseClass,
  MonthlyBudget,
  Transaction,
  TransactionKind,
} from "./types";

type PreviewRow = {
  kind: "transaction" | "budget";
  transactionKind?: TransactionKind;
  date: string;
  label: string;
  category: string;
  amountCents: number;
  notes?: string;
};

type CsvRecord = { fields: string[]; line: number; error?: string };
type HeaderKey =
  | "record"
  | "date"
  | "kind"
  | "amount"
  | "category"
  | "description"
  | "expenseClass";

const HEADER_ALIASES: Record<string, HeaderKey> = {
  registro: "record",
  kind: "record",
  data: "date",
  date: "date",
  tipo: "kind",
  type: "kind",
  valor: "amount",
  amount: "amount",
  categoria: "category",
  category: "category",
  descricao: "description",
  description: "description",
  classedespesa: "expenseClass",
  expenseclass: "expenseClass",
};

function normalizeHeader(value: string): string {
  return value
    .replace(/^\uFEFF/, "")
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR")
    .replace(/[\s_\-]/g, "");
}

function detectDelimiter(text: string): "," | ";" {
  let inQuotes = false;
  let commas = 0;
  let semicolons = 0;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (character === '"') {
      if (inQuotes && text[index + 1] === '"') {
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (!inQuotes && (character === "\n" || character === "\r")) {
      if (commas || semicolons) break;
    } else if (!inQuotes && character === ",") {
      commas += 1;
    } else if (!inQuotes && character === ";") {
      semicolons += 1;
    }
  }

  return commas > semicolons ? "," : ";";
}

function readCsv(text: string, delimiter: "," | ";"): CsvRecord[] {
  const records: CsvRecord[] = [];
  let fields: string[] = [];
  let field = "";
  let inQuotes = false;
  let afterQuote = false;
  let line = 1;
  let recordLine = 1;
  let recordError: string | undefined;

  const finishField = () => {
    fields.push(field);
    field = "";
    afterQuote = false;
  };
  const finishRecord = () => {
    finishField();
    if (fields.some((value) => value.trim() !== "") || recordError) {
      records.push({ fields, line: recordLine, error: recordError });
    }
    fields = [];
    recordError = undefined;
    recordLine = line;
  };

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];

    if (inQuotes) {
      if (character === '"') {
        if (text[index + 1] === '"') {
          field += '"';
          index += 1;
        } else {
          inQuotes = false;
          afterQuote = true;
        }
      } else {
        field += character;
        if (character === "\n") line += 1;
        else if (character === "\r" && text[index + 1] !== "\n") line += 1;
      }
      continue;
    }

    if (afterQuote && character !== delimiter && character !== "\r" && character !== "\n" && character.trim() !== "") {
      recordError ??= "caractere inesperado após aspas de fechamento";
      field += character;
      afterQuote = false;
      continue;
    }

    if (character === delimiter) {
      finishField();
    } else if (character === "\r" || character === "\n") {
      if (character === "\r" && text[index + 1] === "\n") index += 1;
      line += 1;
      finishRecord();
      recordLine = line;
    } else if (character === '"' && field.length === 0) {
      inQuotes = true;
    } else {
      if (character === '"') recordError ??= "aspas em campo não delimitado";
      field += character;
    }
  }

  if (inQuotes) recordError ??= "campo entre aspas não foi fechado";
  if (field.length > 0 || fields.length > 0 || recordError) finishRecord();
  return records;
}

function parseAmount(value: string): number | undefined {
  let normalized = value.trim().replace(/\u00a0/g, " ").replace(/^R\$\s*/i, "").replace(/\s/g, "");
  if (!normalized || !/^[\d.,]+$/.test(normalized)) return undefined;

  const comma = normalized.lastIndexOf(",");
  const dot = normalized.lastIndexOf(".");
  let integerPart: string;
  let decimalPart: string;

  if (comma >= 0 && dot >= 0) {
    const decimalSeparator = comma > dot ? "," : ".";
    const groupingSeparator = decimalSeparator === "," ? "." : ",";
    const decimalIndex = normalized.lastIndexOf(decimalSeparator);
    integerPart = normalized.slice(0, decimalIndex);
    decimalPart = normalized.slice(decimalIndex + 1);
    const groupingPattern = new RegExp(`^\\d{1,3}(?:\\${groupingSeparator}\\d{3})+$`);
    if (integerPart.includes(groupingSeparator) && !groupingPattern.test(integerPart)) return undefined;
    if (!integerPart.replaceAll(groupingSeparator, "").match(/^\d+$/)) return undefined;
  } else if (comma >= 0) {
    if (normalized.indexOf(",") !== comma) return undefined;
    [integerPart, decimalPart] = normalized.split(",");
    if (!/^\d+$/.test(integerPart)) return undefined;
  } else if (dot >= 0) {
    const dots = normalized.match(/\./g)?.length ?? 0;
    if (dots > 1 || (dots === 1 && /^\d{1,3}(?:\.\d{3})+$/.test(normalized))) {
      if (!/^\d{1,3}(?:\.\d{3})+$/.test(normalized)) return undefined;
      integerPart = normalized.replaceAll(".", "");
      decimalPart = "";
    } else {
      [integerPart, decimalPart] = normalized.split(".");
      if (!/^\d+$/.test(integerPart)) return undefined;
    }
  } else {
    integerPart = normalized;
    decimalPart = "";
  }

  if (!/^\d+$/.test(integerPart) || (decimalPart !== "" && !/^\d{1,2}$/.test(decimalPart))) return undefined;
  const amount = Number(`${integerPart}${decimalPart ? `.${decimalPart}` : ""}`);
  if (!Number.isFinite(amount) || amount <= 0) return undefined;
  const cents = Math.round(amount * 100);
  return Number.isSafeInteger(cents) && cents > 0 ? cents : undefined;
}

function parseTransactionDate(value: string): string | undefined {
  const trimmed = value.trim();
  let year: number;
  let month: number;
  let day: number;
  let match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
  if (match) {
    year = Number(match[1]);
    month = Number(match[2]);
    day = Number(match[3]);
  } else {
    match = /^(\d{2})[/-](\d{2})[/-](\d{4})$/.exec(trimmed);
    if (!match) return undefined;
    day = Number(match[1]);
    month = Number(match[2]);
    year = Number(match[3]);
  }
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return undefined;
  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function parseBudgetMonth(value: string): string | undefined {
  const match = /^(\d{4})-(\d{2})$/.exec(value.trim());
  if (!match) return undefined;
  const year = Number(match[1]);
  const month = Number(match[2]);
  return month >= 1 && month <= 12 ? `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}` : undefined;
}

function parseKind(value: string): TransactionKind | undefined {
  const normalized = normalizeHeader(value);
  if (["receita", "income"].includes(normalized)) return "income";
  if (["despesa", "expense"].includes(normalized)) return "expense";
  return undefined;
}

function parseExpenseClass(value: string): ExpenseClass | undefined {
  const normalized = normalizeHeader(value);
  if (["fixed", "fixa", "fixomensal"].includes(normalized)) return "fixed";
  if (["variable", "variavel", "variavelmensal"].includes(normalized)) return "variable";
  if (["sporadic", "esporadica"].includes(normalized)) return "sporadic";
  return undefined;
}

function formatAmount(amountCents: number): string {
  return (amountCents / 100).toFixed(2).replace(".", ",");
}

function escapeCsv(value: string): string {
  return /[;"\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

export function parseCsv(text: string): {
  transactions: Transaction[];
  budgets: MonthlyBudget[];
  errors: string[];
  validCount: number;
  previewRows: PreviewRow[];
} {
  const records = readCsv(text.replace(/^\uFEFF/, ""), detectDelimiter(text));
  const transactions: Transaction[] = [];
  const budgets: MonthlyBudget[] = [];
  const errors: string[] = [];
  const previewRows: PreviewRow[] = [];
  if (records.length === 0) {
    return { transactions, budgets, errors: ["CSV vazio ou sem cabeçalho."], validCount: 0, previewRows };
  }

  const headerRecord = records[0];
  const columns = new Map<HeaderKey, number>();
  headerRecord.fields.forEach((field, index) => {
    const key = HEADER_ALIASES[normalizeHeader(field)];
    if (!key) return;
    if (columns.has(key)) errors.push(`Cabeçalho: coluna duplicada “${field.trim()}”.`);
    else columns.set(key, index);
  });

  const required: HeaderKey[] = ["date", "kind", "amount", "category"];
  for (const key of required) {
    if (!columns.has(key)) {
      const label: Record<HeaderKey, string> = {
        record: "registro/kind",
        date: "data/date",
        kind: "tipo/type",
        amount: "valor/amount",
        category: "categoria/category",
        description: "descricao/description",
        expenseClass: "classeDespesa/expenseClass",
      };
      errors.push(`Cabeçalho: coluna obrigatória ausente (${label[key]}).`);
    }
  }
  if (errors.some((error) => error.startsWith("Cabeçalho: coluna obrigatória ausente"))) {
    return { transactions, budgets, errors, validCount: 0, previewRows };
  }

  const valueAt = (fields: string[], key: HeaderKey): string => {
    const index = columns.get(key);
    return index === undefined ? "" : (fields[index] ?? "").trim();
  };

  for (const record of records.slice(1)) {
    const prefix = `Linha ${record.line}:`;
    if (record.error) {
      errors.push(`${prefix} ${record.error}.`);
      continue;
    }

    const recordType = normalizeHeader(valueAt(record.fields, "record"));
    const isBudget = recordType === "orcamento" || recordType === "budget";
    if (columns.has("record") && !isBudget && recordType && !["transacao", "transaction", "movimento", "movement"].includes(recordType)) {
      errors.push(`${prefix} registro inválido “${valueAt(record.fields, "record") }”.`);
      continue;
    }

    const rawDate = valueAt(record.fields, "date");
    const date = isBudget ? parseBudgetMonth(rawDate) : parseTransactionDate(rawDate);
    if (!date) {
      errors.push(`${prefix} data inválida “${rawDate}”.`);
      continue;
    }

    const rawKind = valueAt(record.fields, "kind");
    const kind = parseKind(rawKind);
    if (!kind) {
      errors.push(`${prefix} tipo inválido “${rawKind}”; use receita/income ou despesa/expense.`);
      continue;
    }
    if (isBudget && kind !== "expense") {
      errors.push(`${prefix} orçamento deve ter tipo despesa/expense.`);
      continue;
    }

    const rawAmount = valueAt(record.fields, "amount");
    const amountCents = parseAmount(rawAmount);
    if (amountCents === undefined) {
      errors.push(`${prefix} valor deve ser finito e maior que zero (“${rawAmount}”).`);
      continue;
    }

    const category = valueAt(record.fields, "category");
    if (!category) {
      errors.push(`${prefix} categoria obrigatória.`);
      continue;
    }

    if (isBudget) {
      const budget: MonthlyBudget = { id: createId("budget"), month: date, category, amountCents };
      budgets.push(budget);
      previewRows.push({ kind: "budget", date, label: category, category, amountCents });
      continue;
    }

    const rawClass = valueAt(record.fields, "expenseClass");
    const expenseClass = kind === "expense" ? (rawClass ? parseExpenseClass(rawClass) : "variable") : undefined;
    if (kind === "expense" && rawClass && !expenseClass) {
      errors.push(`${prefix} classe de despesa inválida “${rawClass}”; use fixa/fixed, variável/variable ou esporádica/sporadic.`);
      continue;
    }

    const description = valueAt(record.fields, "description");
    const transaction: Transaction = {
      id: createId("transaction"),
      kind,
      amountCents,
      date,
      category,
      description,
      ...(expenseClass ? { expenseClass } : {}),
    };
    transactions.push(transaction);
    previewRows.push({
      kind: "transaction",
      transactionKind: kind,
      date,
      label: description || category,
      category,
      amountCents,
      ...(description ? { notes: description } : {}),
    });
  }

  return { transactions, budgets, errors, validCount: transactions.length + budgets.length, previewRows };
}

export function exportCsv(state: BudgetState): string {
  const rows: string[][] = [["registro", "data", "tipo", "valor", "categoria", "descricao", "classeDespesa"]];
  const classLabels: Record<ExpenseClass, string> = {
    fixed: "fixa",
    variable: "variável",
    sporadic: "esporádica",
  };

  for (const transaction of state.transactions) {
    rows.push([
      "movimento",
      transaction.date,
      transaction.kind === "income" ? "receita" : "despesa",
      formatAmount(transaction.amountCents),
      transaction.category,
      transaction.description,
      transaction.expenseClass ? classLabels[transaction.expenseClass] : "",
    ]);
  }
  for (const budget of state.budgets) {
    rows.push(["orcamento", budget.month, "despesa", formatAmount(budget.amountCents), budget.category, "", ""]);
  }

  return `\uFEFF${rows.map((row) => row.map(escapeCsv).join(";")).join("\r\n")}`;
}
