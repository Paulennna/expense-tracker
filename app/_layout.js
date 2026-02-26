// // app/auth/_layout.js
// // app/_layout.js
// import { useEffect, useState } from "react";
// import { Stack, useRouter, useSegments, useRootNavigationState } from "expo-router";
// import { StatusBar } from "expo-status-bar";
// import { View } from "react-native";
// import { supabase } from "../lib/supabaseClient";

// export const THEME = {
//   background: "#0F0F23",
//   surface: "#1A1A35",
//   surfaceAlt: "#242440",
//   primary: "#6C63FF",
//   primaryLight: "#8B85FF",
//   accent: "#00D4AA",
//   text: "#FFFFFF",
//   textSecondary: "#94A3B8",
//   textMuted: "#64748B",
//   border: "#2D2D4E",
//   error: "#FF4757",
//   warning: "#FFD93D",
//   success: "#6BCB77",
// };

// export default function RootLayout() {
//   const [session, setSession] = useState(null);
//   const [loading, setLoading] = useState(true);

//   const segments = useSegments();
//   const router = useRouter();
//   const rootNavState = useRootNavigationState();

//   useEffect(() => {
//     supabase.auth.getSession().then(({ data: { session } }) => {
//       setSession(session);
//       setLoading(false);
//     });

//     const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
//       setSession(session);
//     });

//     return () => subscription.unsubscribe();
//   }, []);

//   useEffect(() => {
//     if (!rootNavState?.key) return;
//     if (loading) return;
//     if (!segments?.length) return;

//     const inAuth = segments[0] === "auth";

//     if (!session && !inAuth) router.replace("/auth/sign-in");
//     if (session && inAuth) router.replace("/(tabs)");
//   }, [rootNavState?.key, loading, session, segments]);

//   return (
//     <>
//       <StatusBar style="light" />
//       <Stack screenOptions={{ headerShown: false }} />
//       {loading && (
//         <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: THEME.background }} />
//       )}
//     </>
//   );
// }

// app/_layout.js
import { useEffect, useState } from "react";
import { Stack, useRouter, useSegments, useRootNavigationState } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { View } from "react-native";
import { supabase } from "../lib/supabaseClient";

export const THEME = {
  background: "#0F0F23",
  surface: "#1A1A35",
  surfaceAlt: "#242440",
  primary: "#6C63FF",
  primaryLight: "#8B85FF",
  accent: "#00D4AA",
  text: "#FFFFFF",
  textSecondary: "#94A3B8",
  textMuted: "#64748B",
  border: "#2D2D4E",
  error: "#FF4757",
  warning: "#FFD93D",
  success: "#6BCB77",
};

export default function RootLayout() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  const segments = useSegments();
  const router = useRouter();
  const rootNavState = useRootNavigationState(); // ✅ router readiness signal

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!rootNavState?.key) return;
    if (loading) return;
    if (!segments?.length) return;

    const inAuthGroup = segments[0] === "auth";

    if (!session && !inAuthGroup) router.replace("/auth/sign-in");
    if (session && inAuthGroup) router.replace("/(tabs)");
  }, [loading, session, segments, router, rootNavState?.key]);

  return (
    <>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="auth/sign-in" />
      </Stack>
      <StatusBar style="light" />
      {loading && (
        <View style={{ position: "absolute", inset: 0, backgroundColor: THEME.background }} />
      )}
    </>
  );
}


//     {/* Optional: simple loading overlay so we never return null */}
// {loading && <View style={{ position: "absolute", inset: 0, backgroundColor: THEME.background }} />}
