import { useEffect, useMemo, useState } from "react";
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { EXPENSE_CATEGORIES, EXPENSE_CLASS_LABELS, INCOME_CATEGORIES, PALETTE } from "@/lib/budget/categories";
import { isISODate, parseAmountInput, todayISODate } from "@/lib/budget/input";
import { useBudget } from "@/lib/budget/BudgetProvider";
import type { ExpenseClass, Transaction, TransactionKind } from "@/lib/budget/types";
import { Chip, Field } from "./primitives";

const EXPENSE_CLASSES: ExpenseClass[] = ["fixed", "variable", "sporadic"];

type DraftTransaction = Omit<Transaction, "id">;

export function TransactionModal({ visible, onClose, onSave, month, transaction }: {
  visible: boolean;
  onClose: () => void;
  onSave: (draft: DraftTransaction, id?: string) => void;
  month: string;
  transaction?: Transaction | null;
}) {
  const { state } = useBudget();
  const [kind, setKind] = useState<TransactionKind>("expense");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(todayISODate());
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [expenseClass, setExpenseClass] = useState<ExpenseClass>("variable");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!visible) return;
    if (transaction) {
      setKind(transaction.kind);
      setAmount((transaction.amountCents / 100).toFixed(2).replace(".", ","));
      setDate(transaction.date);
      setCategory(transaction.category);
      setDescription(transaction.description);
      setExpenseClass(transaction.expenseClass ?? "variable");
    } else {
      const current = todayISODate();
      const defaultDate = current.slice(0, 7) === month ? current : `${month}-01`;
      setKind("expense");
      setAmount("");
      setDate(defaultDate);
      setCategory("");
      setDescription("");
      setExpenseClass("variable");
    }
    setError("");
  }, [visible, transaction, month]);

  const suggestions = useMemo(() => {
    const predefined = kind === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
    const used = state.transactions.filter((item) => item.kind === kind).map((item) => item.category);
    return [...new Set([...predefined, ...used])];
  }, [kind, state.transactions]);

  const submit = () => {
    const amountCents = parseAmountInput(amount);
    if (amountCents === null) { setError("Informe um valor maior que zero, como 125,50."); return; }
    if (!isISODate(date)) { setError("Use uma data válida no formato AAAA-MM-DD."); return; }
    if (!category.trim()) { setError("Escolha ou escreva uma categoria."); return; }
    onSave({
      kind,
      amountCents,
      date,
      category: category.trim(),
      description: description.trim(),
      ...(kind === "expense" ? { expenseClass } : {}),
    }, transaction?.id);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.backdrop}>
        <KeyboardAvoidingView style={styles.keyboardWrap} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <View style={styles.sheet}>
            <View style={styles.sheetHeader}>
              <View>
                <Text style={styles.eyebrow}>LANÇAMENTO DO MÊS</Text>
                <Text style={styles.title}>{transaction ? "Editar lançamento" : "Novo lançamento"}</Text>
              </View>
              <Pressable accessibilityLabel="Fechar" onPress={onClose} style={styles.closeButton}><Feather name="x" size={20} color={PALETTE.ink} /></Pressable>
            </View>
            <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={styles.form}>
              <View style={styles.kindToggle}>
                <Pressable onPress={() => { setKind("expense"); setCategory(""); }} style={[styles.kindOption, kind === "expense" && styles.kindExpenseActive]}>
                  <Text style={[styles.kindText, kind === "expense" && styles.kindTextActive]}>Despesa</Text>
                </Pressable>
                <Pressable onPress={() => { setKind("income"); setCategory(""); }} style={[styles.kindOption, kind === "income" && styles.kindIncomeActive]}>
                  <Text style={[styles.kindText, kind === "income" && styles.kindTextActive]}>Receita</Text>
                </Pressable>
              </View>

              <Field label="Valor" value={amount} onChangeText={setAmount} placeholder="0,00" keyboardType="decimal-pad" returnKeyType="next" />
              <Field label="Data" value={date} onChangeText={setDate} placeholder="AAAA-MM-DD" autoCapitalize="none" />
              <Field label="Descrição (opcional)" value={description} onChangeText={setDescription} placeholder="Ex.: mercado da semana" />

              <Field label="Categoria" value={category} onChangeText={setCategory} placeholder="Escreva uma categoria" />
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
                {suggestions.map((suggestion) => <Chip key={suggestion} title={suggestion} selected={category.toLocaleLowerCase() === suggestion.toLocaleLowerCase()} onPress={() => setCategory(suggestion)} />)}
              </ScrollView>

              {kind === "expense" ? (
                <View style={styles.classSection}>
                  <Text style={styles.fieldLabel}>Tipo de despesa</Text>
                  <View style={styles.classOptions}>
                    {EXPENSE_CLASSES.map((value) => (
                      <Pressable key={value} onPress={() => setExpenseClass(value)} style={[styles.classOption, expenseClass === value && styles.classOptionSelected]}>
                        <Text style={[styles.classOptionText, expenseClass === value && styles.classOptionTextSelected]}>{EXPENSE_CLASS_LABELS[value]}</Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
              ) : null}

              {error ? <Text style={styles.errorText}>{error}</Text> : null}
              <View style={styles.actions}>
                <Pressable onPress={onClose} style={styles.cancelButton}><Text style={styles.cancelText}>Cancelar</Text></Pressable>
                <Pressable onPress={submit} style={styles.saveButton}><Feather name="check" size={16} color={PALETTE.white} /><Text style={styles.saveText}>Salvar lançamento</Text></Pressable>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(18, 30, 24, 0.42)", justifyContent: "flex-end", alignItems: "center" },
  keyboardWrap: { width: "100%", maxWidth: 700, maxHeight: "94%" },
  sheet: { backgroundColor: PALETTE.background, borderTopLeftRadius: 26, borderTopRightRadius: 26, overflow: "hidden", paddingBottom: Platform.OS === "ios" ? 24 : 12 },
  sheetHeader: { paddingHorizontal: 22, paddingTop: 21, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: PALETTE.line, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  eyebrow: { color: PALETTE.green, fontSize: 9, fontWeight: "800", letterSpacing: 1.3 },
  title: { color: PALETTE.ink, fontSize: 21, fontWeight: "700", marginTop: 4 },
  closeButton: { width: 38, height: 38, borderRadius: 13, backgroundColor: PALETTE.surface, alignItems: "center", justifyContent: "center" },
  form: { paddingHorizontal: 22, paddingTop: 16, paddingBottom: 14, gap: 15 },
  kindToggle: { flexDirection: "row", gap: 8, padding: 4, borderRadius: 14, backgroundColor: "#EBE9E1" },
  kindOption: { flex: 1, minHeight: 41, alignItems: "center", justifyContent: "center", borderRadius: 11 },
  kindExpenseActive: { backgroundColor: PALETTE.terracotta },
  kindIncomeActive: { backgroundColor: PALETTE.green },
  kindText: { color: PALETTE.muted, fontSize: 13, fontWeight: "700" },
  kindTextActive: { color: PALETTE.white },
  chipRow: { gap: 7, paddingBottom: 2 },
  classSection: { gap: 9 },
  fieldLabel: { color: PALETTE.ink, fontSize: 12, fontWeight: "700" },
  classOptions: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
  classOption: { minHeight: 37, justifyContent: "center", paddingHorizontal: 12, borderRadius: 11, borderWidth: 1, borderColor: PALETTE.line, backgroundColor: PALETTE.surface },
  classOptionSelected: { borderColor: PALETTE.green, backgroundColor: PALETTE.greenPale },
  classOptionText: { color: PALETTE.muted, fontSize: 11, fontWeight: "600" },
  classOptionTextSelected: { color: PALETTE.green, fontWeight: "800" },
  errorText: { color: PALETTE.terracotta, fontSize: 12, lineHeight: 17, fontWeight: "600" },
  actions: { flexDirection: "row", justifyContent: "flex-end", gap: 10, paddingTop: 3 },
  cancelButton: { minHeight: 48, alignItems: "center", justifyContent: "center", paddingHorizontal: 17 },
  cancelText: { color: PALETTE.muted, fontSize: 13, fontWeight: "700" },
  saveButton: { flex: 1, minHeight: 48, flexDirection: "row", gap: 8, alignItems: "center", justifyContent: "center", borderRadius: 14, backgroundColor: PALETTE.green, paddingHorizontal: 16 },
  saveText: { color: PALETTE.white, fontSize: 13, fontWeight: "700" },
});
