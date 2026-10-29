import { useState } from "react";
import { Alert, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { ActionButton, PageHeading, PageScroll, SectionTitle, Surface } from "@/components/budget/primitives";
import { useBudget } from "@/lib/budget/BudgetProvider";
import { PALETTE } from "@/lib/budget/categories";
import { formatDate, formatMoney } from "@/lib/budget/calculations";
import { exportCsv, parseCsv } from "@/lib/budget/csv";

type ParsedImport = ReturnType<typeof parseCsv>;

export default function DataScreen() {
  const { state, importData } = useBudget();
  const [pending, setPending] = useState<ParsedImport | null>(null);
  const [status, setStatus] = useState<{ tone: "success" | "error" | "info"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const exportData = async () => {
    setStatus(null);
    setBusy(true);
    try {
      const csv = exportCsv(state);
      const filename = `meu-orcamento-${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}.csv`;
      if (Platform.OS === "web") {
        const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = filename;
        anchor.click();
        URL.revokeObjectURL(url);
      } else {
        if (!FileSystem.cacheDirectory) throw new Error("A pasta temporária do dispositivo não está disponível.");
        const uri = `${FileSystem.cacheDirectory}${filename}`;
        await FileSystem.writeAsStringAsync(uri, csv);
        const available = await Sharing.isAvailableAsync();
        if (!available) throw new Error("O compartilhamento de arquivos não está disponível neste dispositivo.");
        await Sharing.shareAsync(uri);
      }
      setStatus({ tone: "success", text: "CSV preparado. O arquivo contém lançamentos e limites mensais." });
    } catch (error) {
      setStatus({ tone: "error", text: error instanceof Error ? error.message : "Não foi possível exportar o arquivo CSV." });
    } finally {
      setBusy(false);
    }
  };

  const chooseFile = async () => {
    setStatus(null);
    setPending(null);
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["text/csv", "text/comma-separated-values", "application/vnd.ms-excel", "text/plain"],
        copyToCacheDirectory: true,
      });
      if (result.canceled || !result.assets?.length) return;
      const asset = result.assets[0];
      const content = Platform.OS === "web" && asset.file
        ? await asset.file.text()
        : await FileSystem.readAsStringAsync(asset.uri);
      const parsed = parseCsv(content);
      setPending(parsed);
      setStatus(parsed.validCount
        ? { tone: "info", text: `${parsed.validCount} linha${parsed.validCount === 1 ? " válida" : "s válidas"} pronta${parsed.validCount === 1 ? "" : "s"} para revisar.` }
        : { tone: "error", text: "Não encontramos linhas válidas. Confira os erros e escolha outro arquivo." });
    } catch (error) {
      setStatus({ tone: "error", text: error instanceof Error ? error.message : "Não foi possível ler o CSV selecionado." });
    }
  };

  const confirmImport = () => {
    if (!pending || pending.validCount === 0) return;
    const result = importData({ transactions: pending.transactions, budgets: pending.budgets });
    setStatus({
      tone: "success",
      text: `${result.addedTransactions} lançamento${result.addedTransactions === 1 ? "" : "s"} e ${result.addedBudgets} orçamento${result.addedBudgets === 1 ? "" : "s"} importado${result.addedTransactions + result.addedBudgets === 1 ? "" : "s"}${result.duplicates ? `; ${result.duplicates} duplicado${result.duplicates === 1 ? " ignorado" : "s ignorados"}` : ""}.`,
    });
    setPending(null);
  };

  return (
    <PageScroll>
      <PageHeading eyebrow="SEUS DADOS" title="Importar e exportar" subtitle="Leve seus registros em CSV, sem sair do controle." />

      <Surface style={styles.privacyCard}>
        <View style={styles.privacyIcon}><Feather name="lock" size={17} color={PALETTE.green} /></View>
        <View style={styles.privacyCopy}>
          <Text style={styles.privacyTitle}>Só neste navegador ou dispositivo</Text>
          <Text style={styles.privacyText}>Não há conta nem sincronização em nuvem. Se limpar os dados do navegador ou trocar de dispositivo, use a exportação CSV para guardar uma cópia.</Text>
        </View>
      </Surface>

      <View style={styles.section}>
        <SectionTitle title="Cópia dos seus dados" caption="O arquivo inclui movimentações e limites mensais." />
        <Surface style={styles.actionCard}>
          <View style={styles.actionIntro}>
            <View style={styles.fileIcon}><Feather name="download" size={18} color={PALETTE.green} /></View>
            <View style={styles.actionCopy}>
              <Text style={styles.actionTitle}>Exportar para CSV</Text>
              <Text style={styles.actionDetail}>{state.transactions.length} lançamentos · {state.budgets.length} limites</Text>
            </View>
          </View>
          <ActionButton title={busy ? "Preparando…" : "Baixar arquivo CSV"} icon="download" onPress={exportData} disabled={busy} />
        </Surface>
      </View>

      <View style={styles.section}>
        <SectionTitle title="Trazer um arquivo" caption="Revise as linhas antes de adicioná-las aos seus dados locais." />
        <Surface style={styles.actionCard}>
          <View style={styles.actionIntro}>
            <View style={[styles.fileIcon, { backgroundColor: "#F4EEE1" }]}><Feather name="upload" size={18} color={PALETTE.gold} /></View>
            <View style={styles.actionCopy}>
              <Text style={styles.actionTitle}>Importar CSV</Text>
              <Text style={styles.actionDetail}>Reconhece movimentos e orçamentos exportados pelo app.</Text>
            </View>
          </View>
          <ActionButton title="Escolher arquivo" icon="folder" variant="secondary" onPress={chooseFile} />
        </Surface>
      </View>

      {status ? (
        <View style={[styles.statusBox, status.tone === "success" ? styles.statusSuccess : status.tone === "error" ? styles.statusError : styles.statusInfo]}>
          <Feather name={status.tone === "success" ? "check-circle" : status.tone === "error" ? "alert-circle" : "info"} size={17} color={status.tone === "success" ? PALETTE.green : status.tone === "error" ? PALETTE.terracotta : PALETTE.gold} />
          <Text style={styles.statusText}>{status.text}</Text>
        </View>
      ) : null}

      {pending ? (
        <View style={styles.section}>
          <SectionTitle title="Prévia da importação" caption={`${pending.validCount} linhas válidas · ${pending.errors.length} problemas`} />
          <Surface style={styles.previewCard}>
            {pending.errors.length ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorTitle}>Algumas linhas precisam de atenção</Text>
                {pending.errors.slice(0, 4).map((error, index) => <Text key={`${error}-${index}`} style={styles.errorLine}>• {error}</Text>)}
                {pending.errors.length > 4 ? <Text style={styles.errorLine}>e mais {pending.errors.length - 4} problema(s)</Text> : null}
                {pending.validCount ? <Text style={styles.partialNote}>Somente as linhas válidas serão adicionadas se você confirmar.</Text> : null}
              </View>
            ) : null}
            {pending.previewRows.slice(0, 6).map((row, index) => (
              <View key={`${row.kind}-${index}`} style={styles.previewRow}>
                <View style={styles.previewCopy}>
                  <Text style={styles.previewTitle}>{row.label}</Text>
                  <Text style={styles.previewMeta}>{row.kind === "budget" ? `Orçamento · ${row.category} · ${row.date}` : `${row.transactionKind === "income" ? "Receita" : "Despesa"} · ${row.category} · ${formatDate(row.date)}`}</Text>
                </View>
                <Text style={[styles.previewAmount, row.transactionKind === "income" ? { color: PALETTE.green } : null]}>{row.transactionKind === "income" ? "+ " : row.kind === "transaction" ? "− " : ""}{formatMoney(row.amountCents)}</Text>
              </View>
            ))}
            {pending.previewRows.length > 6 ? <Text style={styles.moreRows}>+ {pending.previewRows.length - 6} linhas na importação</Text> : null}
            <View style={styles.previewActions}>
              <Pressable onPress={() => { setPending(null); setStatus(null); }} style={styles.cancelButton}><Text style={styles.cancelText}>Cancelar</Text></Pressable>
              <Pressable disabled={!pending.validCount} onPress={confirmImport} style={[styles.confirmButton, !pending.validCount && { opacity: 0.45 }]}>
                <Feather name="check" size={15} color={PALETTE.white} /><Text style={styles.confirmText}>Confirmar importação</Text>
              </Pressable>
            </View>
          </Surface>
        </View>
      ) : null}

      <Surface style={styles.formatCard}>
        <Text style={styles.formatTitle}>Formato esperado</Text>
        <Text style={styles.formatText}>Cabeçalhos: registro, data, tipo, valor, categoria, descrição e classeDespesa. Também aceita CSV simples com data, tipo, valor e categoria. Para despesas, a classe pode ser fixa, variável ou esporádica.</Text>
      </Surface>
      <Text style={styles.footer}>Importar ou exportar não envia seus dados a nenhum serviço remoto.</Text>
    </PageScroll>
  );
}

