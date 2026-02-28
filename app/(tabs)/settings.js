// app/(tabs)/settings.js
import React, { useState, useEffect, useCallback } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, ScrollView, Platform } from "react-native";
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

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
  const [linkToken, setLinkToken] = useState(null);

  // Web-specific Button Component to isolate the Plaid Link hook
  const WebPlaidButton = ({ token, onSuccess }) => {
    // Only import the hook on web to avoid native bundler issues
    const { usePlaidLink } = require('react-plaid-link');

    useEffect(() => {
      console.log("WebPlaidButton Rendered with token:", token ? "YES" : "NO");
    }, [token]);

    const { open: openWebPlaid, ready: webPlaidReady } = usePlaidLink({
      token: token,
      onSuccess: onSuccess,
      onExit: (exit) => {
        console.log('User exited Plaid Link Web manually', exit);
      },
    });

    useEffect(() => {
      console.log("Plaid hook ready state changed:", webPlaidReady);
    }, [webPlaidReady]);

    return (
      <TouchableOpacity
        style={[styles.button, (!token || !webPlaidReady) && styles.buttonDisabled]}
        onPress={() => openWebPlaid()}
        disabled={!token || !webPlaidReady}
      >
        <Text style={styles.buttonText}>
          {(!token || !webPlaidReady) ? 'Loading Plaid...' : 'Connect Bank (Web)'}
        </Text>
      </TouchableOpacity>
    );
  };

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const data = await getBankConnections();
      setConnections(data || []);

      // Pre-fetch link token for Plaid
      console.log('Fetching Plaid Link Token...');
      const { link_token } = await createLinkToken();
      console.log('Received Link Token:', link_token ? 'YES' : 'NO');
      setLinkToken(link_token);
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleConnectBank() {
    // On web, we have to use the <PlaidLink> component method instead of the imperative create/open 
    // to avoid popup blockers or web-view issues.
    if (!linkToken) {
      Alert.alert('Error', 'Link token not ready yet.');
      return;
    }
    setLinking(true);
    try {
      // 2. Open Native Plaid Modal
      // Require the native module dynamically to avoid compiling Android/iOS code on Web
      const PlaidNative = require('react-native-plaid-link-sdk');
      PlaidNative.create({ token: linkToken, noLoadingState: false });

      PlaidNative.open({
        onSuccess: async (success) => {
          await exchangePublicToken(success.publicToken, { institution: { name: success.metadata?.institution?.name || 'Plaid Sandbox Bank' } });
          Alert.alert('Success', 'Bank account connected successfully!');
          await loadData();
          setLinking(false);
        },
        onExit: (exit) => {
          if (exit.error) {
            console.error('Plaid Exit Error:', exit.error);
            Alert.alert('Error', exit.error.message);
          } else {
            console.log('User exited Plaid Link manually');
          }
          setLinking(false);
        }
      });
    } catch (err) {
      console.error(err);
      Alert.alert('Bank Connection Failed', err.message);
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

  const handleWebSuccess = useCallback(async (public_token, metadata) => {
    try {
      await exchangePublicToken(public_token, { institution: { name: metadata?.institution?.name || 'Plaid Sandbox Bank' } });
      Alert.alert('Success', 'Bank account connected successfully!');
      await loadData();
    } catch (err) {
      Alert.alert('Error', err.message);
    }
  }, []);

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

          {Platform.OS === 'web' ? (
            <WebPlaidButton
              token={linkToken}
              onSuccess={handleWebSuccess}
            />
          ) : (
            <TouchableOpacity style={styles.button} onPress={handleConnectBank} disabled={linking}>
              {linking ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Connect Bank</Text>}
            </TouchableOpacity>
          )}
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
  buttonDisabled: {
    opacity: 0.6
  },
  logoutBtn: { backgroundColor: THEME.error },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' }
});