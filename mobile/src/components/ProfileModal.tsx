import React from 'react';
import { StyleSheet, Text, View, Modal, TouchableOpacity, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../theme/colors';
import { UserProfile } from '../services/api';

interface ProfileModalProps {
  visible: boolean;
  onClose: () => void;
  user: UserProfile;
}

export function ProfileModal({ visible, onClose, user }: ProfileModalProps) {
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} animationType="slide" transparent={false}>
      <View style={styles.container}>
        {/* Top Bar */}
        <View style={[styles.topBar, { paddingTop: insets.top + 14 }]}>
          <Text style={styles.topBarTitle}>My Profile</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>Close</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          {/* Profile Header */}
          <View style={styles.profileHeader}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {user.full_name.charAt(0).toUpperCase()}
              </Text>
            </View>
            <Text style={styles.userName}>{user.full_name}</Text>
            <View style={styles.roleBadge}>
              <Text style={styles.roleBadgeText}>{user.role}</Text>
            </View>
          </View>

          {/* Employee Details Card */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Employee Details</Text>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>FULL NAME</Text>
              <Text style={styles.detailValue}>{user.full_name}</Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>COMPANY EMAIL</Text>
              <Text style={styles.detailValue}>{user.company_email}</Text>
            </View>

            {user.employee_code && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>EMPLOYEE CODE</Text>
                <Text style={styles.detailValue}>{user.employee_code}</Text>
              </View>
            )}

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>ROLE</Text>
              <Text style={styles.detailValue}>{user.role}</Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>ACCOUNT STATUS</Text>
              <View style={[
                styles.statusBadge,
                user.status === 'active' && styles.statusBadgeActive,
                user.status === 'pending_password_change' && styles.statusBadgePending
              ]}>
                <Text style={styles.statusBadgeText}>
                  {user.status === 'active' ? 'Active' : user.status === 'pending_password_change' ? 'Pending Setup' : user.status}
                </Text>
              </View>
            </View>
          </View>

          {/* Info Card */}
          <View style={styles.infoCard}>
            <Text style={styles.infoText}>
              Your attendance records are stored securely and timestamped by the server. 
              For any corrections or issues, use the "Missed Punch? Request Correction" option.
            </Text>
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
  profileHeader: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.white,
  },
  userName: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.navy,
    marginBottom: 6,
  },
  roleBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: colors.lightBlue,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  roleBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.primary,
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
    marginBottom: 14,
  },
  detailRow: {
    marginBottom: 12,
  },
  detailLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.mutedText,
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    backgroundColor: '#F1F5F9',
    alignSelf: 'flex-start',
  },
  statusBadgeActive: {
    backgroundColor: '#DCFCE7',
  },
  statusBadgePending: {
    backgroundColor: '#FEF3C7',
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.text,
  },
  infoCard: {
    backgroundColor: colors.lightBlue,
    borderRadius: 8,
    padding: 14,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  infoText: {
    fontSize: 12,
    color: colors.navy,
    lineHeight: 18,
  },
});
