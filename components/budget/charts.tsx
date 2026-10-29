import { Fragment, useMemo } from "react";
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { Feather } from "@expo/vector-icons";
import Svg, { Circle, Line, Path } from "react-native-svg";
import { formatMoney, getBudgetProgress, getTrend } from "@/lib/budget/calculations";
import { EXPENSE_CLASS_LABELS, PALETTE } from "@/lib/budget/categories";
import type { BudgetState, CategoryTotal, ExpenseClass, MonthlyBudget, Transaction } from "@/lib/budget/types";
import { EmptyNote } from "./primitives";

type TrendPoint = ReturnType<typeof getTrend>[number];

export function CategoryBars({ items }: { items: CategoryTotal[] }) {
  const maxAmount = Math.max(0, ...items.map((item) => item.amountCents));
  if (!items.length || maxAmount === 0) {
    return <EmptyNote icon="pie-chart" title="Sem gastos para distribuir" detail="Quando registrar despesas neste mês, a divisão por categoria aparece aqui." />;
  }
  const total = items.reduce((sum, item) => sum + item.amountCents, 0);
  return (
    <View style={styles.categoryList}>
      {items.slice(0, 7).map((item) => {
        const share = total ? (item.amountCents / total) * 100 : 0;
        return (
          <View key={item.category} style={styles.categoryRow}>
            <View style={styles.categoryMeta}>
              <View style={[styles.dot, { backgroundColor: item.color }]} />
              <Text style={styles.categoryName} numberOfLines={1}>{item.category}</Text>
              <Text style={styles.categoryShare}>{Math.round(share)}%</Text>
              <Text style={styles.categoryValue}>{formatMoney(item.amountCents)}</Text>
            </View>
            <View style={styles.barTrack}>
              <View style={[styles.barFill, { width: `${Math.max(3, (item.amountCents / maxAmount) * 100)}%`, backgroundColor: item.color }]} />
            </View>
          </View>
        );
      })}
      {items.length > 7 ? <Text style={styles.moreCaption}>e mais {items.length - 7} categorias</Text> : null}
    </View>
  );
}

export function ExpenseClassBreakdown({ transactions }: { transactions: Transaction[] }) {
  const entries: { key: ExpenseClass; color: string }[] = [
    { key: "fixed", color: PALETTE.green },
    { key: "variable", color: PALETTE.gold },
    { key: "sporadic", color: "#68879A" },
  ];
  const totals = entries.map((entry) => ({
    ...entry,
    label: EXPENSE_CLASS_LABELS[entry.key].replace(" mensal", ""),
    amountCents: transactions.filter((item) => item.kind === "expense" && item.expenseClass === entry.key).reduce((sum, item) => sum + item.amountCents, 0),
    count: transactions.filter((item) => item.kind === "expense" && item.expenseClass === entry.key).length,
  }));
  const maxAmount = Math.max(0, ...totals.map((item) => item.amountCents));
  if (!maxAmount) return <EmptyNote icon="layers" title="Despesas por organizar" detail="Ao registrar despesas, marque cada uma como fixa, variável ou esporádica." />;
  return (
    <View style={styles.expenseClassList}>
      {totals.map((item) => (
        <View key={item.key} style={styles.classItem}>
          <View style={styles.classMeta}>
            <View style={[styles.dot, { backgroundColor: item.color }]} />
            <Text style={styles.categoryName}>{item.label}</Text>
            <Text style={styles.classCount}>{item.count} {item.count === 1 ? "despesa" : "despesas"}</Text>
            <Text style={styles.categoryValue}>{formatMoney(item.amountCents)}</Text>
          </View>
          <View style={styles.barTrack}><View style={[styles.barFill, { width: `${maxAmount ? Math.max(2, (item.amountCents / maxAmount) * 100) : 0}%`, backgroundColor: item.color }]} /></View>
        </View>
      ))}
    </View>
  );
}

