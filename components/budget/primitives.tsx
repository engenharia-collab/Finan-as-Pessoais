import type { PropsWithChildren, ReactNode } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View, type StyleProp, type TextInputProps, type ViewStyle } from "react-native";
import { Feather } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useBudget } from "@/lib/budget/BudgetProvider";
import { PALETTE } from "@/lib/budget/categories";
import { formatMonthLabel, shiftMonth } from "@/lib/budget/calculations";

export function PageScroll({ children }: PropsWithChildren) {
  return (
    <View style={styles.screen}>
      <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.content}>{children}</View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

export function PageHeading({ eyebrow, title, subtitle, action }: { eyebrow: string; title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <View style={styles.headingRow}>
      <View style={styles.headingText}>
        <Text style={styles.eyebrow}>{eyebrow.toLocaleUpperCase("pt-BR")}</Text>
        <Text style={styles.pageTitle}>{title}</Text>
        {subtitle ? <Text style={styles.pageSubtitle}>{subtitle}</Text> : null}
      </View>
      {action}
    </View>
  );
}

export function MonthNavigation() {
  const { selectedMonth, setSelectedMonth } = useBudget();
  return (
    <View style={styles.monthBar}>
      <Pressable accessibilityLabel="Mês anterior" onPress={() => setSelectedMonth(shiftMonth(selectedMonth, -1))} style={styles.monthArrow}>
        <Feather name="chevron-left" size={20} color={PALETTE.ink} />
      </Pressable>
      <View style={styles.monthLabelWrap}>
        <Feather name="calendar" size={15} color={PALETTE.green} />
        <Text style={styles.monthLabel}>{formatMonthLabel(selectedMonth)}</Text>
      </View>
      <Pressable accessibilityLabel="Próximo mês" onPress={() => setSelectedMonth(shiftMonth(selectedMonth, 1))} style={styles.monthArrow}>
        <Feather name="chevron-right" size={20} color={PALETTE.ink} />
      </Pressable>
    </View>
  );
}

export function SectionTitle({ title, caption, action }: { title: string; caption?: string; action?: ReactNode }) {
  return (
    <View style={styles.sectionHeading}>
      <View style={styles.sectionText}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {caption ? <Text style={styles.sectionCaption}>{caption}</Text> : null}
      </View>
      {action}
    </View>
  );
}

export function Surface({ children, style, testID }: PropsWithChildren<{ style?: object; testID?: string }>) {
  return <View testID={testID} style={[styles.surface, style]}>{children}</View>;
}

export function LabelPill({ children, color = PALETTE.green, pale = PALETTE.greenPale }: { children: ReactNode; color?: string; pale?: string }) {
  return (
    <View style={[styles.pill, { backgroundColor: pale }]}>
      <Text style={[styles.pillText, { color }]}>{children}</Text>
    </View>
  );
}

export function ActionButton({ title, onPress, icon, variant = "primary", disabled = false, compact = false }: {
  title: string;
  onPress: () => void;
  icon?: keyof typeof Feather.glyphMap;
  variant?: "primary" | "secondary" | "quiet" | "danger";
  disabled?: boolean;
  compact?: boolean;
}) {
  const color = variant === "primary" ? PALETTE.white : variant === "danger" ? PALETTE.terracotta : PALETTE.green;
  const backgroundColor = variant === "primary" ? PALETTE.green : variant === "danger" ? PALETTE.terracottaPale : variant === "secondary" ? PALETTE.greenPale : "transparent";
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.actionButton, compact && styles.actionButtonCompact, { backgroundColor, opacity: disabled ? 0.45 : pressed ? 0.82 : 1 }]}
    >
      {icon ? <Feather name={icon} size={compact ? 15 : 17} color={color} /> : null}
      <Text style={[styles.actionButtonText, { color }, compact && styles.actionButtonTextCompact]}>{title}</Text>
    </Pressable>
  );
}

export function Chip({ title, selected, onPress, color = PALETTE.green }: { title: string; selected: boolean; onPress: () => void; color?: string }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.chip, selected ? { backgroundColor: color, borderColor: color } : null, pressed && { opacity: 0.78 }]}>
      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{title}</Text>
    </Pressable>
  );
}

