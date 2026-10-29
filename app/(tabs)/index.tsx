import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { BudgetProgressList, CategoryBars, ExpenseClassBreakdown, TrendChart } from "@/components/budget/charts";
import { TransactionModal } from "@/components/budget/TransactionModal";
import { TransactionRow } from "@/components/budget/TransactionRow";
import { ActionButton, MonthNavigation, PageHeading, PageScroll, SectionTitle, Surface } from "@/components/budget/primitives";
import { useBudget } from "@/lib/budget/BudgetProvider";
import { PALETTE } from "@/lib/budget/categories";
import { formatMoney, getCategoryBreakdown, getInsights, getMonthBudgets, getMonthTransactions, getSummary, getTrend } from "@/lib/budget/calculations";
import type { Transaction } from "@/lib/budget/types";

export default function HomeScreen() {
  const router = useRouter();
  const { state, selectedMonth, hydrated, storageIssue, addTransaction, updateTransaction } = useBudget();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Transaction | null>(null);
  const summary = useMemo(() => getSummary(state, selectedMonth), [state, selectedMonth]);
  const categoryBreakdown = useMemo(() => getCategoryBreakdown(state, selectedMonth), [state, selectedMonth]);
  const currentTransactions = useMemo(() => getMonthTransactions(state, selectedMonth), [state, selectedMonth]);
  const currentBudgets = useMemo(() => getMonthBudgets(state, selectedMonth), [state, selectedMonth]);
  const trend = useMemo(() => getTrend(state, selectedMonth, 6), [state, selectedMonth]);
  const insights = useMemo(() => getInsights(state, selectedMonth), [state, selectedMonth]);
  const recent = currentTransactions.slice(0, 4);

  const saveTransaction = (draft: Omit<Transaction, "id">, id?: string) => {
    if (id) updateTransaction({ ...draft, id });
    else addTransaction(draft);
  };

  return (
    <>
      <PageScroll>
        <PageHeading eyebrow="MEU ORÇAMENTO" title="Seu mês, sem mistério." subtitle="Um olhar claro para o que entra, sai e ainda sobra." />
        <MonthNavigation />

        <View style={styles.balanceCard}>
          <View style={styles.balanceTop}>
            <View>
              <Text style={styles.balanceEyebrow}>SALDO DO MÊS</Text>
              <Text style={styles.balanceAmount}>{hydrated ? formatMoney(summary.remainingCents) : "R$ —"}</Text>
            </View>
            <View style={styles.balanceIcon}><Feather name="align-left" size={19} color={PALETTE.white} /></View>
          </View>
          <Text style={styles.balanceCaption}>
            {summary.remainingCents < 0
              ? "As despesas passaram das receitas neste mês."
              : summary.incomeCents > 0
                ? `${Math.round((summary.remainingCents / summary.incomeCents) * 100)}% da renda ainda está disponível.`
                : "Registre uma receita para acompanhar quanto fica disponível."}
          </Text>
          <View style={styles.balanceDivider} />
          <View style={styles.balanceStats}>
            <View style={styles.balanceStat}>
              <View style={styles.statLabel}><Feather name="arrow-down-left" size={13} color="#C5E1D4" /><Text style={styles.balanceStatLabel}>Receitas</Text></View>
              <Text style={styles.balanceStatValue}>{formatMoney(summary.incomeCents)}</Text>
            </View>
            <View style={styles.statSeparator} />
            <View style={styles.balanceStat}>
              <View style={styles.statLabel}><Feather name="arrow-up-right" size={13} color="#F2C8B9" /><Text style={styles.balanceStatLabel}>Despesas</Text></View>
              <Text style={styles.balanceStatValue}>{formatMoney(summary.expenseCents)}</Text>
            </View>
          </View>
        </View>

        <ActionButton title="Novo lançamento" icon="plus" onPress={() => { setEditing(null); setFormOpen(true); }} />

        <View style={styles.section}>
          <SectionTitle title="Onde seu dinheiro foi" caption="Gastos por categoria neste mês" />
          <Surface><CategoryBars items={categoryBreakdown} /></Surface>
        </View>

        <View style={styles.section}>
          <SectionTitle title="Tipos de despesa" caption="Fixas, variáveis e esporádicas neste mês" />
          <Surface><ExpenseClassBreakdown transactions={currentTransactions} /></Surface>
        </View>

        <View style={styles.section}>
          <SectionTitle title="Ritmo do seu dinheiro" caption="Seis meses de receitas, despesas e saldo" />
          <Surface><TrendChart points={trend} /></Surface>
        </View>

        <View style={styles.section}>
          <SectionTitle
            title="Orçamento por categoria"
            caption={currentBudgets.length ? `${currentBudgets.length} limite${currentBudgets.length === 1 ? "" : "s"} definido${currentBudgets.length === 1 ? "" : "s"}` : "Seus limites mensais"}
            action={<Pressable onPress={() => router.push("/(tabs)/budgets")} style={styles.textLink}><Text style={styles.textLinkLabel}>Ver todos</Text><Feather name="arrow-up-right" size={14} color={PALETTE.green} /></Pressable>}
          />
          <Surface><BudgetProgressList state={state} month={selectedMonth} budgets={currentBudgets} /></Surface>
        </View>

        <View style={styles.section}>
          <SectionTitle title="Uma leitura do mês" caption="Pistas simples para decidir com calma" />
          <Surface style={styles.insightCard}>
            {insights.length ? insights.slice(0, 3).map((insight, index) => (
              <View key={`${insight}-${index}`} style={styles.insightRow}>
                <View style={[styles.insightIcon, insight.includes("acima do orçamento") ? styles.alertIcon : null]}>
                  <Feather name={insight.includes("acima do orçamento") ? "alert-circle" : "compass"} size={15} color={insight.includes("acima do orçamento") ? PALETTE.terracotta : PALETTE.green} />
                </View>
                <Text style={styles.insightText}>{insight}</Text>
              </View>
            )) : (
              <View style={styles.insightRow}>
                <View style={styles.insightIcon}><Feather name="info" size={15} color={PALETTE.green} /></View>
                <Text style={styles.insightText}>
                  {currentTransactions.length === 0
                    ? "Seus dados começam aqui, neste dispositivo. Registre um lançamento e defina limites para receber análises."
                    : "Tudo dentro do combinado por enquanto. Continue registrando para acompanhar as tendências."}
                </Text>
              </View>
            )}
          </Surface>
        </View>

        <View style={styles.section}>
          <SectionTitle
            title="Lançamentos recentes"
            caption={currentTransactions.length ? `${currentTransactions.length} neste mês` : "A atividade do mês aparece aqui"}
            action={currentTransactions.length ? <Pressable onPress={() => router.push("/(tabs)/transactions")} style={styles.textLink}><Text style={styles.textLinkLabel}>Ver lista</Text><Feather name="arrow-up-right" size={14} color={PALETTE.green} /></Pressable> : undefined}
          />
          <Surface style={styles.recentSurface}>
            {recent.length ? recent.map((transaction) => (
              <TransactionRow key={transaction.id} transaction={transaction} onEdit={() => { setEditing(transaction); setFormOpen(true); }} />
            )) : (
              <View style={styles.emptyRecent}>
                <Feather name="book-open" size={22} color={PALETTE.green} />
                <Text style={styles.emptyTitle}>Seu extrato está em branco</Text>
                <Text style={styles.emptySubtitle}>Adicione a primeira receita ou despesa para começar.</Text>
              </View>
            )}
          </Surface>
        </View>
        {storageIssue ? <Text style={styles.storageWarning}>{storageIssue}</Text> : null}
        <Text style={styles.localFootnote}>Salvo somente neste navegador ou dispositivo.</Text>
      </PageScroll>
      <TransactionModal visible={formOpen} onClose={() => setFormOpen(false)} onSave={saveTransaction} month={selectedMonth} transaction={editing} />
    </>
  );
}

