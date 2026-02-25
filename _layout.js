// app/_layout.js

import { useState, useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { supabase } from '../lib/supabaseClient';

// Theme colors — customize here to change the whole app's color scheme
export const THEME = {
  background: '#0F0F23',    // Deep dark navy
  surface: '#1A1A35',       // Card background
  surfaceAlt: '#242440',    // Elevated card
  primary: '#6C63FF',       // Purple accent
  primaryLight: '#8B85FF',
  accent: '#00D4AA',        // Teal accent for income
  text: '#FFFFFF',
  textSecondary: '#94A3B8',
  textMuted: '#64748B',
  border: '#2D2D4E',
  error: '#FF4757',
  warning: '#FFD93D',
  success: '#6BCB77',
};

/**
 * Custom hook: redirect based on auth state.
 * - If no session → redirect to /auth/sign-in
 * - If session exists → redirect to /(tabs)
 */
useProtectedRoute(session, loading);

  useEffect(() => {
    const inAuthGroup = segments[0] === 'auth';

    if (!session && !inAuthGroup) {
      // No session and not on auth screen — send to sign-in
      router.replace('/auth/sign-in');
    } else if (session && inAuthGroup) {
      // Has session but on auth screen — send to main app
      router.replace('/(tabs)');
    }
  }, [session, segments]);


export default function RootLayout() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  // Need to import useState — fix below
  useEffect(() => {
    // Check for existing session on mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    // Listen for auth state changes (sign in, sign out, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    // Clean up listener on unmount
    return () => subscription.unsubscribe();
  }, []);

  useProtectedRoute(session);

  // Don't render routes until we know the auth state
  if (loading) return null;

  return (
    <>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="auth" />
      </Stack>
    </>
  );
}


