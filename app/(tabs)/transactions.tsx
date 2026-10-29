import { useMemo, useState } from "react";
import { Alert, Platform, StyleSheet, Text, View } from "react-native";
import { TransactionModal } from "@/components/budget/TransactionModal";
import { TransactionRow } from "@/components/budget/TransactionRow";
import { ActionButton, Chip, MonthNavigation, PageHeading, PageScroll, SectionTitle, Surface } from "@/components/budget/primitives";
import { useBudget } from "@/lib/budget/BudgetProvider";
import { PALETTE } from "@/lib/budget/categories";
import { formatMoney, getMonthTransactions, getSummary } from "@/lib/budget/calculations";
import type { Transaction } from "@/lib/budget/types";

const FILTERS = ["Todos", "Receitas", "Despesas", "Fixas", "Variáveis", "Esporádicas"] as const;
type Filter = (typeof FILTERS)[number];

export default function TransactionsScreen() {
  const { state, selectedMonth, addTransaction, updateTransaction, deleteTransaction } = useBudget();
  const [filter, setFilter] = useState<Filter>("Todos");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Transaction | null>(null);
  const transactions = useMemo(() => getMonthTransactions(state, selectedMonth), [state, selectedMonth]);
  const summary = useMemo(() => getSummary(state, selectedMonth), [state, selectedMonth]);
  const filtered = transactions.filter((item) => {
    if (filter === "Receitas") return item.kind === "income";
    if (filter === "Despesas") return item.kind === "expense";
    if (filter === "Fixas") return item.kind === "expense" && item.expenseClass === "fixed";
    if (filter === "Variáveis") return item.kind === "expense" && item.expenseClass === "variable";
    if (filter === "Esporádicas") return item.kind === "expense" && item.expenseClass === "sporadic";
    return true;
  });

  const save = (draft: Omit<Transaction, "id">, id?: string) => {
    if (id) updateTransaction({ ...draft, id });
    else addTransaction(draft);
  };
  const remove = (item: Transaction) => {
    const message = `Excluir “${item.description || item.category}”? Essa ação não pode ser desfeita.`;
    if (Platform.OS === "web") {
      if (globalThis.confirm(message)) deleteTransaction(item.id);
      return;
    }
    Alert.alert("Excluir lançamento?", message, [
      { text: "Cancelar", style: "cancel" },
      { text: "Excluir", style: "destructive", onPress: () => deleteTransaction(item.id) },
    ]);
  };

  return (
    <>
      <PageScroll>
        <PageHeading eyebrow="EXTRATO PESSOAL" title="Lançamentos" subtitle="Receitas e despesas, organizadas por mês." />
        <MonthNavigation />
        <View style={styles.summaryRow}>
          <Surface style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Entradas</Text>
            <Text style={[styles.summaryAmount, { color: PALETTE.green }]}>{formatMoney(summary.incomeCents)}</Text>
          </Surface>
          <Surface style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Saídas</Text>
            <Text style={[styles.summaryAmount, { color: PALETTE.terracotta }]}>{formatMoney(summary.expenseCents)}</Text>
          </Surface>
        </View>
        <ActionButton title="Adicionar lançamento" icon="plus" onPress={() => { setEditing(null); setFormOpen(true); }} />

        <View style={styles.section}>
          <SectionTitle title="Movimentações" caption={`${filtered.length} de ${transactions.length} neste mês`} />
          <View style={styles.filterRow}>
            {FILTERS.map((item) => <Chip key={item} title={item} selected={filter === item} onPress={() => setFilter(item)} />)}
          </View>
          <Surface style={styles.listSurface}>
            {filtered.length ? filtered.map((item) => (
              <TransactionRow
                key={item.id}
                transaction={item}
                onEdit={() => { setEditing(item); setFormOpen(true); }}
                onDelete={() => remove(item)}
              />
            )) : (
              <View style={styles.empty}>
                <Text style={styles.emptyTitle}>{transactions.length ? "Nenhum lançamento neste filtro" : "Ainda não há movimentações"}</Text>
                <Text style={styles.emptyText}>{transactions.length ? "Escolha outro filtro para ver o restante do mês." : "Adicione uma receita ou despesa para preencher o extrato."}</Text>
              </View>
            )}
          </Surface>
        </View>
        <View style={styles.noteRow}>
          <Text style={styles.note}>As despesas podem ser marcadas como fixas, variáveis ou esporádicas.</Text>
        </View>
      </PageScroll>
      <TransactionModal visible={formOpen} onClose={() => setFormOpen(false)} onSave={save} month={selectedMonth} transaction={editing} />
    </>
  );
}

const styles = StyleSheet.create({
  summaryRow: { flexDirection: "row", gap: 10 },
  summaryCard: { flex: 1, gap: 5, paddingHorizontal: 14, paddingVertical: 14 },
  summaryLabel: { color: PALETTE.muted, fontSize: 11, fontWeight: "600" },
  summaryAmount: { fontSize: 16, fontWeight: "800" },
  section: { gap: 12 },
  filterRow: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
  listSurface: { paddingHorizontal: 13, paddingVertical: 3 },
  empty: { alignItems: "center", paddingVertical: 28, gap: 6 },
  emptyTitle: { color: PALETTE.ink, fontSize: 14, fontWeight: "700", textAlign: "center" },
  emptyText: { color: PALETTE.muted, fontSize: 11, lineHeight: 17, textAlign: "center", maxWidth: 260 },
  noteRow: { alignItems: "center", paddingBottom: 6 },
  note: { color: PALETTE.muted, fontSize: 10, lineHeight: 15, textAlign: "center" },
});
