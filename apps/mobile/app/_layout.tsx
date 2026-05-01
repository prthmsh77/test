import { Stack } from "expo-router";
import { useEffect } from "react";
import { useAuthStore } from "../src/store/authStore";

export default function RootLayout() {
  const loadToken = useAuthStore((s) => s.loadToken);
  const isHydrated = useAuthStore((s) => s.isHydrated);

  useEffect(() => {
    loadToken();
  }, [loadToken]);

  if (!isHydrated) {
    return null; // Or a splash screen / loading spinner
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: "#000" },
        animation: "slide_from_right",
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="login" />
      <Stack.Screen name="otp" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen
        name="trek/create"
        options={{ presentation: "modal", animation: "slide_from_bottom" }}
      />
      <Stack.Screen
        name="trek/active"
        options={{ presentation: "modal", animation: "slide_from_bottom" }}
      />
      <Stack.Screen
        name="trek/sos"
        options={{ presentation: "modal", animation: "fade" }}
      />
      <Stack.Screen
        name="settings/emergency-contacts"
        options={{ presentation: "modal", animation: "slide_from_bottom" }}
      />
      <Stack.Screen
        name="settings/trek-pin"
        options={{ presentation: "modal", animation: "slide_from_bottom" }}
      />
    </Stack>
  );
}
