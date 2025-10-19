import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';

export default function ProjectMenuModal({ visible, membersCount, onClose, onOpenMembers, onOpenSettings }: { visible: boolean; membersCount: number; onClose: () => void; onOpenMembers: () => void; onOpenSettings: () => void; }) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.menuBackdrop}>
        <View style={styles.menuCard}>
          <TouchableOpacity style={styles.menuItem} onPress={() => { onClose(); onOpenMembers(); }}>
            <Text style={styles.menuItemText}>Members ({membersCount})</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.menuItem} onPress={() => { onClose(); onOpenSettings(); }}>
            <Text style={styles.menuItemText}>Settings</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.menuItem, { justifyContent: 'center' }]} onPress={onClose}>
            <Text style={[styles.menuItemText, { color: '#9A9A9A' }]}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  menuBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  menuCard: { backgroundColor: '#1E1E1A', borderRadius: 16, padding: 20, borderWidth: 1, borderColor: '#333', width: '100%' },
  menuItem: { paddingVertical: 12 },
  menuItemText: { color: '#F5F5F5', fontSize: 16, fontWeight: '600' },
});