const styles = StyleSheet.create({
  balanceCard: { backgroundColor: PALETTE.green, borderRadius: 23, paddingHorizontal: 21, paddingTop: 20, paddingBottom: 17, overflow: "hidden" },
  balanceTop: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" },
  balanceEyebrow: { color: "#C7E3D5", fontSize: 10, fontWeight: "800", letterSpacing: 1.4 },
  balanceAmount: { color: PALETTE.white, fontSize: 36, lineHeight: 44, fontWeight: "800", letterSpacing: -1.1, marginTop: 4 },
  balanceIcon: { width: 39, height: 39, borderRadius: 14, backgroundColor: "rgba(255,255,255,0.14)", alignItems: "center", justifyContent: "center" },
  balanceCaption: { color: "#D4E7DD", fontSize: 12, lineHeight: 18, marginTop: 3 },
  balanceDivider: { height: 1, backgroundColor: "rgba(255,255,255,0.2)", marginTop: 17, marginBottom: 14 },
  balanceStats: { flexDirection: "row", alignItems: "center" },
  balanceStat: { flex: 1, gap: 6 },
  statLabel: { flexDirection: "row", alignItems: "center", gap: 5 },
  balanceStatLabel: { color: "#C7E3D5", fontSize: 10, fontWeight: "600" },
  balanceStatValue: { color: PALETTE.white, fontSize: 15, fontWeight: "700" },
  statSeparator: { width: 1, height: 34, backgroundColor: "rgba(255,255,255,0.2)", marginHorizontal: 13 },
  section: { gap: 11 },
  textLink: { flexDirection: "row", alignItems: "center", gap: 4, paddingVertical: 7 },
  textLinkLabel: { color: PALETTE.green, fontSize: 11, fontWeight: "700" },
  insightCard: { gap: 13 },
  insightRow: { flexDirection: "row", alignItems: "flex-start", gap: 11 },
  insightIcon: { width: 29, height: 29, borderRadius: 10, backgroundColor: PALETTE.greenPale, alignItems: "center", justifyContent: "center" },
  alertIcon: { backgroundColor: PALETTE.terracottaPale },
  insightText: { flex: 1, color: PALETTE.ink, fontSize: 12, lineHeight: 18, paddingTop: 4 },
  recentSurface: { paddingTop: 3, paddingBottom: 3 },
  emptyRecent: { alignItems: "center", gap: 7, paddingVertical: 22 },
  emptyTitle: { color: PALETTE.ink, fontSize: 14, fontWeight: "700" },
  emptySubtitle: { color: PALETTE.muted, fontSize: 11, textAlign: "center", lineHeight: 16 },
  storageWarning: { color: PALETTE.terracotta, fontSize: 11, textAlign: "center" },
  localFootnote: { color: PALETTE.muted, textAlign: "center", fontSize: 10, paddingBottom: 10 },
});
