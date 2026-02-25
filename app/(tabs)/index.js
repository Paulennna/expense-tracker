// app/(tabs)/index.js  (Dashboard)
// ============================================================
// Main dashboard showing this month's spending, top categories,
// and recent transactions. Refreshes on pull-to-refresh.
// ============================================================

import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { THEME } from '../_layout';
import { getSpendingByCategory, getTotalSpending, getTransactions } from '../../lib/api';
import { getCategoryColor, getCategoryIcon, getCurrentMonth, getMonthLabel, formatAmount } from '../../lib/categories';
import CategoryBar from '../../components/CategoryBar';
import TransactionRow from '../../components/TransactionRow';

export default function DashboardScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [totalSpent, setTotalSpent] = useState(0);
  const [categories, setCategories] = useState([]);
  const [recentTransactions, setRecentTransactions] = useState([]);
  const [error, setError] = useState(null);

  const currentMonth = getCurrentMonth();

  async function loadData() {
    try {
      setError(null);

      // Fetch all data in parallel for speed
      const [total, cats, recent] = await Promise.all([
        getTotalSpending(currentMonth),
        getSpendingByCategory(currentMonth),
        getTransactions({ limit: 5 }), // Just 5 most recent for the dashboard
      ]);

      setTotalSpent(total);
      setCategories(cats.slice(0, 5)); // Top 5 categories
      setRecentTransactions(recent);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData();
  }, []);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingCenter}>
          <ActivityIndicator color={THEME.primary} size="large" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={THEME.primary}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Dashboard</Text>
          <Text style={styles.headerMonth}>{getMonthLabel(currentMonth)}</Text>
        </View>

        {/* Error state */}
        {error && (
          <View style={styles.errorCard}>
            <Ionicons name="warning-outline" size={20} color={THEME.error} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Total spent card */}
        <View style={styles.totalCard}>
          <Text style={styles.totalLabel}>Total Spent This Month</Text>
          <Text style={styles.totalAmount}>
            {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(totalSpent)}
          </Text>
          <View style={styles.totalBadge}>
            <Ionicons name="calendar-outline" size={12} color={THEME.textMuted} />
            <Text style={styles.totalBadgeText}>{getMonthLabel(currentMonth)}</Text>
          </View>
        </View>

        {/* Spending by category */}
        {categories.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Top Categories</Text>
            <View style={styles.card}>
              {categories.map((cat, index) => (
                <CategoryBar
                  key={cat.category}
                  category={cat.category}
                  amount={cat.total}
                  total={totalSpent}
                  isLast={index === categories.length - 1}
                />
              ))}
            </View>
          </View>
        )}

        {/* Recent transactions */}
        {recentTransactions.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Recent Transactions</Text>
            <View style={styles.card}>
              {recentTransactions.map((tx, index) => (
                <TransactionRow
                  key={tx.id}
                  transaction={tx}
                  isLast={index === recentTransactions.length - 1}
                />
              ))}
            </View>
          </View>
        )}

        {/* Empty state: no bank connected yet */}
        {categories.length === 0 && recentTransactions.length === 0 && !error && (
          <View style={styles.emptyState}>
            <Ionicons name="wallet-outline" size={56} color={THEME.textMuted} />
            <Text style={styles.emptyTitle}>No Transactions Yet</Text>
            <Text style={styles.emptySubtitle}>
              Connect your bank account in Settings to start tracking your spending.
            </Text>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.background,
  },
  scroll: {
    flex: 1,
  },
  loadingCenter: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: THEME.text,
    letterSpacing: -0.5,
  },
  headerMonth: {
    fontSize: 14,
    color: THEME.textSecondary,
    marginTop: 2,
  },
  errorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 20,
    marginVertical: 8,
    padding: 14,
    backgroundColor: 'rgba(255, 71, 87, 0.1)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 71, 87, 0.2)',
  },
  errorText: {
    color: THEME.error,
    fontSize: 14,
    flex: 1,
  },
  totalCard: {
    margin: 20,
    padding: 24,
    backgroundColor: THEME.primary,
    borderRadius: 24,
    // Purple gradient feel with shadow
    shadowColor: THEME.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  totalLabel: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
  },
  totalAmount: {
    fontSize: 42,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: -1,
  },
  totalBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 12,
  },
  totalBadgeText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.6)',
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: THEME.text,
    marginBottom: 12,
    letterSpacing: -0.3,
  },
  card: {
    backgroundColor: THEME.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: THEME.border,
    overflow: 'hidden',
  },
  emptyState: {
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingTop: 60,
    paddingBottom: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: THEME.text,
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 15,
    color: THEME.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
});
