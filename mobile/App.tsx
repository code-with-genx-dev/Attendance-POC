import React from 'react';
import { StyleSheet, Text, View, SafeAreaView, TouchableOpacity } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { colors } from './src/theme/colors';

export default function App() {
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      
      {/* Dense Navy Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Attendance Mobile</Text>
        <Text style={styles.headerSubtitle}>Phase 1 Scaffolding</Text>
      </View>

      <View style={styles.content}>
        {/* Today Punch Status Card */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>TODAY STATUS</Text>
          <Text style={styles.cardStatus}>Not Checked In</Text>
          <Text style={styles.cardSubtext}>Office Timezone: Asia/Kolkata</Text>
        </View>

        {/* Scan Action Placeholder */}
        <TouchableOpacity style={styles.scanButton} activeOpacity={0.8}>
          <Text style={styles.scanButtonText}>Scan Office QR</Text>
        </TouchableOpacity>

        {/* Info Box */}
        <View style={styles.infoBox}>
          <Text style={styles.infoText}>
            Single unified Express backend with MySQL database target. Mobile app will connect using HTTP API.
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    backgroundColor: colors.navy,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    color: colors.white,
    fontSize: 18,
    fontWeight: '700',
  },
  headerSubtitle: {
    color: '#93C5FD',
    fontSize: 12,
    marginTop: 2,
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
  cardLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.mutedText,
    letterSpacing: 0.5,
  },
  cardStatus: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginTop: 4,
  },
  cardSubtext: {
    fontSize: 12,
    color: colors.mutedText,
    marginTop: 4,
  },
  scanButton: {
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanButtonText: {
    color: colors.white,
    fontSize: 15,
    fontWeight: '600',
  },
  infoBox: {
    backgroundColor: colors.lightBlue,
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  infoText: {
    fontSize: 12,
    color: colors.navy,
    lineHeight: 18,
  },
});

