import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { noteService } from '../services/noteService';

export default function ProjectDetailScreen({ route, navigation }) {
  const { projectId } = route.params;
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadNotes();
  }, []);

  const loadNotes = async () => {
    try {
      const data = await noteService.getNotes(projectId);
      setNotes(data);
    } catch (error) {
      Alert.alert('Error', 'Failed to load notes');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadNotes();
  };

  const renderNote = ({ item }) => (
    <TouchableOpacity
      style={styles.noteCard}
      onPress={() =>
        navigation.navigate('NoteDetail', { projectId, noteId: item.id })
      }
    >
      <Text style={styles.noteTitle}>{item.title}</Text>
      <Text style={styles.noteContent} numberOfLines={2}>
        {item.content}
      </Text>
      <View style={styles.noteMeta}>
        <Text style={styles.authorText}>{item.author_name}</Text>
        <Text style={styles.dateText}>
          {new Date(item.created_at).toLocaleDateString()}
        </Text>
      </View>
      {item.photos_count > 0 && (
        <View style={styles.photosBadge}>
          <Text style={styles.photosBadgeText}>📷 {item.photos_count}</Text>
        </View>
      )}
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#3498db" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {notes.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No notes yet</Text>
          <Text style={styles.emptySubtext}>Create your first note to get started</Text>
        </View>
      ) : (
        <FlatList
          data={notes}
          renderItem={renderNote}
          keyExtractor={(item) => item.id.toString()}
          refreshing={refreshing}
          onRefresh={handleRefresh}
          contentContainerStyle={styles.listContainer}
        />
      )}

      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('CreateNote', { projectId })}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContainer: {
    padding: 15,
  },
  noteCard: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  noteTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 8,
  },
  noteContent: {
    fontSize: 14,
    color: '#7f8c8d',
    marginBottom: 12,
  },
  noteMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  authorText: {
    fontSize: 12,
    color: '#3498db',
    fontWeight: '600',
  },
  dateText: {
    fontSize: 12,
    color: '#95a5a6',
  },
  photosBadge: {
    position: 'absolute',
    top: 15,
    right: 15,
    backgroundColor: '#3498db',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  photosBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 20,
    color: '#7f8c8d',
    marginBottom: 10,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#95a5a6',
    textAlign: 'center',
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#2ecc71',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  fabText: {
    fontSize: 32,
    color: '#fff',
    lineHeight: 36,
  },
});
