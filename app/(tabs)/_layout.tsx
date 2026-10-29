import { Feather } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { HapticTab } from "@/components/haptic-tab";
import { BudgetProvider } from "@/lib/budget/BudgetProvider";
import { PALETTE } from "@/lib/budget/categories";

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const bottomPadding = Platform.OS === "web" ? 10 : Math.max(insets.bottom, 8);

  return (
    <BudgetProvider>
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: PALETTE.green,
          tabBarInactiveTintColor: PALETTE.muted,
          headerShown: false,
          tabBarButton: HapticTab,
          tabBarLabelStyle: { fontSize: 10, fontWeight: "700", marginTop: 1 },
          tabBarStyle: {
            paddingTop: 7,
            paddingBottom: bottomPadding,
            height: 57 + bottomPadding,
            backgroundColor: PALETTE.surface,
            borderTopColor: PALETTE.line,
            borderTopWidth: 1,
          },
        }}
      >
        <Tabs.Screen name="index" options={{ title: "Resumo", tabBarIcon: ({ color }) => <Feather name="pie-chart" size={19} color={color} /> }} />
        <Tabs.Screen name="transactions" options={{ title: "Lançamentos", tabBarIcon: ({ color }) => <Feather name="list" size={19} color={color} /> }} />
        <Tabs.Screen name="budgets" options={{ title: "Orçamentos", tabBarIcon: ({ color }) => <Feather name="target" size={19} color={color} /> }} />
        <Tabs.Screen name="data" options={{ title: "Dados", tabBarIcon: ({ color }) => <Feather name="database" size={19} color={color} /> }} />
      </Tabs>
    </BudgetProvider>
  );
}
