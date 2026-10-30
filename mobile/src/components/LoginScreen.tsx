import React, { useState } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native';
import { colors } from '../theme/colors';
import { api, setApiBaseUrl, getApiBaseUrl, LoginResponse } from '../services/api';

interface LoginScreenProps {
  onLoginSuccess: (data: LoginResponse) => void;
}

export function LoginScreen({ onLoginSuccess }: LoginScreenProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showConfig, setShowConfig] = useState(false);
  const [serverUrl, setServerUrl] = useState(getApiBaseUrl());

  const handleLogin = async () => {
    if (!email || !password) {
      setError('Please enter both company email and password.');
      return;
    }

    setError(null);
    setLoading(true);
    try {
      setApiBaseUrl(serverUrl);
      const res = await api.login(email.trim(), password);
      onLoginSuccess(res);
    } catch (err: any) {
      let msg = err.message || 'Login failed. Please check your credentials.';
      const lower = msg.toLowerCase();
      if (lower.includes('connect') || lower.includes('network') || lower.includes('fetch failed')) {
        msg = `Cannot reach server at ${serverUrl}.\nEnsure your phone and PC are on the same Wi-Fi and the backend is running.`;
        setShowConfig(true);
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const fillSeedEmployee = () => {
    setEmail('employee@company.com');
    setPassword('Employee@12345');
    setError(null);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>ATTENDANCE POC</Text>
        </View>
        <Text style={styles.title}>Employee Sign In</Text>
        <Text style={styles.subtitle}>Enter your company credentials to scan office QR</Text>
      </View>

      <View style={styles.card}>
        {error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <View style={styles.inputGroup}>
          <Text style={styles.label}>COMPANY EMAIL</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. employee@company.com"
            placeholderTextColor="#94A3B8"
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>PASSWORD</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter password"
            placeholderTextColor="#94A3B8"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />
        </View>

        <TouchableOpacity
          style={[styles.primaryButton, loading && styles.buttonDisabled]}
          onPress={handleLogin}
          disabled={loading}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator color={colors.white} size="small" />
          ) : (
            <Text style={styles.primaryButtonText}>Sign In</Text>
          )}
        </TouchableOpacity>

        {/* Development Quick-fill */}
        <TouchableOpacity style={styles.helperButton} onPress={fillSeedEmployee}>
          <Text style={styles.helperButtonText}>Auto-fill Sample Employee</Text>
        </TouchableOpacity>

        {/* API Host Switcher for LAN / Simulator testing */}
        <TouchableOpacity
          style={styles.configToggle}
          onPress={() => setShowConfig(!showConfig)}
        >
          <Text style={styles.configToggleText}>
            {showConfig ? '▲ Hide Server Settings' : '▼ Server Connection Settings'}
          </Text>
        </TouchableOpacity>

        {showConfig && (
          <View style={styles.configBox}>
            <Text style={styles.configLabel}>API Base URL (e.g., http://192.168.x.x:5000/api):</Text>
            <TextInput
              style={styles.configInput}
              value={serverUrl}
              onChangeText={setServerUrl}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#F8FAFC',
  },
  header: {
    marginBottom: 24,
    alignItems: 'center',
  },
  badge: {
    backgroundColor: colors.lightBlue,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    marginBottom: 8,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.primary,
    letterSpacing: 0.5,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.navy,
  },
  subtitle: {
    fontSize: 13,
    color: colors.mutedText,
    marginTop: 4,
    textAlign: 'center',
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: 10,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  errorBox: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 6,
    padding: 10,
    marginBottom: 16,
  },
  errorText: {
    color: colors.status.noPunch,
    fontSize: 12,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.mutedText,
    marginBottom: 6,
    letterSpacing: 0.4,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: colors.text,
    backgroundColor: '#FFFFFF',
  },
  primaryButton: {
    backgroundColor: colors.primary,
    borderRadius: 6,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 6,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  primaryButtonText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '600',
  },
  helperButton: {
    marginTop: 12,
    paddingVertical: 8,
    alignItems: 'center',
  },
  helperButtonText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '500',
  },
  configToggle: {
    marginTop: 12,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 12,
  },
  configToggleText: {
    fontSize: 11,
    color: colors.mutedText,
  },
  configBox: {
    marginTop: 8,
    backgroundColor: '#F1F5F9',
    padding: 10,
    borderRadius: 6,
  },
  configLabel: {
    fontSize: 10,
    color: colors.mutedText,
    marginBottom: 4,
  },
  configInput: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 6,
    fontSize: 12,
  },
});

