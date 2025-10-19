import React, { useState, useEffect } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, TextInput } from 'react-native';

export default function NewFolderModal({ visible, onCancel, onCreate }: { visible: boolean; onCancel: () => void; onCreate: (name: string) => void; }) {
  const [name, setName] = useState('');
  useEffect(() => { if (visible) setName(''); }, [visible]);
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.modalBackdrop}>
        <View style={styles.modalCard}>
          <Text style={styles.modalTitle}>New Folder</Text>
          <Text style={styles.modalText}>Enter a name for the new folder</Text>
          <TextInput style={styles.input} placeholder="Folder name" placeholderTextColor="#666" value={name} onChangeText={setName} />
          <View style={styles.actions}>
            <TouchableOpacity style={styles.button} onPress={onCancel}><Text style={styles.buttonText}>Cancel</Text></TouchableOpacity>
            <TouchableOpacity style={[styles.button, styles.primary]} onPress={() => onCreate(name.trim())}><Text style={styles.buttonText}>Create</Text></TouchableOpacity>
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
  input: { color: '#EAEAEA', backgroundColor: '#1A1A1A', borderWidth: 1, borderColor: '#333', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10 },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 12, gap: 8 },
  button: { backgroundColor: '#2A2A2A', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: '#333' },
  buttonText: { color: '#F5F5F5', fontWeight: '600' },
  primary: { backgroundColor: '#2A2A2A', borderColor: '#FF2A2A' },
});
