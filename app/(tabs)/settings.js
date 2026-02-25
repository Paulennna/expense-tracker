// // app/(tabs)/settings.js

// import { supabase } from '../../lib/supabaseClient';
// import {
//   createLinkToken,
//   createHostedLinkUrl,
//   syncTransactions,
//   getBankConnections,
//   deleteBankConnection,
// } from '../../lib/api';
// import { THEME } from '../_layout';

// // ...

// async function handleSync(connectionId) {
//   setSyncing((prev) => ({ ...prev, [connectionId]: true }));
//   try {
//     const result = await syncTransactions(connectionId);
//     const added = result.added || 0;
//     Alert.alert('Sync Complete', `Added ${added} new transactions.`);
//     await loadData();
//   } catch (err) {
//     Alert.alert('Sync Failed', err.message);
//   } finally {
//     setSyncing((prev) => ({ ...prev, [connectionId]: false }));
//   }
// }
// export default function SettingsScreen() {
//   return (
//     <View>
//       <Text>Settings</Text>
//     </View>
//   );
// }

// app/(tabs)/settings.js
import React from "react";
import { View, Text } from "react-native";
import { THEME } from "../_layout";

export default function SettingsScreen() {
  return (
    <View style={{ flex: 1, backgroundColor: THEME.background, justifyContent: "center", alignItems: "center" }}>
      <Text style={{ color: THEME.text, fontSize: 18, fontWeight: "600" }}>Settings</Text>
      <Text style={{ color: THEME.textSecondary, marginTop: 8 }}>Screen mounted ✅</Text>
    </View>
  );
}