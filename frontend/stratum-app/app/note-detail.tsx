import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { Stack } from 'expo-router';
import { noteService } from '../src/services/noteService';

interface Note {
  id: string;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
  author_id: string;
  project_id: string;
}

export default function NoteDetailScreen() {
  const { noteId, projectId } = useLocalSearchParams();
  const router = useRouter();
  const [note, setNote] = useState<Note | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadNote();
  }, [noteId]);

  // Reload note when screen comes back into focus (after editing)
  useFocusEffect(
    React.useCallback(() => {
      if (noteId) {
        loadNote();
      }
    }, [noteId])
  );

  const loadNote = async () => {
    try {
      setLoading(true);
      const noteData = await noteService.getNote(noteId as string);
      setNote(noteData);
    } catch (error) {
      console.error('Error loading note:', error);
      Alert.alert('Error', 'Failed to load note details', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = () => {
    router.push({
      pathname: '/edit-note',
      params: { noteId, projectId }
    });
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Note',
      'Are you sure you want to delete this note? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: confirmDelete },
      ]
    );
  };

  const confirmDelete = async () => {
    try {
      await noteService.deleteNote(noteId as string);
      Alert.alert('Success', 'Note deleted successfully', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch (error) {
      console.error('Error deleting note:', error);
      Alert.alert('Error', 'Failed to delete note');
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <Stack.Screen 
          options={{
            title: 'Note Details',
            headerStyle: { backgroundColor: '#111111' },
            headerTintColor: '#FF2A2A',
            headerTitleStyle: { 
              color: '#F5F5F5',
              fontSize: 18,
              fontWeight: '600'
            },
            headerBackTitle: 'Project',
            headerShown: true,
            presentation: 'card',
          }} 
        />
        <ActivityIndicator size="large" color="#FF2A2A" />
        <Text style={styles.loadingText}>Loading note...</Text>
      </View>
    );
  }

  if (!note) {
    return (
      <View style={styles.centerContainer}>
        <Stack.Screen 
          options={{
            title: 'Note Not Found',
            headerStyle: { backgroundColor: '#111111' },
            headerTintColor: '#FF2A2A',
            headerTitleStyle: { 
              color: '#F5F5F5',
              fontSize: 18,
              fontWeight: '600'
            },
            headerBackTitle: 'Project',
            headerShown: true,
          }} 
        />
        <Text style={styles.errorText}>Note not found</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Back to Project</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
        <Stack.Screen 
        options={{
          title: note.title,
          headerStyle: { backgroundColor: '#111111' },
          headerTintColor: '#FF2A2A',
          headerTitleStyle: { 
            color: '#F5F5F5',
            fontSize: 18,
            fontWeight: '600'
          },
          headerBackTitle: 'Project',
          headerShown: true,
          presentation: 'card',
          headerRight: () => (
            <View style={styles.headerButtons}>
              <TouchableOpacity onPress={handleEdit} style={styles.headerButton}>
                <Text style={styles.headerButtonText}>Edit</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleDelete} style={styles.headerButton}>
                <Text style={[styles.headerButtonText, styles.deleteButtonText]}>Delete</Text>
              </TouchableOpacity>
            </View>
          ),
        }} 
      />      <ScrollView style={styles.content}>
        <View style={styles.noteContainer}>
          <Text style={styles.noteTitle}>{note.title}</Text>
          
          <View style={styles.noteMeta}>
            <Text style={styles.noteMetaText}>
              Created: {new Date(note.created_at).toLocaleDateString()}
            </Text>
            {note.updated_at !== note.created_at && (
              <Text style={styles.noteMetaText}>
                Updated: {new Date(note.updated_at).toLocaleDateString()}
              </Text>
            )}
          </View>

          <View style={styles.contentContainer}>
            <Text style={styles.noteContent}>{note.content}</Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111111',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#111111',
    padding: 24,
  },
  content: {
    flex: 1,
  },
  loadingText: {
    fontSize: 16,
    color: '#9A9A9A',
    marginTop: 16,
    letterSpacing: 0.5,
  },
  errorText: {
    fontSize: 18,
    color: '#F5F5F5',
    marginBottom: 24,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  backButton: {
    backgroundColor: '#FF2A2A',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 16,
  },
  backButtonText: {
    color: '#F5F5F5',
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  headerButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  headerButtonText: {
    color: '#FF2A2A',
    fontSize: 16,
    fontWeight: '600',
  },
  deleteButtonText: {
    color: '#FF4444',
  },
  noteContainer: {
    padding: 24,
  },
  noteTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#F5F5F5',
    marginBottom: 16,
    letterSpacing: 0.5,
  },
  noteMeta: {
    marginBottom: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  noteMetaText: {
    fontSize: 14,
    color: '#9A9A9A',
    marginBottom: 4,
    letterSpacing: 0.3,
  },
  contentContainer: {
    backgroundColor: '#1E1E1E',
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  noteContent: {
    fontSize: 16,
    color: '#F5F5F5',
    lineHeight: 24,
    letterSpacing: 0.3,
  },
});