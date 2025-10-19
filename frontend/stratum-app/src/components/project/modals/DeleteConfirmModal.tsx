import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';

export default function DeleteConfirmModal({ visible, name, isFolder, isDeleting, onCancel, onConfirm }: { visible: boolean; name: string; isFolder: boolean; isDeleting: boolean; onCancel: () => void; onConfirm: () => void; }) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.modalBackdrop}>
        <View style={styles.modalCard}>
          <Text style={styles.modalTitle}>Delete “{name}”?</Text>
          <Text style={styles.modalText}>This will permanently delete {isFolder ? 'this folder and all of its contents' : 'this item'}. This action cannot be undone.</Text>
          <View style={styles.actions}>
            <TouchableOpacity style={styles.button} onPress={onCancel} disabled={isDeleting}><Text style={styles.buttonText}>Cancel</Text></TouchableOpacity>
            <TouchableOpacity style={[styles.button, styles.danger, isDeleting && { opacity: 0.7 }]} onPress={onConfirm} disabled={isDeleting}>
              <Text style={[styles.buttonText, { color: '#FF4444' }]}>{isDeleting ? 'Deleting…' : 'Delete'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  modalCard: { backgroundColor: '#1E1E1A', borderRadius: 16, padding: 20, borderWidth: 1, borderColor: '#333', width: '100%' },
  modalTitle: { color: '#F5F5F5', fontWeight: '700', fontSize: 18, marginBottom: 6 },
  modalText: { color: '#9A9A9A', marginBottom: 12 },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 12, gap: 8 },
  button: { backgroundColor: '#2A2A2A', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: '#333' },
  buttonText: { color: '#F5F5F5', fontWeight: '600' },
  danger: { backgroundColor: '#3A0C0C', borderColor: '#FF4444' },
});
