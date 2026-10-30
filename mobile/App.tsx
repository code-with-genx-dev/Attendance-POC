import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  SafeAreaView,
  TouchableOpacity,
  ActivityIndicator,
  Alert
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { colors } from './src/theme/colors';
import { api, UserProfile, MyAttendanceResponse, ScanResponse } from './src/services/api';
import { LoginScreen } from './src/components/LoginScreen';
import { PasswordChangeModal } from './src/components/PasswordChangeModal';
import { ScannerModal } from './src/components/ScannerModal';
import { HistoryView } from './src/components/HistoryView';
import { CorrectionModal } from './src/components/CorrectionModal';

export default function App() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [mustChangePassword, setMustChangePassword] = useState(false);
  const [activeTab, setActiveTab] = useState<'today' | 'history'>('today');

  // Attendance state
  const [attendanceData, setAttendanceData] = useState<MyAttendanceResponse | null>(null);
  const [loadingAttendance, setLoadingAttendance] = useState(false);

  // Modals
  const [showScanner, setShowScanner] = useState(false);
  const [showCorrections, setShowCorrections] = useState(false);
  const [lastScanResult, setLastScanResult] = useState<ScanResponse | null>(null);

  const fetchAttendance = async () => {
    setLoadingAttendance(true);
    try {
      const res = await api.getMyAttendance();
      setAttendanceData(res);
    } catch {
      // ignore silently
    } finally {
      setLoadingAttendance(false);
    }
  };

  useEffect(() => {
    if (user && !mustChangePassword) {
      fetchAttendance();
    }
  }, [user, mustChangePassword]);

  const handleLoginSuccess = (data: { user: UserProfile }) => {
    setUser(data.user);
    if (data.user.mustChangePassword) {
      setMustChangePassword(true);
    }
  };

  const handleSignOut = () => {
    setUser(null);
    setAttendanceData(null);
    setLastScanResult(null);
    setMustChangePassword(false);
  };

  const handleScanComplete = (result: ScanResponse) => {
    setLastScanResult(result);
    fetchAttendance();
  };

  if (!user) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar style="dark" />
        <LoginScreen onLoginSuccess={handleLoginSuccess} />
      </SafeAreaView>
    );
  }

  const todayStatus = attendanceData?.today.status || 'not_started';
  const hasCheckedIn = todayStatus === 'open' || todayStatus === 'completed';
  const hasCheckedOut = todayStatus === 'completed';

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" />

      {/* Forced Password Change Modal */}
      <PasswordChangeModal
        visible={mustChangePassword}
        onPasswordChanged={() => {
          setMustChangePassword(false);
          fetchAttendance();
        }}
      />

      {/* QR Scanner Modal */}
      <ScannerModal
        visible={showScanner}
        onClose={() => setShowScanner(false)}
        onScanComplete={handleScanComplete}
      />

      {/* Correction Request Modal */}
      <CorrectionModal
        visible={showCorrections}
        onClose={() => setShowCorrections(false)}
      />

      {/* Dense Navy Top Bar */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>{user.full_name}</Text>
          <Text style={styles.headerSubtitle}>
            {user.company_email} • {user.employee_code || user.role}
          </Text>
        </View>
        <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut}>
          <Text style={styles.signOutBtnText}>Sign Out</Text>
        </TouchableOpacity>
      </View>

      {/* Tab Navigation */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'today' && styles.tabButtonActive]}
          onPress={() => setActiveTab('today')}
        >
          <Text style={[styles.tabText, activeTab === 'today' && styles.tabTextActive]}>
            Today Punch
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'history' && styles.tabButtonActive]}
          onPress={() => setActiveTab('history')}
        >
          <Text style={[styles.tabText, activeTab === 'history' && styles.tabTextActive]}>
            Attendance History
          </Text>
        </TouchableOpacity>
      </View>

      {/* Tab Content */}
      {activeTab === 'today' ? (
        <View style={styles.content}>
          {/* Recent Punch Success Banner */}
          {lastScanResult && (
            <View style={styles.bannerSuccess}>
              <Text style={styles.bannerSuccessTitle}>
                {lastScanResult.action === 'check_in' ? '✓ Checked In' : '✓ Checked Out'}
              </Text>
              <Text style={styles.bannerSuccessSubtext}>
                Server recorded at: {lastScanResult.formattedTime}
              </Text>
            </View>
          )}

          {/* Today Summary Card */}
          <View style={styles.card}>
            <View style={styles.cardRow}>
              <Text style={styles.cardHeaderLabel}>WORK DATE</Text>
              <Text style={styles.cardDate}>
                {attendanceData?.today.workDate || new Date().toISOString().split('T')[0]}
              </Text>
            </View>

            <View style={styles.statusSection}>
              <Text style={styles.statusLabel}>CURRENT STATUS</Text>
              <Text
                style={[
                  styles.statusValue,
                  hasCheckedOut
                    ? { color: colors.status.present }
                    : hasCheckedIn
                    ? { color: colors.primary }
                    : { color: colors.mutedText }
                ]}
              >
                {hasCheckedOut
                  ? 'Completed (Checked Out)'
                  : hasCheckedIn
                  ? 'Open Session (Checked In)'
                  : 'Not Checked In'}
              </Text>
            </View>

            <View style={styles.punchTimesGrid}>
              <View style={styles.punchBox}>
                <Text style={styles.punchBoxLabel}>Check In</Text>
                <Text style={styles.punchBoxTime}>
                  {attendanceData?.today.checkInAt
                    ? new Date(attendanceData.today.checkInAt).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit'
                      })
                    : '--:--'}
                </Text>
              </View>
              <View style={styles.punchBox}>
                <Text style={styles.punchBoxLabel}>Check Out</Text>
                <Text style={styles.punchBoxTime}>
                  {attendanceData?.today.checkOutAt
                    ? new Date(attendanceData.today.checkOutAt).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit'
                      })
                    : '--:--'}
                </Text>
              </View>
            </View>
          </View>

          {/* Primary Action Button */}
          <TouchableOpacity
            style={styles.primaryActionButton}
            onPress={() => setShowScanner(true)}
            activeOpacity={0.85}
          >
            <Text style={styles.primaryActionText}>
              {hasCheckedIn && !hasCheckedOut ? 'Scan to Check Out' : 'Scan Office QR'}
            </Text>
          </TouchableOpacity>

          {/* Missed Punch Action */}
          <TouchableOpacity
            style={styles.secondaryActionButton}
            onPress={() => setShowCorrections(true)}
            activeOpacity={0.7}
          >
            <Text style={styles.secondaryActionText}>
              Missed Punch? Request Correction
            </Text>
          </TouchableOpacity>

          {/* Timezone Note */}
          <View style={styles.footerNote}>
            <Text style={styles.footerNoteText}>
              Punches are validated and timestamped by the server in{' '}
              {attendanceData?.officeTimezone || 'Asia/Kolkata'} timezone.
            </Text>
          </View>
        </View>
      ) : (
        <HistoryView
          history={attendanceData?.history || []}
          loading={loadingAttendance}
          onRefresh={fetchAttendance}
          officeTimezone={attendanceData?.officeTimezone || 'Asia/Kolkata'}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    backgroundColor: colors.navy,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  headerTitle: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '700',
  },
  headerSubtitle: {
    color: '#93C5FD',
    fontSize: 11,
    marginTop: 2,
  },
  signOutBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: '#1E293B',
    borderRadius: 4,
  },
  signOutBtnText: {
    color: colors.white,
    fontSize: 11,
    fontWeight: '600',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  tabButtonActive: {
    borderBottomWidth: 2,
    borderBottomColor: colors.primary,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.mutedText,
  },
  tabTextActive: {
    color: colors.primary,
  },
  content: {
    padding: 16,
    gap: 14,
  },
  bannerSuccess: {
    backgroundColor: '#DCFCE7',
    borderColor: '#86EFAC',
    borderWidth: 1,
    borderRadius: 6,
    padding: 12,
  },
  bannerSuccessTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.status.present,
  },
  bannerSuccessSubtext: {
    fontSize: 12,
    color: '#15803D',
    marginTop: 2,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingBottom: 8,
  },
  cardHeaderLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.mutedText,
    letterSpacing: 0.5,
  },
  cardDate: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
  },
  statusSection: {
    marginVertical: 12,
  },
  statusLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.mutedText,
    letterSpacing: 0.4,
  },
  statusValue: {
    fontSize: 18,
    fontWeight: '800',
    marginTop: 2,
  },
  punchTimesGrid: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  punchBox: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 6,
    padding: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  punchBoxLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.mutedText,
  },
  punchBoxTime: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.navy,
    marginTop: 2,
  },
  primaryActionButton: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    shadowColor: '#1D4ED8',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  primaryActionText: {
    color: colors.white,
    fontSize: 15,
    fontWeight: '700',
  },
  secondaryActionButton: {
    backgroundColor: colors.lightBlue,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  secondaryActionText: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '600',
  },
  footerNote: {
    marginTop: 8,
    paddingHorizontal: 4,
  },
  footerNoteText: {
    fontSize: 11,
    color: colors.mutedText,
    lineHeight: 16,
    textAlign: 'center',
  },
});
