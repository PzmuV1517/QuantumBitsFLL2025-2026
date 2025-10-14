import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  FlatList,
} from 'react-native';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { Stack } from 'expo-router';
import { projectService } from '../../src/services/projectService';
import { noteService } from '../../src/services/noteService';

interface Project {
  id: string;
  name: string;
  description?: string;
  owner_id: string;
  created_at: string;
  updated_at: string;
  is_active: boolean;
  members?: Member[];
}

interface Note {
  id: string;
  title: string;
  content?: string;
  author_id: string;
  created_at: string;
  updated_at: string;
}

interface Member {
  id: string;
  display_name: string;
  email: string;
  role: 'LEADER' | 'RESEARCHER' | 'GUEST';
}

export default function ProjectDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [project, setProject] = useState<Project | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'notes' | 'members'>('notes');

  useEffect(() => {
    loadProjectData();
  }, [id]);

  // Reload notes when screen comes back into focus
  useFocusEffect(
    React.useCallback(() => {
      if (project?.id) {
        noteService.getNotes(project.id).then(setNotes).catch(console.error);
      }
    }, [project?.id])
  );

  const loadProjectData = async () => {
    try {
      setLoading(true);
      const [projectData, notesData] = await Promise.all([
        projectService.getProject(id),
        noteService.getNotes(id),
      ]);
      
      setProject(projectData);
      setNotes(notesData);
      // Members are now included in projectData
      setMembers(projectData.members || []);
    } catch (error) {
      console.error('Error loading project:', error);
      Alert.alert('Error', 'Failed to load project details');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateNote = () => {
    router.push({
      pathname: '/create-note',
      params: { projectId: project?.id }
    });
  };

  const handleNotePress = (noteId: string) => {
    router.push({
      pathname: '/note-detail',
      params: { noteId, projectId: project?.id }
    });
  };

  const handleManageMembers = () => {
    // For now, show an alert since we haven't created the member management screen yet
    Alert.alert('Coming Soon', 'Member management screen will be available soon');
  };

  const renderNote = ({ item }: { item: Note }) => (
    <TouchableOpacity style={styles.noteCard} onPress={() => handleNotePress(item.id)}>
      <View style={styles.noteHeader}>
        <Text style={styles.noteTitle} numberOfLines={1}>{item.title}</Text>
        <Text style={styles.noteDate}>
          {new Date(item.updated_at).toLocaleDateString()}
        </Text>
      </View>
      {item.content && (
        <Text style={styles.notePreview} numberOfLines={2}>
          {item.content}
        </Text>
      )}
    </TouchableOpacity>
  );

  const renderMember = ({ item }: { item: Member }) => (
    <View style={styles.memberCard}>
      <View style={styles.memberAvatar}>
        <Text style={styles.memberAvatarText}>
          {item.display_name?.charAt(0).toUpperCase() || 'U'}
        </Text>
      </View>
      <View style={styles.memberInfo}>
        <Text style={styles.memberName}>{item.display_name}</Text>
        <Text style={styles.memberEmail}>{item.email}</Text>
      </View>
      <View style={styles.memberRole}>
        <Text style={styles.memberRoleText}>{item.role}</Text>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <Stack.Screen options={{ title: 'Loading...' }} />
        <ActivityIndicator size="large" color="#FF2A2A" />
        <Text style={styles.loadingText}>Loading project details...</Text>
      </View>
    );
  }

  if (!project) {
    return (
      <View style={styles.centerContainer}>
        <Stack.Screen options={{ title: 'Project Not Found' }} />
        <Text style={styles.errorText}>Project not found</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen 
        options={{ 
          title: project.name,
          headerStyle: { backgroundColor: '#111111' },
          headerTintColor: '#FF2A2A',
          headerTitleStyle: { 
            color: '#F5F5F5',
            fontSize: 18,
            fontWeight: '600'
          },
          headerBackTitle: 'Projects',
          headerShown: true,
        }} 
      />
      
      <ScrollView style={styles.content}>
        {/* Project Header */}
        <View style={styles.projectHeader}>
          <Text style={styles.projectName}>{project.name}</Text>
          {project.description && (
            <Text style={styles.projectDescription}>{project.description}</Text>
          )}
          <View style={styles.projectMeta}>
            <Text style={styles.projectMetaText}>
              Created: {new Date(project.created_at).toLocaleDateString()}
            </Text>
            <Text style={styles.projectMetaText}>
              Updated: {new Date(project.updated_at).toLocaleDateString()}
            </Text>
          </View>
        </View>

        {/* Tab Navigation */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'notes' && styles.activeTab]}
            onPress={() => setActiveTab('notes')}
          >
            <Text style={[styles.tabText, activeTab === 'notes' && styles.activeTabText]}>
              Notes ({notes.length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'members' && styles.activeTab]}
            onPress={() => setActiveTab('members')}
          >
            <Text style={[styles.tabText, activeTab === 'members' && styles.activeTabText]}>
              Members ({members.length})
            </Text>
          </TouchableOpacity>
        </View>

        {/* Tab Content */}
        <View style={styles.tabContent}>
          {activeTab === 'notes' ? (
            <View>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Recent Notes</Text>
                <TouchableOpacity style={styles.addButton} onPress={handleCreateNote}>
                  <Text style={styles.addButtonText}>+ Add Note</Text>
                </TouchableOpacity>
              </View>
              
              {notes.length > 0 ? (
                <FlatList
                  data={notes}
                  renderItem={renderNote}
                  keyExtractor={(item) => item.id}
                  scrollEnabled={false}
                />
              ) : (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyStateText}>No notes yet</Text>
                  <Text style={styles.emptyStateSubtext}>Create your first note to get started</Text>
                  <TouchableOpacity style={styles.createButton} onPress={handleCreateNote}>
                    <Text style={styles.createButtonText}>CREATE FIRST NOTE</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          ) : (
            <View>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Team Members</Text>
                <TouchableOpacity style={styles.addButton} onPress={handleManageMembers}>
                  <Text style={styles.addButtonText}>+ Manage</Text>
                </TouchableOpacity>
              </View>
              
              {members.length > 0 ? (
                <FlatList
                  data={members}
                  renderItem={renderMember}
                  keyExtractor={(item) => item.id}
                  scrollEnabled={false}
                />
              ) : (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyStateText}>No team members</Text>
                  <Text style={styles.emptyStateSubtext}>Invite colleagues to collaborate</Text>
                  <TouchableOpacity style={styles.createButton} onPress={handleManageMembers}>
                    <Text style={styles.createButtonText}>INVITE MEMBERS</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}
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
  projectHeader: {
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#2A2A2A',
  },
  projectName: {
    fontSize: 28,
    fontWeight: '700',
    color: '#F5F5F5',
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  projectDescription: {
    fontSize: 16,
    color: '#9A9A9A',
    lineHeight: 24,
    marginBottom: 16,
    letterSpacing: 0.5,
  },
  projectMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  projectMetaText: {
    fontSize: 12,
    color: '#9A9A9A',
    letterSpacing: 0.5,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#1A1A1A',
    margin: 24,
    borderRadius: 16,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  activeTab: {
    backgroundColor: '#FF2A2A',
  },
  tabText: {
    fontSize: 14,
    color: '#9A9A9A',
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  activeTabText: {
    color: '#F5F5F5',
  },
  tabContent: {
    paddingHorizontal: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#F5F5F5',
    letterSpacing: 0.5,
  },
  addButton: {
    backgroundColor: '#FF2A2A',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
  },
  addButtonText: {
    fontSize: 12,
    color: '#F5F5F5',
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  noteCard: {
    backgroundColor: '#1A1A1A',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  noteHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  noteTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#F5F5F5',
    flex: 1,
    marginRight: 12,
    letterSpacing: 0.5,
  },
  noteDate: {
    fontSize: 12,
    color: '#9A9A9A',
    letterSpacing: 0.5,
  },
  notePreview: {
    fontSize: 14,
    color: '#9A9A9A',
    lineHeight: 20,
    letterSpacing: 0.5,
  },
  memberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A1A1A',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  memberAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FF2A2A',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  memberAvatarText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#F5F5F5',
    letterSpacing: 0.5,
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#F5F5F5',
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  memberEmail: {
    fontSize: 14,
    color: '#9A9A9A',
    letterSpacing: 0.5,
  },
  memberRole: {
    backgroundColor: '#2A2A2A',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  memberRoleText: {
    fontSize: 12,
    color: '#FF2A2A',
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#F5F5F5',
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#9A9A9A',
    marginBottom: 24,
    letterSpacing: 0.5,
  },
  createButton: {
    backgroundColor: '#FF2A2A',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 16,
  },
  createButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#F5F5F5',
    letterSpacing: 0.5,
  },
});