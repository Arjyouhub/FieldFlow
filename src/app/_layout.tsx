import { useEffect } from "react";
import { Stack } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import * as Updates from "expo-updates";

export default function RootLayout() {
  useEffect(() => {
    async function checkProductionUpdates() {
      // Updates are disabled in development mode and Expo Go
      if (__DEV__ || !Updates.isEnabled) {
        return;
      }
      try {
        const update = await Updates.checkForUpdateAsync();
        if (update.isAvailable) {
          await Updates.fetchUpdateAsync();
          await Updates.reloadAsync();
        }
      } catch (error) {
        console.log("[EAS Update] Background check completed:", error);
      }
    }

    checkProductionUpdates();
  }, []);

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerShown: false,
        }}
      />
    </SafeAreaProvider>
  );
}