import { useEffect, useMemo, useState } from "react";
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { EXPENSE_CATEGORIES, PALETTE } from "@/lib/budget/categories";
import { parseAmountInput } from "@/lib/budget/input";
import { useBudget } from "@/lib/budget/BudgetProvider";
import type { MonthlyBudget } from "@/lib/budget/types";
import { Chip, Field } from "./primitives";

export function BudgetModal({ visible, onClose, onSave, budget, month }: {
  visible: boolean;
  onClose: () => void;
  onSave: (category: string, amountCents: number) => void;
  budget?: MonthlyBudget | null;
  month: string;
}) {
  const { state } = useBudget();
  const [category, setCategory] = useState("");
  const [amount, setAmount] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!visible) return;
    setCategory(budget?.category ?? "");
    setAmount(budget ? (budget.amountCents / 100).toFixed(2).replace(".", ",") : "");
    setError("");
  }, [visible, budget, month]);

  const suggestions = useMemo(() => [
    ...new Set([
      ...EXPENSE_CATEGORIES,
      ...state.transactions.filter((item) => item.kind === "expense").map((item) => item.category),
      ...state.budgets.map((item) => item.category),
    ]),
  ], [state.transactions, state.budgets]);

  const submit = () => {
    const amountCents = parseAmountInput(amount);
    if (!category.trim()) { setError("Escolha ou escreva uma categoria."); return; }
    if (amountCents === null) { setError("Informe um limite maior que zero, como 800,00."); return; }
    onSave(category.trim(), amountCents);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.backdrop}>
        <KeyboardAvoidingView style={styles.keyboardWrap} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <View style={styles.sheet}>
            <View style={styles.sheetHeader}>
              <View>
                <Text style={styles.eyebrow}>PLANEJAMENTO DO MÊS</Text>
                <Text style={styles.title}>{budget ? "Ajustar limite" : "Novo orçamento"}</Text>
              </View>
              <Pressable accessibilityLabel="Fechar" onPress={onClose} style={styles.closeButton}><Feather name="x" size={20} color={PALETTE.ink} /></Pressable>
            </View>
            <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={styles.form}>
              <Field label="Categoria" value={category} onChangeText={setCategory} placeholder="Escreva uma categoria" editable={!budget} />
              {!budget ? (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
                  {suggestions.map((item) => <Chip key={item} title={item} selected={category.toLocaleLowerCase() === item.toLocaleLowerCase()} onPress={() => setCategory(item)} />)}
                </ScrollView>
              ) : null}
              <Field label="Limite mensal" value={amount} onChangeText={setAmount} placeholder="0,00" keyboardType="decimal-pad" />
              <Text style={styles.helper}>O limite vale apenas para {month} e pode ser ajustado quando quiser.</Text>
              {error ? <Text style={styles.error}>{error}</Text> : null}
              <View style={styles.actions}>
                <Pressable onPress={onClose} style={styles.cancel}><Text style={styles.cancelText}>Cancelar</Text></Pressable>
                <Pressable onPress={submit} style={styles.save}><Feather name="check" size={16} color={PALETTE.white} /><Text style={styles.saveText}>Salvar orçamento</Text></Pressable>
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
  keyboardWrap: { width: "100%", maxWidth: 700, maxHeight: "92%" },
  sheet: { backgroundColor: PALETTE.background, borderTopLeftRadius: 26, borderTopRightRadius: 26, overflow: "hidden", paddingBottom: Platform.OS === "ios" ? 24 : 12 },
  sheetHeader: { paddingHorizontal: 22, paddingTop: 21, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: PALETTE.line, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  eyebrow: { color: PALETTE.green, fontSize: 9, fontWeight: "800", letterSpacing: 1.3 },
  title: { color: PALETTE.ink, fontSize: 21, fontWeight: "700", marginTop: 4 },
  closeButton: { width: 38, height: 38, borderRadius: 13, backgroundColor: PALETTE.surface, alignItems: "center", justifyContent: "center" },
  form: { paddingHorizontal: 22, paddingTop: 17, paddingBottom: 14, gap: 15 },
  chips: { gap: 7, paddingBottom: 2 },
  helper: { color: PALETTE.muted, fontSize: 11, lineHeight: 16 },
  error: { color: PALETTE.terracotta, fontSize: 12, lineHeight: 17, fontWeight: "600" },
  actions: { flexDirection: "row", justifyContent: "flex-end", gap: 10, paddingTop: 3 },
  cancel: { minHeight: 48, justifyContent: "center", paddingHorizontal: 17 },
  cancelText: { color: PALETTE.muted, fontSize: 13, fontWeight: "700" },
  save: { flex: 1, minHeight: 48, flexDirection: "row", gap: 8, alignItems: "center", justifyContent: "center", borderRadius: 14, backgroundColor: PALETTE.green, paddingHorizontal: 16 },
  saveText: { color: PALETTE.white, fontSize: 13, fontWeight: "700" },
});
