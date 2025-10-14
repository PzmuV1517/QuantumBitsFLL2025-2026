import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { projectService } from '../../src/services/projectService';

export default function ProjectsScreen() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      const data = await projectService.getProjects();
      setProjects(data);
    } catch (error) {
      Alert.alert('Error', 'Failed to load projects');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadProjects();
  };

  const renderProject = ({ item }: any) => (
    <TouchableOpacity style={styles.projectCard} onPress={() => router.push(`/project/${item.id}`)}>
      <Text style={styles.projectName}>{item.name}</Text>
      <Text style={styles.projectDescription}>{item.description || 'No description'}</Text>
      <View style={styles.projectMeta}>
        <Text style={styles.dateText}>Created: {new Date(item.created_at).toLocaleDateString()}</Text>
      </View>
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
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Projects</Text>
      </View>
      {projects.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No projects yet</Text>
          <Text style={styles.emptySubtext}>Create your first project to get started</Text>
        </View>
      ) : (
        <FlatList data={projects} renderItem={renderProject} keyExtractor={(item: any) => item.id} refreshing={refreshing} onRefresh={handleRefresh} contentContainerStyle={styles.listContainer} />
      )}
      <TouchableOpacity style={styles.fab} onPress={() => router.push('/modal')}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#111111' },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#111111' },
  header: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    padding: 24, 
    paddingTop: 60, 
    backgroundColor: '#111111',
    borderBottomWidth: 1, 
    borderBottomColor: '#2A2A2A' 
  },
  headerTitle: { fontSize: 32, fontWeight: '700', color: '#F5F5F5', letterSpacing: 0.5 },
  listContainer: { padding: 16 },
  projectCard: { 
    backgroundColor: '#1A1A1A', 
    padding: 16, 
    borderRadius: 16, 
    marginBottom: 16, 
    borderWidth: 1,
    borderColor: '#2A2A2A',
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 4 }, 
    shadowOpacity: 0.4, 
    shadowRadius: 20, 
    elevation: 8 
  },
  projectName: { fontSize: 18, fontWeight: '600', color: '#F5F5F5', marginBottom: 8, letterSpacing: 0.5 },
  projectDescription: { fontSize: 14, color: '#9A9A9A', marginBottom: 12, lineHeight: 20 },
  projectMeta: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: 8, borderTopWidth: 1, borderTopColor: '#2A2A2A' },
  roleText: { fontSize: 12, color: '#FF2A2A', fontWeight: '600', letterSpacing: 0.5 },
  dateText: { fontSize: 12, color: '#9A9A9A', letterSpacing: 0.5 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  emptyText: { fontSize: 18, color: '#F5F5F5', marginBottom: 10, fontWeight: '600', letterSpacing: 0.5 },
  emptySubtext: { fontSize: 14, color: '#9A9A9A', textAlign: 'center', letterSpacing: 0.5 },
  fab: { 
    position: 'absolute', 
    right: 24, 
    bottom: 24, 
    width: 64, 
    height: 64, 
    borderRadius: 32, 
    backgroundColor: '#FF2A2A', 
    justifyContent: 'center', 
    alignItems: 'center', 
    shadowColor: '#FF2A2A', 
    shadowOffset: { width: 0, height: 4 }, 
    shadowOpacity: 0.4, 
    shadowRadius: 20, 
    elevation: 8 
  },
  fabText: { fontSize: 32, color: '#F5F5F5', lineHeight: 36, fontWeight: '300' }
});
