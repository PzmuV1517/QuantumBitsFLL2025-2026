import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, Modal } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../src/contexts/AuthContext';

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const performLogout = async () => {
    try {
      setIsLoggingOut(true);
      await logout();
      // Navigate explicitly to login; RootLayout will also redirect based on auth state
      router.replace('/(auth)/login');
    } catch (e) {
      console.error('Logout failed:', e);
    } finally {
      setIsLoggingOut(false);
    }
  };

  const handleLogout = () => {
    // Use a custom modal instead of Alert to support Web consistently
    setShowLogoutModal(true);
  };

  const handleSettings = () => {
    Alert.alert('Settings', 'Settings functionality coming soon!', [
      { text: 'OK', style: 'default' },
    ]);
  };

  const handleHelpSupport = () => {
    Alert.alert('Help & Support', 'Need help?\n\n• Email: support@stratum.app\n• Documentation: docs.stratum.app\n• Community Forum: forum.stratum.app', [
      { text: 'OK', style: 'default' },
    ]);
  };

  const handleAbout = () => {
    Alert.alert(
      'About STRATUM',
      'STRATUM v1.0.0\n\nArchaeological Site Documentation & Collaboration Platform\n\nBuilt for FLL 2025-2026 UNEARTHED Challenge\n\n© 2025 QuantumBits Team',
      [{ text: 'OK', style: 'default' }]
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Profile</Text>
      </View>

      <View style={styles.content}>
        <View style={styles.profileSection}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {user?.display_name?.charAt(0).toUpperCase() || 'U'}
            </Text>
          </View>
          <Text style={styles.displayName}>{user?.display_name || 'User'}</Text>
          <Text style={styles.email}>{user?.email}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          
          <TouchableOpacity style={styles.menuItem} onPress={handleSettings}>
            <Text style={styles.menuItemText}>Settings</Text>
            <Text style={styles.menuItemArrow}>→</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.menuItem} onPress={handleHelpSupport}>
            <Text style={styles.menuItemText}>Help & Support</Text>
            <Text style={styles.menuItemArrow}>→</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.menuItem} onPress={handleAbout}>
            <Text style={styles.menuItemText}>About</Text>
            <Text style={styles.menuItemArrow}>→</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={[styles.logoutButton, isLoggingOut && { opacity: 0.7 }]} onPress={handleLogout} disabled={isLoggingOut}>
          {isLoggingOut ? (
            <ActivityIndicator color="#F5F5F5" />
          ) : (
            <Text style={styles.logoutButtonText}>Logout</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Logout confirmation modal */}
      <Modal
        visible={showLogoutModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowLogoutModal(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Confirm logout</Text>
            <Text style={styles.modalText}>
              Are you sure you want to log out of STRATUM?
            </Text>
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalButton} onPress={() => setShowLogoutModal(false)} disabled={isLoggingOut}>
                <Text style={styles.modalButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalLogoutButton, isLoggingOut && { opacity: 0.7 }]}
                onPress={performLogout}
                disabled={isLoggingOut}
              >
                {isLoggingOut ? (
                  <ActivityIndicator color="#F5F5F5" />
                ) : (
                  <Text style={[styles.modalButtonText, styles.modalLogoutText]}>Logout</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111111',
  },
  header: {
    padding: 24,
    paddingTop: 60,
    backgroundColor: '#111111',
    borderBottomWidth: 1,
    borderBottomColor: '#2A2A2A',
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: '#F5F5F5',
    letterSpacing: 0.5,
  },
  content: {
    flex: 1,
    padding: 24,
  },
  profileSection: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingBottom: 32,
    borderBottomWidth: 1,
    borderBottomColor: '#2A2A2A',
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#FF2A2A',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#FF2A2A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 8,
  },
  avatarText: {
    fontSize: 40,
    color: '#F5F5F5',
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  displayName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#F5F5F5',
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  email: {
    fontSize: 14,
    color: '#9A9A9A',
    letterSpacing: 0.5,
  },
  section: {
    marginTop: 32,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#9A9A9A',
    marginBottom: 16,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  menuItem: {
    backgroundColor: '#1A1A1A',
    padding: 16,
    borderRadius: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  menuItemText: {
    fontSize: 16,
    color: '#F5F5F5',
    letterSpacing: 0.5,
  },
  menuItemArrow: {
    fontSize: 16,
    color: '#9A9A9A',
  },
  logoutButton: {
    backgroundColor: '#FF2A2A',
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: 32,
    shadowColor: '#FF2A2A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 8,
  },
  logoutButtonText: {
    color: '#F5F5F5',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    backgroundColor: '#1E1E1E',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#333',
    width: '100%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#F5F5F5',
    marginBottom: 8,
  },
  modalText: {
    fontSize: 14,
    color: '#CCCCCC',
    marginBottom: 16,
    lineHeight: 20,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  modalButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#2A2A2A',
  },
  modalButtonText: {
    color: '#F5F5F5',
    fontSize: 14,
    fontWeight: '600',
  },
  modalLogoutButton: {
    backgroundColor: '#3A0C0C',
    borderWidth: 1,
    borderColor: '#FF4444',
  },
  modalLogoutText: {
    color: '#FF4444',
  },
});
