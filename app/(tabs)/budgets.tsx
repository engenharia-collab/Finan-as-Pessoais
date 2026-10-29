import { useMemo, useState } from "react";
import { Alert, Platform, StyleSheet, Text, View } from "react-native";
import { BudgetModal } from "@/components/budget/BudgetModal";
import { BudgetProgressList } from "@/components/budget/charts";
import { ActionButton, MonthNavigation, PageHeading, PageScroll, SectionTitle, Surface } from "@/components/budget/primitives";
import { useBudget } from "@/lib/budget/BudgetProvider";
import { normalizeCategory, PALETTE } from "@/lib/budget/categories";
import { formatMoney, getMonthBudgets, getSummary } from "@/lib/budget/calculations";
import type { MonthlyBudget } from "@/lib/budget/types";

export default function BudgetsScreen() {
  const { state, selectedMonth, saveBudget, deleteBudget } = useBudget();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<MonthlyBudget | null>(null);
  const budgets = useMemo(() => getMonthBudgets(state, selectedMonth), [state, selectedMonth]);
  const summary = useMemo(() => getSummary(state, selectedMonth), [state, selectedMonth]);
  const available = budgets.reduce((sum, budget) => {
    const spent = state.transactions.filter((item) => item.kind === "expense" && item.date.slice(0, 7) === selectedMonth && normalizeCategory(item.category) === normalizeCategory(budget.category)).reduce((subtotal, item) => subtotal + item.amountCents, 0);
    return sum + budget.amountCents - spent;
  }, 0);

  const remove = (budget: MonthlyBudget) => {
    const message = `Remover o limite de ${budget.category} para este mês? Os lançamentos continuam no extrato.`;
    if (Platform.OS === "web") {
      if (globalThis.confirm(message)) deleteBudget(budget.id);
      return;
    }
    Alert.alert("Remover limite?", message, [
      { text: "Manter", style: "cancel" },
      { text: "Remover", style: "destructive", onPress: () => deleteBudget(budget.id) },
    ]);
  };

  return (
    <>
      <PageScroll>
        <PageHeading eyebrow="PLANEJAMENTO" title="Orçamentos" subtitle="Combine limites por categoria e acompanhe o andamento." />
        <MonthNavigation />
        <Surface style={styles.overview}>
          <View style={styles.overviewTop}>
            <View><Text style={styles.overviewLabel}>TOTAL PLANEJADO</Text><Text style={styles.overviewValue}>{formatMoney(summary.budgetCents)}</Text></View>
            <View style={[styles.overviewIcon, available < 0 && { backgroundColor: PALETTE.terracottaPale }]}>
              <Text style={[styles.overviewSign, available < 0 && { color: PALETTE.terracotta }]}>{available < 0 ? "!" : "✓"}</Text>
            </View>
          </View>
          <View style={styles.overviewDivider} />
          <View style={styles.overviewStats}>
            <View style={styles.stat}>
              <Text style={styles.statLabel}>Despesas do mês</Text>
              <Text style={styles.statValue}>{formatMoney(summary.expenseCents)}</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statLabel}>{available < 0 ? "Acima dos limites" : "Disponível nos limites"}</Text>
              <Text style={[styles.statValue, available < 0 && { color: PALETTE.terracotta }]}>{formatMoney(Math.abs(available))}</Text>
            </View>
          </View>
        </Surface>

        <ActionButton title="Definir orçamento" icon="plus" onPress={() => { setEditing(null); setFormOpen(true); }} />

        <View style={styles.section}>
          <SectionTitle title="Limites deste mês" caption={budgets.length ? `${budgets.length} categoria${budgets.length === 1 ? "" : "s"} acompanhada${budgets.length === 1 ? "" : "s"}` : "Cada mês tem seus próprios limites"} />
          <Surface>
            <BudgetProgressList
              state={state}
              month={selectedMonth}
              budgets={budgets}
              onEdit={(budget) => { setEditing(budget); setFormOpen(true); }}
              onDelete={remove}
            />
          </Surface>
        </View>
        <Text style={styles.footer}>O que não tem limite cadastrado continua aparecendo nos gastos por categoria.</Text>
      </PageScroll>
      <BudgetModal
        visible={formOpen}
        onClose={() => setFormOpen(false)}
        onSave={(category, amountCents) => saveBudget(selectedMonth, category, amountCents)}
        budget={editing}
        month={selectedMonth}
      />
    </>
  );
}

const styles = StyleSheet.create({
  overview: { padding: 19 },
  overviewTop: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" },
  overviewLabel: { color: PALETTE.muted, fontSize: 9, fontWeight: "800", letterSpacing: 1.3 },
  overviewValue: { color: PALETTE.ink, fontSize: 26, fontWeight: "800", letterSpacing: -0.7, marginTop: 5 },
  overviewIcon: { width: 36, height: 36, backgroundColor: PALETTE.greenPale, borderRadius: 13, alignItems: "center", justifyContent: "center" },
  overviewSign: { color: PALETTE.green, fontSize: 18, fontWeight: "800" },
  overviewDivider: { height: 1, backgroundColor: PALETTE.line, marginVertical: 15 },
  overviewStats: { flexDirection: "row", gap: 18 },
  stat: { flex: 1, gap: 5 },
  statLabel: { color: PALETTE.muted, fontSize: 10, fontWeight: "600" },
  statValue: { color: PALETTE.ink, fontSize: 14, fontWeight: "700" },
  section: { gap: 11 },
  footer: { color: PALETTE.muted, fontSize: 10, lineHeight: 15, textAlign: "center", paddingHorizontal: 12, paddingBottom: 8 },
});
