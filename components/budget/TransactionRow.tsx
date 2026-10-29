import { Pressable, StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { EXPENSE_CLASS_LABELS, PALETTE } from "@/lib/budget/categories";
import { formatDate, formatMoney } from "@/lib/budget/calculations";
import type { Transaction } from "@/lib/budget/types";
import { LabelPill } from "./primitives";

export function TransactionRow({ transaction, onEdit, onDelete }: {
  transaction: Transaction;
  onEdit?: () => void;
  onDelete?: () => void;
}) {
  const isIncome = transaction.kind === "income";
  const content = (
    <>
      <View style={[styles.marker, { backgroundColor: isIncome ? PALETTE.greenPale : PALETTE.terracottaPale }]}>
        <Feather name={isIncome ? "arrow-down-left" : "arrow-up-right"} size={16} color={isIncome ? PALETTE.green : PALETTE.terracotta} />
      </View>
      <View style={styles.description}>
        <Text style={styles.category} numberOfLines={1}>{transaction.category}</Text>
        <View style={styles.detailLine}>
          <Text style={styles.detail} numberOfLines={1}>{transaction.description || formatDate(transaction.date)}</Text>
          {transaction.kind === "expense" && transaction.expenseClass ? (
            <Text style={styles.classLabel}>{EXPENSE_CLASS_LABELS[transaction.expenseClass]}</Text>
          ) : null}
        </View>
      </View>
      <Text style={[styles.amount, { color: isIncome ? PALETTE.green : PALETTE.ink }]}>
        {isIncome ? "+ " : "− "}{formatMoney(transaction.amountCents)}
      </Text>
      {onDelete ? (
        <Pressable accessibilityLabel="Excluir lançamento" onPress={(event) => { event.stopPropagation(); onDelete(); }} hitSlop={10} style={styles.deleteButton}>
          <Feather name="trash-2" size={15} color={PALETTE.muted} />
        </Pressable>
      ) : null}
    </>
  );
  if (!onEdit) return <View style={styles.row}>{content}</View>;
  return <Pressable onPress={onEdit} style={({ pressed }) => [styles.row, pressed && { opacity: 0.78 }]}>{content}</Pressable>;
}

export function ExpenseClassPill({ label }: { label: string }) {
  return <LabelPill color={PALETTE.muted} pale="#F1F0EA">{label}</LabelPill>;
}

const styles = StyleSheet.create({
  row: { minHeight: 68, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: PALETTE.line, flexDirection: "row", alignItems: "center", gap: 11, paddingVertical: 10 },
  marker: { width: 37, height: 37, borderRadius: 13, alignItems: "center", justifyContent: "center" },
  description: { flex: 1, minWidth: 0, gap: 4 },
  category: { color: PALETTE.ink, fontSize: 13, fontWeight: "700" },
  detailLine: { flexDirection: "row", alignItems: "center", gap: 7 },
  detail: { color: PALETTE.muted, fontSize: 10, maxWidth: 150 },
  classLabel: { color: PALETTE.muted, fontSize: 9, fontWeight: "600" },
  amount: { fontSize: 12, fontWeight: "800", textAlign: "right" },
  deleteButton: { width: 28, height: 32, alignItems: "center", justifyContent: "center" },
});
