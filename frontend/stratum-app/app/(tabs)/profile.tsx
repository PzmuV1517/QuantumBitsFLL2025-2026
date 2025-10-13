import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useAuth } from '../../src/contexts/AuthContext';

export default function ProfileScreen() {
  const { user, logout } = useAuth();

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', onPress: logout, style: 'destructive' },
    ]);
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
          
          <TouchableOpacity style={styles.menuItem}>
            <Text style={styles.menuItemText}>Settings</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.menuItem}>
            <Text style={styles.menuItemText}>Help & Support</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.menuItem}>
            <Text style={styles.menuItemText}>About</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutButtonText}>Logout</Text>
        </TouchableOpacity>
      </View>
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
  },
  menuItemText: {
    fontSize: 16,
    color: '#F5F5F5',
    letterSpacing: 0.5,
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
});
