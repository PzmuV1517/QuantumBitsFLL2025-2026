import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

export default function MoveBanner({ visible, itemName, onMoveHere, onCancel }: { visible: boolean; itemName: string; onMoveHere: () => void; onCancel: () => void; }) {
  if (!visible) return null;
  return (
    <View style={styles.moveBanner}>
      <Text style={{ color: '#F5F5F5', flex: 1 }}>Select destination for "{itemName}" then tap Move Here</Text>
      <TouchableOpacity style={[styles.action, { marginRight: 8 }]} onPress={onMoveHere}>
        <Text style={styles.actionText}>Move Here</Text>
      </TouchableOpacity>
      <TouchableOpacity style={[styles.action, { backgroundColor: '#2A2A2A' }]} onPress={onCancel}>
        <Text style={styles.actionText}>Cancel</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  moveBanner: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#111', borderTopWidth: 1, borderTopColor: '#2A2A2A', padding: 12, flexDirection: 'row', alignItems: 'center' },
  action: { backgroundColor: '#2A2A2A', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: '#333' },
  actionText: { color: '#F5F5F5', fontWeight: '600' },
});