export function Field({ label, hint, style, wrapperStyle, ...props }: TextInputProps & { label: string; hint?: string; wrapperStyle?: StyleProp<ViewStyle> }) {
  return (
    <View style={[styles.fieldWrap, wrapperStyle]}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        {...props}
        placeholderTextColor={PALETTE.muted}
        style={[styles.input, props.multiline && styles.multilineInput, style]}
      />
      {hint ? <Text style={styles.fieldHint}>{hint}</Text> : null}
    </View>
  );
}

export function EmptyNote({ icon, title, detail }: { icon: keyof typeof Feather.glyphMap; title: string; detail: string }) {
  return (
    <View style={styles.emptyNote}>
      <View style={styles.emptyIcon}><Feather name={icon} size={19} color={PALETTE.green} /></View>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyDetail}>{detail}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: PALETTE.background },
  safe: { flex: 1 },
  scrollContent: { alignItems: "center", flexGrow: 1, paddingBottom: 30 },
  content: { width: "100%", maxWidth: 820, paddingHorizontal: 22, paddingTop: 18, gap: 22 },
  headingRow: { minHeight: 62, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  headingText: { flex: 1, gap: 3 },
  eyebrow: { color: PALETTE.green, fontSize: 10, fontWeight: "800", letterSpacing: 1.55 },
  pageTitle: { color: PALETTE.ink, fontSize: 29, lineHeight: 34, fontWeight: "700", letterSpacing: -0.8 },
  pageSubtitle: { color: PALETTE.muted, fontSize: 13, lineHeight: 19, marginTop: 2 },
  monthBar: { minHeight: 48, backgroundColor: "#EFEEE7", borderRadius: 15, padding: 4, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  monthArrow: { width: 38, height: 38, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  monthLabelWrap: { flexDirection: "row", alignItems: "center", gap: 9 },
  monthLabel: { color: PALETTE.ink, fontWeight: "700", fontSize: 15, textTransform: "capitalize" },
  sectionHeading: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 3 },
  sectionText: { flex: 1, gap: 3 },
  sectionTitle: { color: PALETTE.ink, fontSize: 18, fontWeight: "700", letterSpacing: -0.3 },
  sectionCaption: { color: PALETTE.muted, fontSize: 12, lineHeight: 17 },
  surface: { borderRadius: 20, backgroundColor: PALETTE.surface, borderWidth: 1, borderColor: PALETTE.line, padding: 17 },
  pill: { borderRadius: 30, paddingHorizontal: 10, paddingVertical: 5, alignSelf: "flex-start" },
  pillText: { fontSize: 10, fontWeight: "800", letterSpacing: 0.2 },
  actionButton: { minHeight: 48, borderRadius: 15, paddingHorizontal: 17, flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 9 },
  actionButtonCompact: { minHeight: 37, borderRadius: 12, paddingHorizontal: 12, gap: 7 },
  actionButtonText: { fontSize: 14, fontWeight: "700" },
  actionButtonTextCompact: { fontSize: 12 },
  chip: { borderRadius: 20, borderWidth: 1, borderColor: PALETTE.line, paddingHorizontal: 13, paddingVertical: 9, backgroundColor: PALETTE.surface },
  chipText: { color: PALETTE.ink, fontWeight: "600", fontSize: 12 },
  chipTextSelected: { color: PALETTE.white },
  fieldWrap: { gap: 7 },
  fieldLabel: { color: PALETTE.ink, fontSize: 12, fontWeight: "700" },
  input: { minHeight: 49, borderRadius: 13, borderWidth: 1, borderColor: PALETTE.line, backgroundColor: PALETTE.surface, paddingHorizontal: 14, color: PALETTE.ink, fontSize: 15 },
  multilineInput: { minHeight: 84, paddingTop: 12, textAlignVertical: "top" },
  fieldHint: { fontSize: 11, color: PALETTE.muted, lineHeight: 16 },
  emptyNote: { alignItems: "center", paddingHorizontal: 20, paddingVertical: 28, gap: 8 },
  emptyIcon: { width: 42, height: 42, borderRadius: 14, backgroundColor: PALETTE.greenPale, alignItems: "center", justifyContent: "center", marginBottom: 2 },
  emptyTitle: { color: PALETTE.ink, fontSize: 15, fontWeight: "700", textAlign: "center" },
  emptyDetail: { color: PALETTE.muted, fontSize: 12, lineHeight: 18, textAlign: "center", maxWidth: 300 },
});
