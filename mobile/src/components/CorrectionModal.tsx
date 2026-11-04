import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Modal,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../theme/colors';
import { api, CorrectionItem } from '../services/api';

interface CorrectionModalProps {
  visible: boolean;
  onClose: () => void;
}

export function CorrectionModal({ visible, onClose }: CorrectionModalProps) {
  const insets = useSafeAreaInsets();
  const [punchType, setPunchType] = useState<'check_in' | 'check_out'>('check_out');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedHour, setSelectedHour] = useState('09');
  const [selectedMinute, setSelectedMinute] = useState('00');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [corrections, setCorrections] = useState<CorrectionItem[]>([]);
  const [fetchingList, setFetchingList] = useState(false);

  // Generate hour options (00-23)
  const hours = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
  // Generate minute options (00, 15, 30, 45)
  const minutes = ['00', '15', '30', '45'];

  const fetchCorrections = async () => {
    setFetchingList(true);
    try {
      const res = await api.getMyCorrections();
      setCorrections(res.corrections);
    } catch {
      // ignore silently
    } finally {
      setFetchingList(false);
    }
  };

  useEffect(() => {
    if (visible) {
      setReason('');
      setError(null);
      setSelectedDate(new Date().toISOString().split('T')[0]);
      setSelectedHour('09');
      setSelectedMinute('00');
      fetchCorrections();
    }
  }, [visible]);

  const handleSubmit = async () => {
    if (!reason.trim()) {
      setError('Please provide a reason for the missed punch.');
      return;
    }

    // Construct ISO timestamp from date and time
    const requestedTime = `${selectedDate}T${selectedHour}:${selectedMinute}:00`;

    setError(null);
    setLoading(true);
    try {
      await api.submitCorrection({
        punch_type: punchType,
        requested_time: requestedTime,
        reason: reason.trim()
      });
      setReason('');
      setSelectedDate(new Date().toISOString().split('T')[0]);
      setSelectedHour('09');
      setSelectedMinute('00');
      await fetchCorrections();
      Alert.alert('Success', 'Correction request submitted for Admin review.');
    } catch (err: any) {
      setError(err.message || 'Failed to submit correction request.');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return { label: 'Approved', bg: '#DCFCE7', text: colors.status.present };
      case 'rejected':
        return { label: 'Rejected', bg: '#FEE2E2', text: colors.status.noPunch };
      default:
        return { label: 'Pending Review', bg: '#FEF3C7', text: colors.status.incomplete };
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false}>
      <View style={styles.container}>
        {/* Top Bar */}
        <View style={[styles.topBar, { paddingTop: insets.top + 14 }]}>
          <Text style={styles.topBarTitle}>Missed-Punch Correction</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>Close</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          {/* Form Card */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Submit Adjustment Request</Text>
            <Text style={styles.cardSubtitle}>
              Missed punches are reviewed and approved by HR/Admin. Never guess times without submitting an audited request.
            </Text>

            {error && (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            <View style={styles.inputGroup}>
              <Text style={styles.label}>PUNCH TYPE</Text>
              <View style={styles.typeSelector}>
                <TouchableOpacity
                  style={[styles.typeButton, punchType === 'check_in' && styles.typeButtonActive]}
                  onPress={() => setPunchType('check_in')}
                >
                  <Text
                    style={[
                      styles.typeButtonText,
                      punchType === 'check_in' && styles.typeButtonTextActive
                    ]}
                  >
                    Missed Check-In
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.typeButton, punchType === 'check_out' && styles.typeButtonActive]}
                  onPress={() => setPunchType('check_out')}
                >
                  <Text
                    style={[
                      styles.typeButtonText,
                      punchType === 'check_out' && styles.typeButtonTextActive
                    ]}
                  >
                    Missed Check-Out
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>DATE</Text>
              <TextInput
                style={styles.input}
                value={selectedDate}
                onChangeText={setSelectedDate}
                placeholder="YYYY-MM-DD"
                placeholderTextColor="#94A3B8"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>TIME (24-HOUR FORMAT)</Text>
              <View style={styles.timePickerRow}>
                <View style={styles.timePickerColumn}>
                  <Text style={styles.timePickerLabel}>Hour</Text>
                  <ScrollView style={styles.timePicker} nestedScrollEnabled>
                    {hours.map(hour => (
                      <TouchableOpacity
                        key={hour}
                        style={[
                          styles.timeOption,
                          selectedHour === hour && styles.timeOptionSelected
                        ]}
                        onPress={() => setSelectedHour(hour)}
                      >
                        <Text
                          style={[
                            styles.timeOptionText,
                            selectedHour === hour && styles.timeOptionTextSelected
                          ]}
                        >
                          {hour}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>

                <Text style={styles.timeSeparator}>:</Text>

                <View style={styles.timePickerColumn}>
                  <Text style={styles.timePickerLabel}>Minute</Text>
                  <ScrollView style={styles.timePicker} nestedScrollEnabled>
                    {minutes.map(minute => (
                      <TouchableOpacity
                        key={minute}
                        style={[
                          styles.timeOption,
                          selectedMinute === minute && styles.timeOptionSelected
                        ]}
                        onPress={() => setSelectedMinute(minute)}
                      >
                        <Text
                          style={[
                            styles.timeOptionText,
                            selectedMinute === minute && styles.timeOptionTextSelected
                          ]}
                        >
                          {minute}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              </View>
              <Text style={styles.timePreview}>
                Selected time: {selectedHour}:{selectedMinute}
              </Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>MANDATORY REASON</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Explain why the punch was missed (e.g., meeting offsite, device malfunction)..."
                placeholderTextColor="#94A3B8"
                multiline
                numberOfLines={3}
                value={reason}
                onChangeText={setReason}
              />
            </View>

            <TouchableOpacity
              style={[styles.submitButton, loading && styles.buttonDisabled]}
              onPress={handleSubmit}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={colors.white} size="small" />
              ) : (
                <Text style={styles.submitButtonText}>Submit for Admin Approval</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Previous Requests Section */}
          <View style={styles.historySection}>
            <Text style={styles.sectionTitle}>MY CORRECTION REQUESTS</Text>

            {fetchingList ? (
              <ActivityIndicator color={colors.primary} style={{ marginTop: 12 }} />
            ) : corrections.length === 0 ? (
              <Text style={styles.emptyText}>No previous correction requests.</Text>
            ) : (
              corrections.map((item: CorrectionItem) => {
                const badge = getStatusBadge(item.status);
                return (
                  <View key={item.id} style={styles.requestCard}>
                    <View style={styles.requestHeader}>
                      <Text style={styles.requestType}>
                        {item.punch_type === 'check_in' ? 'Check-In' : 'Check-Out'}
                      </Text>
                      <View style={[styles.badge, { backgroundColor: badge.bg }]}>
                        <Text style={[styles.badgeText, { color: badge.text }]}>
                          {badge.label}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.requestTime}>Target: {item.requested_time}</Text>
                    <Text style={styles.requestReason}>Reason: {item.reason}</Text>
                    {item.decision_reason && (
                      <View style={styles.decisionBox}>
                        <Text style={styles.decisionLabel}>Admin Decision Reason:</Text>
                        <Text style={styles.decisionText}>{item.decision_reason}</Text>
                      </View>
                    )}
                  </View>
                );
              })
            )}
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  topBar: {
    backgroundColor: colors.navy,
    paddingBottom: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  topBarTitle: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '700',
  },
  closeButton: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 4,
    backgroundColor: '#1E293B',
  },
  closeButtonText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: '600',
  },
  content: {
    padding: 16,
    gap: 16,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.navy,
  },
  cardSubtitle: {
    fontSize: 12,
    color: colors.mutedText,
    marginTop: 4,
    marginBottom: 16,
    lineHeight: 18,
  },
  errorBox: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
    borderWidth: 1,
    padding: 8,
    borderRadius: 4,
    marginBottom: 12,
  },
  errorText: {
    color: colors.status.noPunch,
    fontSize: 12,
  },
  inputGroup: {
    marginBottom: 14,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.mutedText,
    marginBottom: 6,
    letterSpacing: 0.4,
  },
  typeSelector: {
    flexDirection: 'row',
    gap: 8,
  },
  typeButton: {
    flex: 1,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 6,
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  typeButtonActive: {
    borderColor: colors.primary,
    backgroundColor: colors.lightBlue,
  },
  typeButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text,
  },
  typeButtonTextActive: {
    color: colors.primary,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: colors.text,
    backgroundColor: '#FFFFFF',
  },
  timePickerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  timePickerColumn: {
    flex: 1,
  },
  timePickerLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.mutedText,
    marginBottom: 6,
    textAlign: 'center',
  },
  timePicker: {
    maxHeight: 120,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 6,
    backgroundColor: '#FFFFFF',
  },
  timeOption: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    alignItems: 'center',
  },
  timeOptionSelected: {
    backgroundColor: colors.lightBlue,
  },
  timeOptionText: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '500',
  },
  timeOptionTextSelected: {
    color: colors.primary,
    fontWeight: '700',
  },
  timeSeparator: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.navy,
    marginTop: 30,
  },
  timePreview: {
    fontSize: 12,
    color: colors.mutedText,
    marginTop: 6,
    textAlign: 'center',
    fontWeight: '600',
  },
  textArea: {
    height: 70,
    textAlignVertical: 'top',
  },
  submitButton: {
    backgroundColor: colors.primary,
    borderRadius: 6,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 6,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: colors.white,
    fontSize: 13,
    fontWeight: '600',
  },
  historySection: {
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.mutedText,
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 12,
    color: colors.mutedText,
    fontStyle: 'italic',
  },
  requestCard: {
    backgroundColor: colors.white,
    padding: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 8,
  },
  requestHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  requestType: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  requestTime: {
    fontSize: 11,
    color: colors.mutedText,
    marginTop: 2,
  },
  requestReason: {
    fontSize: 12,
    color: colors.text,
    marginTop: 4,
  },
  decisionBox: {
    marginTop: 6,
    backgroundColor: '#F1F5F9',
    padding: 8,
    borderRadius: 4,
  },
  decisionLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.mutedText,
  },
  decisionText: {
    fontSize: 11,
    color: colors.navy,
    marginTop: 2,
  },
});