export function TrendChart({ points }: { points: TrendPoint[] }) {
  const { width: screenWidth } = useWindowDimensions();
  const width = Math.max(220, Math.min(680, screenWidth - 82));
  const height = 174;
  const paddingX = 16;
  const paddingY = 14;
  const allValues = points.flatMap((point) => [point.incomeCents, point.expenseCents, point.remainingCents]);
  const hasActivity = allValues.some((value) => value !== 0);
  const minValue = Math.min(0, ...allValues);
  let maxValue = Math.max(1, ...allValues);
  if (maxValue === minValue) maxValue = minValue + 1;
  const pointFor = (value: number, index: number) => {
    const x = points.length <= 1 ? width / 2 : paddingX + (index * (width - paddingX * 2)) / (points.length - 1);
    const y = height - paddingY - ((value - minValue) / (maxValue - minValue)) * (height - paddingY * 2);
    return { x, y };
  };
  const lineFor = (selector: (point: TrendPoint) => number) => points.map((point, index) => {
    const { x, y } = pointFor(selector(point), index);
    return `${index === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");
  const gridYs = [0.2, 0.5, 0.8].map((fraction) => paddingY + (height - paddingY * 2) * fraction);

  return (
    <View style={styles.trendWrap}>
      {hasActivity ? (
        <>
          <Svg width={width} height={height}>
            {gridYs.map((y) => <Line key={y} x1={paddingX} y1={y} x2={width - paddingX} y2={y} stroke={PALETTE.line} strokeWidth={1} />)}
            <Path d={lineFor((point) => point.incomeCents)} fill="none" stroke={PALETTE.green} strokeWidth={2.8} strokeLinecap="round" strokeLinejoin="round" />
            <Path d={lineFor((point) => point.expenseCents)} fill="none" stroke={PALETTE.terracotta} strokeWidth={2.8} strokeLinecap="round" strokeLinejoin="round" />
            <Path d={lineFor((point) => point.remainingCents)} fill="none" stroke={PALETTE.gold} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" strokeDasharray="5 5" />
            {points.map((point, index) => {
              const income = pointFor(point.incomeCents, index);
              const expense = pointFor(point.expenseCents, index);
              return (
                <Fragment key={point.month}>
                  <Circle cx={income.x} cy={income.y} r={3.2} fill={PALETTE.green} />
                  <Circle cx={expense.x} cy={expense.y} r={3.2} fill={PALETTE.terracotta} />
                </Fragment>
              );
            })}
          </Svg>
          <View style={styles.monthLabels}>
            {points.map((point) => (
              <Text key={point.month} style={styles.monthAbbrev} numberOfLines={1}>
                {point.label.split(" ")[0].replace(".", "").slice(0, 3)}
              </Text>
            ))}
          </View>
          <View style={styles.legend}>
            <LegendDot color={PALETTE.green} title="Receitas" />
            <LegendDot color={PALETTE.terracotta} title="Despesas" />
            <LegendDot color={PALETTE.gold} title="Saldo" dashed />
          </View>
        </>
      ) : (
        <EmptyNote icon="trending-up" title="Seu histórico está começando" detail="Registre lançamentos mês a mês para acompanhar a evolução de receitas, despesas e saldo." />
      )}
    </View>
  );
}

function LegendDot({ color, title, dashed = false }: { color: string; title: string; dashed?: boolean }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendMark, { backgroundColor: dashed ? "transparent" : color, borderColor: color, borderStyle: dashed ? "dashed" : "solid" }]} />
      <Text style={styles.legendText}>{title}</Text>
    </View>
  );
}

export function BudgetProgressList({ state, month, budgets, onEdit, onDelete }: {
  state: BudgetState;
  month: string;
  budgets: MonthlyBudget[];
  onEdit?: (budget: MonthlyBudget) => void;
  onDelete?: (budget: MonthlyBudget) => void;
}) {
  const progress = useMemo(() => getBudgetProgress(state, month), [state, month]);
  if (!budgets.length) {
    return <EmptyNote icon="target" title="Nenhum limite definido" detail="Defina um valor mensal para cada categoria que deseja acompanhar." />;
  }
  return (
    <View style={styles.budgetList}>
      {progress.map(({ budget, spentCents, remainingCents, percentUsed, overPercent }) => {
        const over = overPercent > 0;
        const barColor = over ? PALETTE.terracotta : percentUsed >= 80 ? PALETTE.gold : PALETTE.green;
        return (
          <View key={budget.id} style={styles.budgetItem}>
            <View style={styles.budgetHead}>
              <Text style={styles.categoryName}>{budget.category}</Text>
              <Text style={[styles.budgetRemaining, over && { color: PALETTE.terracotta }]}>
                {over ? `${Math.round(overPercent)}% acima` : `${formatMoney(Math.max(0, remainingCents))} disponível`}
              </Text>
              {onEdit ? <Pressable accessibilityLabel="Editar orçamento" hitSlop={8} onPress={() => onEdit(budget)} style={styles.budgetAction}><Feather name="edit-2" size={14} color={PALETTE.muted} /></Pressable> : null}
              {onDelete ? <Pressable accessibilityLabel="Excluir orçamento" hitSlop={8} onPress={() => onDelete(budget)} style={styles.budgetAction}><Feather name="trash-2" size={14} color={PALETTE.muted} /></Pressable> : null}
            </View>
            <View style={styles.budgetTrack}>
              <View style={[styles.budgetFill, { width: `${Math.max(0, Math.min(percentUsed, 100))}%`, backgroundColor: barColor }]} />
              {over ? <View style={styles.overMarker} /> : null}
            </View>
            <View style={styles.budgetFoot}>
              <Text style={styles.budgetNumbers}>{formatMoney(spentCents)} de {formatMoney(budget.amountCents)}</Text>
              <Text style={[styles.percentText, over && { color: PALETTE.terracotta }]}>{Math.round(percentUsed)}%</Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  categoryList: { gap: 16 },
  categoryRow: { gap: 8 },
  categoryMeta: { flexDirection: "row", alignItems: "center", gap: 8 },
  dot: { width: 9, height: 9, borderRadius: 5 },
  categoryName: { color: PALETTE.ink, fontSize: 13, fontWeight: "700", flex: 1 },
  categoryShare: { color: PALETTE.muted, fontSize: 11, width: 34, textAlign: "right" },
  categoryValue: { color: PALETTE.ink, fontSize: 12, fontWeight: "700", minWidth: 82, textAlign: "right" },
  barTrack: { height: 6, marginLeft: 17, borderRadius: 6, backgroundColor: "#F1F0EA", overflow: "hidden" },
  barFill: { height: "100%", borderRadius: 6 },
  expenseClassList: { gap: 16 },
  classItem: { gap: 8 },
  classMeta: { flexDirection: "row", alignItems: "center", gap: 8 },
  classCount: { color: PALETTE.muted, fontSize: 10, flex: 1, textAlign: "right" },
  moreCaption: { marginTop: 2, color: PALETTE.muted, fontSize: 11 },
  trendWrap: { alignItems: "center", gap: 11 },
  monthLabels: { width: "100%", flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 5 },
  monthAbbrev: { color: PALETTE.muted, fontSize: 10, textAlign: "center", flex: 1, textTransform: "capitalize" },
  legend: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 17, marginTop: 4 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  legendMark: { width: 9, height: 9, borderWidth: 2, borderRadius: 5 },
  legendText: { color: PALETTE.muted, fontSize: 10, fontWeight: "600" },
  budgetList: { gap: 19 },
  budgetItem: { gap: 8 },
  budgetHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 9 },
  budgetRemaining: { color: PALETTE.green, fontSize: 11, fontWeight: "700" },
  budgetAction: { width: 26, height: 28, alignItems: "center", justifyContent: "center" },
  budgetTrack: { position: "relative", height: 9, backgroundColor: "#EFEEE7", borderRadius: 8, overflow: "hidden" },
  budgetFill: { height: "100%", borderRadius: 8 },
  overMarker: { position: "absolute", right: 0, top: 0, bottom: 0, width: 2, backgroundColor: PALETTE.terracotta },
  budgetFoot: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  budgetNumbers: { color: PALETTE.muted, fontSize: 11 },
  percentText: { color: PALETTE.ink, fontSize: 11, fontWeight: "700" },
});
