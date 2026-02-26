// components/TransactionRow.js
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { THEME } from '../app/_layout';
import { getCategoryColor, getCategoryIcon, formatAmount } from '../lib/categories';

export default function TransactionRow({ transaction, isLast, style }) {
    const { name, merchant_name, amount, date, category } = transaction;
    const displayName = merchant_name || name;
    const color = getCategoryColor(category);
    const icon = getCategoryIcon(category);

    const txDate = new Date(date);
    const dateStr = txDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

    return (
        <View style={[styles.container, !isLast && styles.borderBottom, style]}>
            <View style={[styles.iconContainer, { backgroundColor: `${color}20` }]}>
                <Ionicons name={icon} size={20} color={color} />
            </View>
            <View style={styles.content}>
                <View style={styles.topRow}>
                    <Text style={styles.name} numberOfLines={1}>{displayName}</Text>
                    <Text style={[styles.amount, { color: amount < 0 ? THEME.success : THEME.text }]}>
                        {formatAmount(amount)}
                    </Text>
                </View>
                <View style={styles.bottomRow}>
                    <Text style={styles.category}>{category || 'Uncategorized'}</Text>
                    <Text style={styles.date}>{dateStr}</Text>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        backgroundColor: THEME.surface,
    },
    borderBottom: {
        borderBottomWidth: 1,
        borderBottomColor: THEME.border,
    },
    iconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    content: {
        flex: 1,
    },
    topRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
    },
    name: {
        fontSize: 15,
        fontWeight: '600',
        color: THEME.text,
        flex: 1,
        marginRight: 8,
    },
    amount: {
        fontSize: 15,
        fontWeight: '700',
    },
    bottomRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    category: {
        fontSize: 13,
        color: THEME.textSecondary,
    },
    date: {
        fontSize: 13,
        color: THEME.textMuted,
    },
});