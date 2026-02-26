// app/(tabs)/transactions.js
// ============================================================
// Transactions list with search, month filter, and category filter.
// ============================================================

import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import {THEME} from "../_layout"
import { getTransactions } from '../../lib/api';
import { CATEGORY_NAMES, getCurrentMonth, getMonthLabel } from '../../lib/categories';
import TransactionRow from '../../components/TransactionRow';

// Generate a list of recent months to filter by (last 6 months)
function getRecentMonths() {
  const months = [];
  const now = new Date();
  for (let i = 0; i < 6; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    months.push(key);
  }
  return months;
}

export default function TransactionsScreen() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth());
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [error, setError] = useState(null);

  const months = getRecentMonths();

  async function loadTransactions() {
    try {
      setError(null);
      const data = await getTransactions({
        month: selectedMonth,
        category: selectedCategory,
        search: search || undefined,
        limit: 200,
      });
      setTransactions(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  // Reload when filters change
  useEffect(() => {
    setLoading(true);
    loadTransactions();
   
  }, [selectedMonth, selectedCategory]);

  // Debounce search — wait 400ms after user stops typing
  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(true);
      loadTransactions();
    }, 400);

    return () => clearTimeout(timer);
  
  }, [search]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadTransactions();
   
  }, [selectedMonth, selectedCategory, search]);

  function clearFilters() {
    setSelectedCategory(null);
    setSearch('');
    setSelectedMonth(getCurrentMonth());
  }

  const hasActiveFilters = selectedCategory || search;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Transactions</Text>
        {hasActiveFilters && (
          <TouchableOpacity onPress={clearFilters} style={styles.clearButton}>
            <Text style={styles.clearButtonText}>Clear</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Search bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search-outline" size={18} color={THEME.textMuted} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search transactions..."
          placeholderTextColor={THEME.textMuted}
          value={search}
          onChangeText={setSearch}
          returnKeyType="search"
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={18} color={THEME.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {/* Month filter (horizontal scroll) */}
      <View>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={months}
          keyExtractor={(item) => item}
          contentContainerStyle={styles.monthList}
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() => setSelectedMonth(item)}
              style={[styles.monthChip, item === selectedMonth && styles.monthChipActive]}
            >
              <Text style={[styles.monthChipText, item === selectedMonth && styles.monthChipTextActive]}>
                {getMonthLabel(item).split(' ')[0].substring(0, 3)} {getMonthLabel(item).split(' ')[1].slice(2)}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>

      {/* Category filter */}
      <View style={styles.filterRow}>
        <TouchableOpacity
          style={[styles.categoryChip, selectedCategory && styles.categoryChipActive]}
          onPress={() => setShowCategoryPicker(!showCategoryPicker)}
        >
          <Ionicons name="pricetag-outline" size={14} color={selectedCategory ? '#fff' : THEME.textSecondary} />
          <Text style={[styles.categoryChipText, selectedCategory && styles.categoryChipTextActive]}>
            {selectedCategory || 'Category'}
          </Text>
          <Ionicons
            name={showCategoryPicker ? 'chevron-up' : 'chevron-down'}
            size={12}
            color={selectedCategory ? '#fff' : THEME.textSecondary}
          />
        </TouchableOpacity>

        {transactions.length > 0 && <Text style={styles.countText}>{transactions.length} transactions</Text>}
      </View>

      {/* Category picker dropdown */}
      {showCategoryPicker && (
        <View style={styles.categoryDropdown}>
          <TouchableOpacity
            style={styles.categoryOption}
            onPress={() => {
              setSelectedCategory(null);
              setShowCategoryPicker(false);
            }}
          >
            <Text style={[styles.categoryOptionText, !selectedCategory && styles.categoryOptionActive]}>
              All Categories
            </Text>
          </TouchableOpacity>

          {CATEGORY_NAMES.map((cat) => (
            <TouchableOpacity
              key={cat}
              style={styles.categoryOption}
              onPress={() => {
                setSelectedCategory(cat);
                setShowCategoryPicker(false);
              }}
            >
              <Text style={[styles.categoryOptionText, selectedCategory === cat && styles.categoryOptionActive]}>
                {cat}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Error */}
      {error && (
        <View style={styles.errorCard}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {/* Transaction list */}
      {loading ? (
        <View style={styles.loadingCenter}>
          <ActivityIndicator color={THEME.primary} />
        </View>
      ) : (
        <FlatList
          data={transactions}
          keyExtractor={(item) => item.id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={THEME.primary} />}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="receipt-outline" size={48} color={THEME.textMuted} />
              <Text style={styles.emptyTitle}>No Transactions</Text>
              <Text style={styles.emptySubtitle}>
                {hasActiveFilters ? 'Try adjusting your filters.' : 'Connect a bank account in Settings to see transactions.'}
              </Text>
            </View>
          }
          renderItem={({ item, index }) => (
            <TransactionRow
              transaction={item}
              isLast={index === transactions.length - 1}
              style={index === 0 && styles.firstItem}
            />
          )}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: THEME.background },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  headerTitle: { fontSize: 28, fontWeight: '700', color: THEME.text, letterSpacing: -0.5 },

  clearButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: THEME.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  clearButtonText: { color: THEME.textSecondary, fontSize: 13, fontWeight: '600' },

  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginBottom: 12,
    backgroundColor: THEME.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: THEME.border,
    paddingHorizontal: 14,
    height: 44,
  },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, color: THEME.text, fontSize: 15 },

  monthList: { paddingHorizontal: 20, gap: 8, marginBottom: 12 },
  monthChip: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: THEME.surface,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  monthChipActive: { backgroundColor: THEME.primary, borderColor: THEME.primary },
  monthChipText: { fontSize: 13, fontWeight: '600', color: THEME.textSecondary },
  monthChipTextActive: { color: '#fff' },

  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 12,
  },

  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: THEME.surface,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  categoryChipActive: { backgroundColor: THEME.primary, borderColor: THEME.primary },
  categoryChipText: { fontSize: 13, fontWeight: '600', color: THEME.textSecondary },
  categoryChipTextActive: { color: '#fff' },

  countText: { fontSize: 13, color: THEME.textMuted },

  categoryDropdown: {
    marginHorizontal: 20,
    marginBottom: 8,
    backgroundColor: THEME.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: THEME.border,
    overflow: 'hidden',
    maxHeight: 200,
  },
  categoryOption: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: THEME.border,
  },
  categoryOptionText: { fontSize: 14, color: THEME.textSecondary, fontWeight: '500' },
  categoryOptionActive: { color: THEME.primary, fontWeight: '700' },

  listContent: { paddingHorizontal: 20, paddingBottom: 40 },
  separator: { height: 1, backgroundColor: THEME.border, marginLeft: 56 },

  loadingCenter: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 60 },

  errorCard: {
    marginHorizontal: 20,
    marginBottom: 12,
    padding: 12,
    backgroundColor: 'rgba(255, 71, 87, 0.1)',
    borderRadius: 10,
  },
  errorText: { color: THEME.error, fontSize: 14 },

  emptyState: { alignItems: 'center', paddingTop: 60, paddingHorizontal: 40 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: THEME.text, marginTop: 16, marginBottom: 8 },
  emptySubtitle: { fontSize: 14, color: THEME.textSecondary, textAlign: 'center', lineHeight: 20 },

  firstItem: { borderTopLeftRadius: 16, borderTopRightRadius: 16 },
});