import React from 'react';
import { View, Text, TouchableOpacity, FlatList, StyleSheet } from 'react-native';

interface Note {
  id: string;
  title: string;
  content?: string;
  updated_at: string;
}

export default function NotesSection({ notes, onCreateNote, onNotePress }: { notes: Note[]; onCreateNote: () => void; onNotePress: (id: string) => void; }) {
  const renderNote = ({ item }: { item: Note }) => (
    <TouchableOpacity style={styles.noteCard} onPress={() => onNotePress(item.id)}>
      <View style={styles.noteHeader}>
        <Text style={styles.noteTitle} numberOfLines={1}>{item.title}</Text>
  <Text style={styles.noteDate}>{new Date(item.updated_at).toLocaleDateString(undefined, { timeZone: 'UTC' })}</Text>
      </View>
      {!!item.content && <Text style={styles.notePreview} numberOfLines={2}>{item.content}</Text>}
    </TouchableOpacity>
  );

  return (
    <View>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Recent Notes</Text>
        <TouchableOpacity style={styles.addButton} onPress={onCreateNote}>
          <Text style={styles.addButtonText}>+ Add Note</Text>
        </TouchableOpacity>
      </View>
      {notes.length > 0 ? (
        <FlatList data={notes} renderItem={renderNote} keyExtractor={(item) => item.id} scrollEnabled={false} />
      ) : (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateText}>No notes yet</Text>
          <Text style={styles.emptyStateSubtext}>Create your first note to get started</Text>
          <TouchableOpacity style={styles.createButton} onPress={onCreateNote}>
            <Text style={styles.createButtonText}>CREATE FIRST NOTE</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#F5F5F5' },
  addButton: { backgroundColor: '#FF2A2A', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12 },
  addButtonText: { color: '#F5F5F5', fontWeight: '600', fontSize: 12 },
  noteCard: { backgroundColor: '#1A1A1A', borderRadius: 12, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: '#2A2A2A' },
  noteHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  noteTitle: { color: '#F5F5F5', fontWeight: '700', fontSize: 16 },
  noteDate: { color: '#9A9A9A', fontSize: 12 },
  notePreview: { color: '#CFCFCF', marginTop: 4 },
  emptyState: { alignItems: 'center', paddingVertical: 48 },
  emptyStateText: { fontSize: 18, fontWeight: '600', color: '#F5F5F5', marginBottom: 8 },
  emptyStateSubtext: { fontSize: 14, color: '#9A9A9A', marginBottom: 24 },
  createButton: { backgroundColor: '#2A2A2A', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: '#333' },
  createButtonText: { color: '#F5F5F5', fontWeight: '600' },
});