const styles = StyleSheet.create({
  privacyCard: { flexDirection: "row", alignItems: "flex-start", gap: 12, backgroundColor: "#EDF3EE", borderColor: "#DDE9DF" },
  privacyIcon: { width: 34, height: 34, borderRadius: 12, backgroundColor: "#DDECE0", alignItems: "center", justifyContent: "center" },
  privacyCopy: { flex: 1, gap: 4 },
  privacyTitle: { color: PALETTE.ink, fontSize: 13, fontWeight: "800" },
  privacyText: { color: PALETTE.muted, fontSize: 11, lineHeight: 17 },
  section: { gap: 11 },
  actionCard: { gap: 15 },
  actionIntro: { flexDirection: "row", alignItems: "center", gap: 12 },
  fileIcon: { width: 39, height: 39, borderRadius: 13, backgroundColor: PALETTE.greenPale, alignItems: "center", justifyContent: "center" },
  actionCopy: { flex: 1, gap: 3 },
  actionTitle: { color: PALETTE.ink, fontSize: 14, fontWeight: "700" },
  actionDetail: { color: PALETTE.muted, fontSize: 11, lineHeight: 16 },
  statusBox: { flexDirection: "row", alignItems: "flex-start", gap: 9, borderRadius: 14, padding: 13 },
  statusSuccess: { backgroundColor: PALETTE.greenPale },
  statusError: { backgroundColor: PALETTE.terracottaPale },
  statusInfo: { backgroundColor: "#F4EEE1" },
  statusText: { flex: 1, color: PALETTE.ink, fontSize: 11, lineHeight: 17 },
  previewCard: { gap: 9 },
  previewRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: PALETTE.line, paddingVertical: 9 },
  previewCopy: { flex: 1, gap: 3 },
  previewTitle: { color: PALETTE.ink, fontSize: 12, fontWeight: "700" },
  previewMeta: { color: PALETTE.muted, fontSize: 10 },
  previewAmount: { color: PALETTE.ink, fontSize: 12, fontWeight: "800" },
  moreRows: { color: PALETTE.muted, fontSize: 10, paddingTop: 3 },
  errorBox: { backgroundColor: PALETTE.terracottaPale, borderRadius: 13, padding: 12, gap: 5, marginBottom: 2 },
  errorTitle: { color: PALETTE.terracotta, fontSize: 11, fontWeight: "800" },
  errorLine: { color: PALETTE.ink, fontSize: 10, lineHeight: 15 },
  partialNote: { color: PALETTE.terracotta, fontSize: 10, lineHeight: 15, fontWeight: "600", marginTop: 3 },
  previewActions: { flexDirection: "row", alignItems: "center", justifyContent: "flex-end", gap: 8, paddingTop: 9 },
  cancelButton: { minHeight: 44, justifyContent: "center", paddingHorizontal: 12 },
  cancelText: { color: PALETTE.muted, fontWeight: "700", fontSize: 12 },
  confirmButton: { minHeight: 44, borderRadius: 13, paddingHorizontal: 14, backgroundColor: PALETTE.green, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7 },
  confirmText: { color: PALETTE.white, fontSize: 11, fontWeight: "700" },
  formatCard: { backgroundColor: "#F0EFE8", borderColor: "#E7E5DD", gap: 5 },
  formatTitle: { color: PALETTE.ink, fontSize: 11, fontWeight: "800" },
  formatText: { color: PALETTE.muted, fontSize: 10, lineHeight: 16 },
  footer: { color: PALETTE.muted, fontSize: 10, lineHeight: 15, textAlign: "center", paddingHorizontal: 14, paddingBottom: 8 },
});
