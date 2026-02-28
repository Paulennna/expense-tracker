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
import * as Linking from 'expo-linking';
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

  // Global Deep Link Listener - Bypasses Expo Router entirely
  useEffect(() => {
    const handleDeepLink = async (url) => {
      if (!url) return;
      console.log("[Global Link Listener] URL:", url);

      if (url.includes('access_token=') && url.includes('refresh_token=')) {
        console.log("[Global Link Listener] Extracting tokens...");
        let access_token = null;
        let refresh_token = null;
        const match = url.match(/#(.+)/);
        if (match) {
          const params = match[1].split('&');
          params.forEach(param => {
            const [key, val] = param.split('=');
            if (key === 'access_token') access_token = val;
            if (key === 'refresh_token') refresh_token = val;
          });
        }

        if (access_token && refresh_token) {
          const { error } = await supabase.auth.setSession({ access_token, refresh_token });
          if (error) console.error("Session set error:", error);
        }
      }
    };

    Linking.getInitialURL().then(handleDeepLink);
    const sub = Linking.addEventListener('url', ({ url }) => handleDeepLink(url));
    return () => sub.remove();
  }, []);

  // Standard Routing Guard
  useEffect(() => {
    if (!rootNavState?.key || loading) return;

    const path = segments.join("/");
    const inAuthGroup = path.startsWith("auth");
    const inCallback = path === "auth/callback";

    if (!session && !inAuthGroup && !inCallback) {
      router.replace("/auth/sign-in");
    }
    if (session && inAuthGroup && !inCallback) {
      router.replace("/(tabs)");
    }
  }, [loading, session, segments, router, rootNavState?.key]);

  return (
    <>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="auth" />
        <Stack.Screen name="index" />
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
