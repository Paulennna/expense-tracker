// components/CategoryBar.js
// ============================================================
// Horizontal bar showing category name, amount, and % of total.
// Used on the Dashboard to show top spending categories.
// ============================================================

import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { THEME } from '../app/_layout';
import { getCategoryColor, getCategoryIcon } from '../lib/categories';

/**
 * @param {string} category - Category name
 * @param {number} amount - Amount spent in this category
 * @param {number} total - Total spending (to calculate percentage)
 * @param {boolean} isLast - If true, removes bottom border
 */
export default function CategoryBar({ category, amount, total, isLast }) {
  const color = getCategoryColor(category);
  const icon = getCategoryIcon(category);
  const percentage = total > 0 ? Math.min((amount / total) * 100, 100) : 0;

  const formattedAmount = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);

  return (
    <View style={[styles.row, !isLast && styles.rowBorder]}>
      {/* Icon */}
      <View style={[styles.icon, { backgroundColor: `${color}20` }]}>
        <Ionicons name={icon} size={16} color={color} />
      </View>

      {/* Bar + label */}
      <View style={styles.content}>
        <View style={styles.labelRow}>
          <Text style={styles.categoryName}>{category}</Text>
          <Text style={styles.amount}>{formattedAmount}</Text>
        </View>

        {/* Progress bar */}
        <View style={styles.barTrack}>
          <View
            style={[
              styles.barFill,
              {
                width: `${percentage}%`,
                backgroundColor: color,
              },
            ]}
          />
        </View>

        <Text style={styles.percentage}>{percentage.toFixed(0)}% of total</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 14,
  },
  rowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: THEME.border,
  },
  icon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    marginTop: 2,
  },
  content: {
    flex: 1,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  categoryName: {
    fontSize: 14,
    fontWeight: '600',
    color: THEME.text,
  },
  amount: {
    fontSize: 14,
    fontWeight: '700',
    color: THEME.text,
  },
  barTrack: {
    height: 4,
    backgroundColor: THEME.border,
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 4,
  },
  barFill: {
    height: '100%',
    borderRadius: 2,
  },
  percentage: {
    fontSize: 11,
    color: THEME.textMuted,
  },
});
