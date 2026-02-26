// app/(tabs)/settings.js
import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, ScrollView } from "react-native";
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { supabase } from '../../lib/supabaseClient';
import {
  createLinkToken,
  exchangePublicToken,
  syncTransactions,
  getBankConnections,
  deleteBankConnection,
} from '../../lib/api';
import { THEME } from '../_layout';

export default function SettingsScreen() {
  const [connections, setConnections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [linking, setLinking] = useState(false);
  const [syncing, setSyncing] = useState({});

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const data = await getBankConnections();
      setConnections(data || []);
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleConnectBank() {
    setLinking(true);
    try {
      // 1. Get Link Token from Supabase Edge Function
      const { link_token } = await createLinkToken();

      // 2. Open Hosted Link URL using expo-web-browser
      // Plaid Sandbox Hosted Link format:
      const redirectUri = Linking.createURL('/oauth'); // Current app scheme
      const hostedUrl = `https://cdn.plaid.com/link/v2/stable/link.html?isWebview=true&token=${link_token}&redirect_uri=${encodeURIComponent(redirectUri)}`;

      const result = await WebBrowser.openAuthSessionAsync(hostedUrl, redirectUri);

      if (result.type === 'success' && result.url) {
        // Parse the public_token from the redirected URL
        const urlObj = new URL(result.url);
        const publicToken = urlObj.searchParams.get('public_token');
        const status = urlObj.searchParams.get('status');

        if (publicToken) {
          // 3. Exchange public token for access token
          await exchangePublicToken(publicToken, { institution: { name: 'Plaid Sandbox Bank' } });
          Alert.alert('Success', 'Bank account connected successfully!');
          await loadData();
        } else if (status !== 'exit') {
          Alert.alert('Cancelled', 'Bank connection was cancelled.');
        }
      }
    } catch (err) {
      console.error(err);
      Alert.alert('Bank Connection Failed', err.message);
    } finally {
      setLinking(false);
    }
  }

  async function handleSync(connectionId) {
    setSyncing((prev) => ({ ...prev, [connectionId]: true }));
    try {
      const result = await syncTransactions(connectionId);
      const added = result.added || 0;
      Alert.alert('Sync Complete', `Added ${added} new transactions.`);
      await loadData(); // Reload connections (for last_synced_at)
    } catch (err) {
      Alert.alert('Sync Failed', err.message);
    } finally {
      setSyncing((prev) => ({ ...prev, [connectionId]: false }));
    }
  }

  async function handleDelete(connectionId) {
    try {
      await deleteBankConnection(connectionId);
      await loadData();
    } catch (err) {
      Alert.alert('Error', err.message);
    }
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Settings</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Bank Connections</Text>

          {loading ? (
            <ActivityIndicator color={THEME.primary} />
          ) : connections.length === 0 ? (
            <Text style={styles.emptyText}>No bank accounts connected yet.</Text>
          ) : (
            connections.map(conn => (
              <View key={conn.id} style={styles.connectionCard}>
                <View style={styles.connHeader}>
                  <Ionicons name="business" size={24} color={THEME.primary} />
                  <Text style={styles.connName}>{conn.institution_name}</Text>
                  <TouchableOpacity onPress={() => handleDelete(conn.id)}>
                    <Ionicons name="trash-outline" size={20} color={THEME.error} />
                  </TouchableOpacity>
                </View>
                <Text style={styles.connDate}>Last Synced: {conn.last_synced_at ? new Date(conn.last_synced_at).toLocaleString() : 'Never'}</Text>
                <TouchableOpacity
                  style={styles.syncBtn}
                  onPress={() => handleSync(conn.id)}
                  disabled={syncing[conn.id]}
                >
                  {syncing[conn.id] ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.syncBtnText}>Sync Transactions</Text>
                  )}
                </TouchableOpacity>
              </View>
            ))
          )}

          <TouchableOpacity style={styles.button} onPress={handleConnectBank} disabled={linking}>
            {linking ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Connect a Bank Account</Text>}
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <TouchableOpacity style={[styles.button, styles.logoutBtn]} onPress={handleSignOut}>
            <Text style={styles.buttonText}>Sign Out</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: THEME.background },
  header: { padding: 20 },
  headerTitle: { fontSize: 28, fontWeight: '700', color: THEME.text },
  content: { padding: 20 },
  section: { marginBottom: 30 },
  sectionTitle: { fontSize: 18, color: THEME.text, marginBottom: 15, fontWeight: '600' },
  emptyText: { color: THEME.textMuted, marginBottom: 15 },
  connectionCard: {
    backgroundColor: THEME.surface, borderRadius: 12, padding: 16, marginBottom: 15,
    borderWidth: 1, borderColor: THEME.border
  },
  connHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  connName: { flex: 1, color: THEME.text, fontSize: 16, fontWeight: '600', marginLeft: 10 },
  connDate: { color: THEME.textSecondary, fontSize: 12, marginBottom: 15 },
  syncBtn: { backgroundColor: THEME.primary, borderRadius: 8, padding: 10, alignItems: 'center' },
  syncBtnText: { color: '#fff', fontWeight: 'bold' },
  button: {
    backgroundColor: THEME.primary, borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 10
  },
  logoutBtn: { backgroundColor: THEME.error },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' }
});