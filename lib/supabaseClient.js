// lib/supabaseClient.js


import 'react-native-url-polyfill/auto'; // Required for Supabase to work in React Native
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

// if (!supabaseUrl || !supabaseAnonKey) {
//   throw new Error(
//     'Missing Supabase environment variables. Check your .env file and make sure ' +
//     'EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY are set.'
//   );
// }
if (!supabaseUrl || !supabaseAnonKey) {
  console.warn("Missing ENV vars");
}


export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,          // Persist session in device storage
    autoRefreshToken: true,         // Auto-refresh JWTs before they expire
    persistSession: true,           // Keep session across app restarts
    detectSessionInUrl: false,      // Required for React Native (no URL-based session detection)
  },
});
