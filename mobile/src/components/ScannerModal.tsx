import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, Modal, TouchableOpacity, TextInput, ActivityIndicator, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Camera, CameraView } from 'expo-camera';
import { colors } from '../theme/colors';
import { api, ScanResponse } from '../services/api';

interface ScannerModalProps {
  visible: boolean;
  onClose: () => void;
  onScanComplete: (result: ScanResponse) => void;
}

export function ScannerModal({ visible, onClose, onScanComplete }: ScannerModalProps) {
  const insets = useSafeAreaInsets();
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [scanning, setScanning] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [manualToken, setManualToken] = useState('');
  const [showManualInput, setShowManualInput] = useState(false);

  useEffect(() => {
    if (visible) {
      setErrorMessage(null);
      setScanning(false);
      (async () => {
        try {
          const { status } = await Camera.requestCameraPermissionsAsync();
          setHasPermission(status === 'granted');
        } catch {
          // In web/desktop simulator, permission check might fail gracefully
          setHasPermission(false);
        }
      })();
    }
  }, [visible]);

  const processToken = async (tokenString: string) => {
    if (scanning) return;
    setScanning(true);
    setErrorMessage(null);

    try {
      const idempotencyKey = `scan_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      const result = await api.scanAttendance(tokenString.trim(), idempotencyKey);
      onScanComplete(result);
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'QR code verification failed.');
      setScanning(false);
    }
  };

  const handleBarcodeScanned = ({ data }: { data: string }) => {
    if (!scanning && data) {
      processToken(data);
    }
  };

  const handleManualSubmit = () => {
    if (!manualToken.trim()) {
      setErrorMessage('Please paste or enter a QR token payload.');
      return;
    }
    processToken(manualToken);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false}>
      <View style={styles.container}>
        {/* Top Bar */}
        <View style={[styles.topBar, { paddingTop: insets.top + 14 }]}>
          <Text style={styles.topBarTitle}>Scan Office Attendance QR</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>Close</Text>
          </TouchableOpacity>
        </View>

        {/* Error notification banner */}
        {errorMessage && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorBannerText}>{errorMessage}</Text>
          </View>
        )}

        {/* Camera Viewfinder or Simulator Fallback */}
        <View style={styles.cameraWrapper}>
          {hasPermission ? (
            <CameraView
              style={StyleSheet.absoluteFill}
              facing="back"
              barcodeScannerSettings={{
                barcodeTypes: ['qr'],
              }}
              onBarcodeScanned={scanning ? undefined : handleBarcodeScanned}
            >
              <View style={styles.reticleOverlay}>
                <View style={styles.reticleBox}>
                  <View style={[styles.corner, styles.cornerTL]} />
                  <View style={[styles.corner, styles.cornerTR]} />
                  <View style={[styles.corner, styles.cornerBL]} />
                  <View style={[styles.corner, styles.cornerBR]} />
                </View>
                <Text style={styles.reticleText}>Align office display QR within box</Text>
              </View>
            </CameraView>
          ) : (
            <View style={styles.permissionFallback}>
              <Text style={styles.fallbackTitle}>Camera Access Required</Text>
              <Text style={styles.fallbackSubtext}>
                {hasPermission === false
                  ? 'Camera permission denied or camera unavailable in simulator.'
                  : 'Checking camera permissions...'}
              </Text>
              <TouchableOpacity
                style={styles.manualModeBtn}
                onPress={() => setShowManualInput(true)}
              >
                <Text style={styles.manualModeBtnText}>Use Manual Token Input</Text>
              </TouchableOpacity>
            </View>
          )}

          {scanning && (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="large" color={colors.white} />
              <Text style={styles.loadingText}>Verifying server punch...</Text>
            </View>
          )}
        </View>

        {/* Bottom manual input toggle (Useful for testing without physical camera) */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => setShowManualInput(!showManualInput)}
          >
            <Text style={styles.secondaryButtonText}>
              {showManualInput ? '▲ Hide Manual Token Field' : '▼ Developer / Simulator Token Input'}
            </Text>
          </TouchableOpacity>

          {showManualInput && (
            <View style={styles.manualBox}>
              <TextInput
                style={styles.manualInput}
                placeholder="Paste signed QR token payload here..."
                placeholderTextColor="#94A3B8"
                value={manualToken}
                onChangeText={setManualToken}
                autoCapitalize="none"
              />
              <TouchableOpacity
                style={styles.submitManualBtn}
                onPress={handleManualSubmit}
                disabled={scanning}
              >
                <Text style={styles.submitManualBtnText}>Submit Token</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
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
    fontSize: 15,
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
  errorBanner: {
    backgroundColor: '#FEF2F2',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#FECACA',
  },
  errorBannerText: {
    color: colors.status.noPunch,
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  cameraWrapper: {
    flex: 1,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  reticleOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
    width: '100%',
  },
  reticleBox: {
    width: 240,
    height: 240,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderColor: '#38BDF8',
  },
  cornerTL: { top: -2, left: -2, borderTopWidth: 4, borderLeftWidth: 4 },
  cornerTR: { top: -2, right: -2, borderTopWidth: 4, borderRightWidth: 4 },
  cornerBL: { bottom: -2, left: -2, borderBottomWidth: 4, borderLeftWidth: 4 },
  cornerBR: { bottom: -2, right: -2, borderBottomWidth: 4, borderRightWidth: 4 },
  reticleText: {
    color: colors.white,
    fontSize: 12,
    marginTop: 20,
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 4,
  },
  permissionFallback: {
    padding: 24,
    alignItems: 'center',
  },
  fallbackTitle: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '700',
  },
  fallbackSubtext: {
    color: '#94A3B8',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 20,
  },
  manualModeBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 6,
  },
  manualModeBtnText: {
    color: colors.white,
    fontSize: 13,
    fontWeight: '600',
  },
  loadingOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: colors.white,
    fontSize: 14,
    marginTop: 12,
    fontWeight: '500',
  },
  footer: {
    backgroundColor: '#0F172A',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#1E293B',
  },
  secondaryButton: {
    alignItems: 'center',
    paddingVertical: 6,
  },
  secondaryButtonText: {
    color: '#94A3B8',
    fontSize: 11,
  },
  manualBox: {
    marginTop: 10,
    gap: 8,
  },
  manualInput: {
    backgroundColor: '#1E293B',
    color: colors.white,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    fontSize: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  submitManualBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 10,
    borderRadius: 6,
    alignItems: 'center',
  },
  submitManualBtnText: {
    color: colors.white,
    fontSize: 13,
    fontWeight: '600',
  },
});

