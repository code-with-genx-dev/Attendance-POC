import React from 'react';
import { StyleSheet, Text, View, FlatList, TouchableOpacity, RefreshControl } from 'react-native';
import { colors } from '../theme/colors';
import { AttendanceHistoryItem } from '../services/api';

interface HistoryViewProps {
  history: AttendanceHistoryItem[];
  loading: boolean;
  onRefresh: () => void;
  officeTimezone: string;
}

export function HistoryView({ history, loading, onRefresh, officeTimezone }: HistoryViewProps) {
  const [selectedMonth, setSelectedMonth] = React.useState<string>('all');

  // Generate last 6 months options
  const getMonthOptions = () => {
    const options = [{ label: 'All Time', value: 'all' }];
    const now = new Date();
    
    for (let i = 0; i < 6; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const label = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      options.push({ label, value });
    }
    
    return options;
  };

  const monthOptions = getMonthOptions();

  // Filter history by selected month
  const filteredHistory = selectedMonth === 'all' 
    ? history 
    : history.filter(item => item.work_date.startsWith(selectedMonth));

  const formatTime = (isoString: string | null) => {
    if (!isoString) return '--:--';
    try {
      const d = new Date(isoString);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '--:--';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return { label: 'Completed', bg: '#DCFCE7', text: colors.status.present };
      case 'open':
        return { label: 'Open (In)', bg: '#EFF6FF', text: colors.primary };
      case 'incomplete':
        return { label: 'Incomplete', bg: '#FEF3C7', text: colors.status.incomplete };
      default:
        return { label: status, bg: '#F1F5F9', text: colors.mutedText };
    }
  };

  const renderItem = ({ item }: { item: AttendanceHistoryItem }) => {
    const badge = getStatusBadge(item.status);
    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.dateText}>{item.work_date}</Text>
          <View style={[styles.badge, { backgroundColor: badge.bg }]}>
            <Text style={[styles.badgeText, { color: badge.text }]}>{badge.label}</Text>
          </View>
        </View>

        <View style={styles.punchRow}>
          <View style={styles.punchCol}>
            <Text style={styles.punchLabel}>CHECK IN</Text>
            <Text style={styles.punchTime}>{formatTime(item.check_in_at)}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.punchCol}>
            <Text style={styles.punchLabel}>CHECK OUT</Text>
            <Text style={styles.punchTime}>{formatTime(item.check_out_at)}</Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.topInfo}>
        <Text style={styles.topInfoText}>All times recorded in {officeTimezone}</Text>
      </View>

      {/* Month Filter */}
      <View style={styles.filterSection}>
        <Text style={styles.filterLabel}>Filter by Month</Text>
        <View style={styles.filterButtons}>
          {monthOptions.map(option => (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.filterButton,
                selectedMonth === option.value && styles.filterButtonActive
              ]}
              onPress={() => setSelectedMonth(option.value)}
            >
              <Text
                style={[
                  styles.filterButtonText,
                  selectedMonth === option.value && styles.filterButtonTextActive
                ]}
              >
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        {selectedMonth !== 'all' && (
          <Text style={styles.filterResultText}>
            Showing {filteredHistory.length} record{filteredHistory.length !== 1 ? 's' : ''}
          </Text>
        )}
      </View>

      <FlatList
        data={filteredHistory}
        keyExtractor={(item: AttendanceHistoryItem) => item.id.toString()}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <Text style={styles.emptyText}>No attendance records found{selectedMonth !== 'all' ? ' for this month' : ' yet'}.</Text>
            <Text style={styles.emptySubtext}>
              {selectedMonth !== 'all' ? 'Try selecting a different month.' : 'Your punches will appear here once recorded.'}
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  topInfo: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: colors.lightBlue,
    borderBottomWidth: 1,
    borderBottomColor: '#BFDBFE',
  },
  topInfoText: {
    fontSize: 11,
    color: colors.navy,
  },
  filterSection: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  filterLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.mutedText,
    letterSpacing: 0.4,
    marginBottom: 8,
  },
  filterButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  filterButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  filterButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterButtonText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.text,
  },
  filterButtonTextActive: {
    color: colors.white,
  },
  filterResultText: {
    fontSize: 10,
    color: colors.mutedText,
    marginTop: 8,
  },
  listContent: {
    padding: 16,
    gap: 10,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: 8,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  dateText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  punchRow: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 8,
  },
  punchCol: {
    flex: 1,
  },
  divider: {
    width: 1,
    backgroundColor: colors.border,
    marginHorizontal: 12,
  },
  punchLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.mutedText,
    letterSpacing: 0.4,
  },
  punchTime: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
    marginTop: 2,
  },
  emptyBox: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  emptySubtext: {
    fontSize: 12,
    color: colors.mutedText,
    marginTop: 4,
  },
});
