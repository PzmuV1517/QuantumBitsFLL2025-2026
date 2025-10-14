import React, { useState, useEffect, useLayoutEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  FlatList,
  TextInput,
  Modal,
} from 'react-native';
import { useLocalSearchParams, useRouter, useFocusEffect, useGlobalSearchParams } from 'expo-router';
import { Stack } from 'expo-router';
import { projectService } from '../../src/services/projectService';
import { noteService } from '../../src/services/noteService';
import { fileService } from '../../src/services/fileService';
import * as DocumentPicker from 'expo-document-picker';
import { Platform } from 'react-native';
import { useRef } from 'react';

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
  const globalParams = useGlobalSearchParams<{ tab?: string }>();
  const router = useRouter();
  const [project, setProject] = useState<Project | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'notes' | 'members' | 'files'>('notes');
  const [fileNodes, setFileNodes] = useState<any[]>([]);
  const [currentFolder, setCurrentFolder] = useState<{ id: string | null; name: string } | null>(null);
  const [fileLoading, setFileLoading] = useState(false);
  const [renameNode, setRenameNode] = useState<any | null>(null);
  const [renameText, setRenameText] = useState('');
  const [moveMode, setMoveMode] = useState<{ node: any | null } | null>(null);
  const [showNewFolderModal, setShowNewFolderModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [deleteNodeTarget, setDeleteNodeTarget] = useState<any | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [downloadingNodeId, setDownloadingNodeId] = useState<string | null>(null);
  const [downloadProgress, setDownloadProgress] = useState<number>(0); // 0..1
  const [downloadStatus, setDownloadStatus] = useState<'in-progress' | 'finalizing' | null>(null);
  const DOWNLOAD_FINALIZE_HOLD_MS = 1500; // keep 100% bar visible a bit longer so user sees completion

  useEffect(() => {
    loadProjectData();
  }, [id]);

  // Sync tab with route param when available
  useEffect(() => {
    const tabParam = (globalParams?.tab as string) || '';
    if (tabParam === 'notes' || tabParam === 'files' || tabParam === 'members') {
      setActiveTab(tabParam);
    }
  }, [globalParams?.tab]);

  // Reload notes when screen comes back into focus
  useFocusEffect(
    React.useCallback(() => {
      if (project?.id) {
        noteService.getNotes(project.id).then(setNotes).catch(console.error);
      }
    }, [project?.id])
  );

  // Reload project data when screen comes back into focus (after editing)
  useFocusEffect(
    React.useCallback(() => {
      if (id) {
        loadProjectData();
      }
    }, [id])
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

  const loadRootFiles = async () => {
    if (!id) return;
    try {
      setFileLoading(true);
      const nodes = await fileService.listRoot(id as string);
      setFileNodes(nodes);
      setCurrentFolder({ id: null as any, name: 'Root' });
    } catch (e) {
      console.error('Failed to load files:', e);
    } finally {
      setFileLoading(false);
    }
  };

  const openFolder = async (node: any) => {
    try {
      setFileLoading(true);
      const children = await fileService.listChildren(node.id);
      setFileNodes(children);
      setCurrentFolder({ id: node.id, name: node.name });
    } catch (e) {
      console.error('Failed to open folder:', e);
    } finally {
      setFileLoading(false);
    }
  };

  const uploadIntoCurrent = async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true, multiple: false, type: '*/*' });
      if (res.canceled) return;
      const asset = res.assets[0];
      
      console.log('Upload asset:', { uri: asset.uri, name: asset.name, mimeType: asset.mimeType });
      
      const formData = new FormData();
      const parentId = (currentFolder && currentFolder.id) ? currentFolder.id : null;
      if (parentId) {
        formData.append('parent_id', String(parentId));
      }
      
      console.log('DEBUG: About to append file to FormData');
      
      if (Platform.OS === 'web') {
        // On web, fetch blob and create File
        const blob = await fetch(asset.uri).then(r => r.blob());
        let mime = asset.mimeType || blob.type || 'application/octet-stream';
        if (!mime || mime === 'application/octet-stream') {
          const lower = (asset.name || '').toLowerCase();
          if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) mime = 'image/jpeg';
          else if (lower.endsWith('.png')) mime = 'image/png';
          else if (lower.endsWith('.heic')) mime = 'image/heic';
        }
        const fileName = asset.name || (asset.uri.split('/').pop() || 'upload');
        const file = new File([blob], fileName, { type: mime });
        formData.append('file', file, fileName);
        console.log('DEBUG: Appended File to FormData:', { name: fileName, type: mime, size: blob.size });
      } else {
        // On native, use the { uri, name, type } shape that RN FormData accepts
        const fileName = asset.name || (asset.uri.split('/').pop() || 'upload');
        const fileType = asset.mimeType || (fileName.toLowerCase().endsWith('.png') ? 'image/png' : fileName.toLowerCase().match(/\.jpe?g$/) ? 'image/jpeg' : 'application/octet-stream');
        formData.append('file', {
          uri: asset.uri,
          name: fileName,
          type: fileType,
        } as any);
        console.log('DEBUG: Appended native file to FormData:', { uri: asset.uri, name: fileName, type: fileType });
      }
      
      // Log FormData contents (web only, as native FormData doesn't support iteration)
      if (Platform.OS === 'web') {
        console.log('DEBUG: FormData entries:');
        for (const [key, value] of (formData as any).entries()) {
          console.log(`  ${key}:`, value);
        }
      }
      
      // Call the API directly with formData
      const response = await fileService.uploadFile(id as string, formData);
      console.log('Upload success:', response);
      
      if (currentFolder?.id) await openFolder({ id: currentFolder.id, name: currentFolder.name });
      else await loadRootFiles();
    } catch (e) {
      console.error('Upload error:', e);
      Alert.alert('Upload failed', 'Could not upload file');
    }
  };  useEffect(() => {
    if (activeTab === 'files') {
      loadRootFiles();
    }
  }, [activeTab, id]);

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

  const handleProjectSettings = () => {
    // Directly navigate to the Edit Project screen
    if (project?.id) {
      router.push({
        pathname: '/edit-project',
        params: { projectId: project.id },
      });
    } else {
      Alert.alert('Please wait', 'Project is still loading.');
    }
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
          // Always provide a visible back control even after reload/deep link
          headerLeft: () => (
            <TouchableOpacity
              onPress={() => router.replace('/(tabs)')}
              style={styles.headerBackButton}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              activeOpacity={0.7}
            >
              <Text style={styles.headerBackIcon}>‹</Text>
            </TouchableOpacity>
          ),
          headerBackVisible: true,
          presentation: 'card',
          headerRight: () => (
            <TouchableOpacity 
              onPress={handleProjectSettings}
              style={styles.settingsButton}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              activeOpacity={0.7}
            >
              <Text style={styles.settingsIcon}>Settings</Text>
            </TouchableOpacity>
          ),
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
            style={[styles.tab, activeTab === 'files' && styles.activeTab]}
            onPress={() => setActiveTab('files')}
          >
            <Text style={[styles.tabText, activeTab === 'files' && styles.activeTabText]}>
              Files
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
          ) : activeTab === 'files' ? (
            <View>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Files</Text>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <TouchableOpacity
                    style={styles.addButton}
                    onPress={() => { setNewFolderName(''); setShowNewFolderModal(true); }}
                  >
                    <Text style={styles.addButtonText}>+ Folder</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.addButton} onPress={uploadIntoCurrent}>
                    <Text style={styles.addButtonText}>+ Upload</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {fileLoading ? (
                <ActivityIndicator color="#FF2A2A" />
              ) : fileNodes.length > 0 ? (
                <View>
                  {/* Breadcrumb */}
                  <View style={{ flexDirection: 'row', marginBottom: 12, alignItems: 'center' }}>
                    {currentFolder?.id ? (
                      <TouchableOpacity onPress={loadRootFiles}>
                        <Text style={{ color: '#FF2A2A', marginRight: 6 }}>Root</Text>
                      </TouchableOpacity>
                    ) : (
                      <Text style={{ color: '#9A9A9A', marginRight: 6 }}>Root</Text>
                    )}
                    {currentFolder?.id && (
                      <Text style={{ color: '#9A9A9A' }}>/ {currentFolder.name}</Text>
                    )}
                  </View>
                  {fileNodes.map((node) => (
                    <View
                      key={node.id}
                      style={styles.fileRow}
                    >
                      <Text style={styles.fileIcon}>{node.type === 'folder' ? '📁' : node.type === 'note' ? '📝' : '📄'}</Text>
                      <TouchableOpacity
                        style={{ flex: 1 }}
                        disabled={node.type === 'file'}
                        onPress={() => {
                          if (node.type === 'folder') return openFolder(node);
                          if (node.type === 'note') {
                            router.push({ pathname: '/note-detail', params: { noteId: node.note_id, projectId: project?.id } });
                          }
                        }}
                      >
                        {(() => {
                          if (node.type === 'file' && node.name) {
                            const hasDot = node.name.includes('.') && !node.name.startsWith('.');
                            if (hasDot) {
                              const base = node.name.replace(/\.[^.]+$/, '');
                              const ext = node.name.substring(node.name.lastIndexOf('.') + 1);
                              return (
                                <Text style={styles.fileName}>
                                  {base}
                                  <Text style={styles.fileExt}> .{ext}</Text>
                                </Text>
                              );
                            }
                          }
                          return <Text style={styles.fileName}>{node.name}</Text>;
                        })()}
                      </TouchableOpacity>
                      {node.is_locked && <Text style={styles.lockBadge}>LOCKED</Text>}
                      <View style={{ flexDirection: 'row', gap: 8, marginLeft: 8 }}>
                        {node.type === 'file' && (
                          <View style={{ alignItems: 'flex-end' }}>
                            <TouchableOpacity
                              disabled={downloadingNodeId === node.id}
                              onPress={async () => {
                                try {
                                  setDownloadingNodeId(node.id);
                                  setDownloadProgress(0);
                                  setDownloadStatus('in-progress');
                                  if (Platform.OS === 'web') {
                                    // Try streaming for accurate progress
                                    try {
                                      const token = await (await import('../../src/services/api')).default.interceptors?.request ? await (async () => { return await (await import('@react-native-async-storage/async-storage')).default.getItem('authToken'); })() : null;
                                      const streamResult = await fileService.downloadFileStream(node.id, token, (loaded: number, total: number) => {
                                        if (total) setDownloadProgress(loaded / total);
                                      }) as any; // streaming path returns { blob, contentLength }
                                      // Ensure progress reflects completion
                                      setDownloadProgress(1);
                                      const url = window.URL.createObjectURL(streamResult.blob);
                                      const a = document.createElement('a');
                                      a.href = url;
                                      a.download = node.name || 'download';
                                      document.body.appendChild(a);
                                      a.click();
                                      a.remove();
                                      window.URL.revokeObjectURL(url);
                                    } catch (e) {
                                      console.warn('Streaming failed, falling back to axios method', e);
                                      const res = await fileService.downloadFileWithProgress(node.id, (loaded: number, total: number) => {
                                        if (total) setDownloadProgress(loaded / total);
                                      });
                                      const blob = res.data;
                                      const url = window.URL.createObjectURL(blob);
                                      const a = document.createElement('a');
                                      a.href = url;
                                      a.download = node.name || 'download';
                                      document.body.appendChild(a);
                                      a.click();
                                      a.remove();
                                      window.URL.revokeObjectURL(url);
                                    }
                                  } else {
                                    const res = await fileService.downloadFileWithProgress(node.id, (loaded: number, total: number) => {
                                      if (total) setDownloadProgress(loaded / total);
                                    });
                                    const blob = res.data;
                                    // Placeholder mobile handling
                                    Alert.alert('Download', 'File downloaded (placeholder).');
                                  }
                                } catch (err) {
                                  console.error('Download failed', err);
                                  Alert.alert('Error', 'Failed to download file');
                                } finally {
                                  // Move to finalizing state so bar remains briefly even after we have blob
                                  setDownloadProgress(1);
                                  setDownloadStatus('finalizing');
                                  setTimeout(() => {
                                    setDownloadingNodeId(null);
                                    setDownloadProgress(0);
                                    setDownloadStatus(null);
                                  }, DOWNLOAD_FINALIZE_HOLD_MS);
                                }
                              }}
                            >
                              <Text style={{ color: '#9A9A9A' }}>
                                {downloadingNodeId === node.id
                                  ? downloadStatus === 'finalizing'
                                    ? 'Finalizing…'
                                    : `Downloading… ${downloadProgress > 0 ? Math.round(downloadProgress * 100) + '%' : ''}`
                                  : 'Download'}
                              </Text>
                            </TouchableOpacity>
                            {downloadingNodeId === node.id && (
                              <View style={styles.progressBarContainer}>
                                <View style={[styles.progressBarFill, { width: `${Math.round(downloadProgress * 100)}%` }]} />
                              </View>
                            )}
                          </View>
                        )}
                        {!node.is_locked && (
                          <>
                            <TouchableOpacity onPress={() => { 
                              setRenameNode(node); 
                              if (node.type === 'file' && node.name && node.name.includes('.') && !node.name.startsWith('.')) {
                                setRenameText(node.name.replace(/\.[^.]+$/, '')); // base only
                              } else {
                                setRenameText(node.name);
                              }
                            }}>
                              <Text style={{ color: '#9A9A9A' }}>Rename</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => setMoveMode({ node })}>
                              <Text style={{ color: '#9A9A9A' }}>Move</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => setDeleteNodeTarget(node)}>
                              <Text style={{ color: '#FF4444' }}>Delete</Text>
                            </TouchableOpacity>
                          </>
                        )}
                      </View>
                    </View>
                  ))}
                </View>
              ) : (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyStateText}>No files</Text>
                  <Text style={styles.emptyStateSubtext}>Create a folder or upload files</Text>
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

      {/* New Folder Modal */}
      <Modal visible={showNewFolderModal} transparent animationType="fade" onRequestClose={() => setShowNewFolderModal(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>New Folder</Text>
            <Text style={styles.modalText}>Enter a name for the new folder</Text>
            <TextInput
              style={styles.confirmInput}
              placeholder="Folder name"
              placeholderTextColor="#666"
              value={newFolderName}
              onChangeText={setNewFolderName}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalButton} onPress={() => setShowNewFolderModal(false)}>
                <Text style={styles.modalButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: '#2A2A2A', borderWidth: 1, borderColor: '#FF2A2A' }]}
                onPress={async () => {
                  const name = newFolderName.trim();
                  if (!name) return;
                  try {
                    const parentId = (currentFolder && currentFolder.id) ? currentFolder.id : undefined;
                    await fileService.createFolder(id as string, name, parentId as any);
                    setShowNewFolderModal(false);
                    if (currentFolder?.id) await openFolder({ id: currentFolder.id, name: currentFolder.name });
                    else await loadRootFiles();
                  } catch (e) {
                    Alert.alert('Error', 'Failed to create folder');
                  }
                }}
              >
                <Text style={styles.modalButtonText}>Create</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal visible={!!deleteNodeTarget} transparent animationType="fade" onRequestClose={() => setDeleteNodeTarget(null)}>
        {deleteNodeTarget && (
          <View style={styles.modalBackdrop}>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>Delete “{deleteNodeTarget.name}”?</Text>
              <Text style={styles.modalText}>
                This will permanently delete {deleteNodeTarget.type === 'folder' ? 'this folder and all of its contents' : 'this item' }. This action cannot be undone.
              </Text>
              <View style={styles.modalActions}>
                <TouchableOpacity style={styles.modalButton} onPress={() => setDeleteNodeTarget(null)} disabled={isDeleting}>
                  <Text style={styles.modalButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, { backgroundColor: '#3A0C0C', borderWidth: 1, borderColor: '#FF4444', opacity: isDeleting ? 0.7 : 1 }]}
                  disabled={isDeleting}
                  onPress={async () => {
                    try {
                      setIsDeleting(true);
                      await fileService.deleteNode(deleteNodeTarget.id);
                      setDeleteNodeTarget(null);
                      if (currentFolder?.id) await openFolder({ id: currentFolder.id, name: currentFolder.name });
                      else await loadRootFiles();
                    } catch (e) {
                      Alert.alert('Error', 'Failed to delete');
                    } finally {
                      setIsDeleting(false);
                    }
                  }}
                >
                  <Text style={[styles.modalButtonText, { color: '#FF4444' }]}>{isDeleting ? 'Deleting…' : 'Delete'}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}
      </Modal>

      {/* Rename Modal */}
      <Modal visible={!!renameNode} transparent animationType="fade" onRequestClose={() => setRenameNode(null)}>
        {renameNode && (
          <View style={styles.modalBackdrop}>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>Rename</Text>
              <Text style={styles.modalText}>Enter a new name for "{renameNode?.name || ''}"</Text>
              <TextInput
                style={styles.confirmInput}
                placeholder="New name"
                placeholderTextColor="#666"
                value={renameText}
                onChangeText={setRenameText}
              />
              <View style={styles.modalActions}>
                <TouchableOpacity style={styles.modalButton} onPress={() => setRenameNode(null)}>
                  <Text style={styles.modalButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, { backgroundColor: '#3A0C0C', borderWidth: 1, borderColor: '#FF4444' }]}
                  onPress={async () => {
                    try {
                      let finalName = renameText.trim();
                      if (renameNode.type === 'file' && renameNode.name && renameNode.name.includes('.') && !renameNode.name.startsWith('.')) {
                        const ext = renameNode.name.substring(renameNode.name.lastIndexOf('.') + 1);
                        finalName = `${finalName}.${ext}`;
                      }
                      await fileService.renameNode(renameNode.id, finalName);
                      setRenameNode(null);
                      if (currentFolder?.id) await openFolder({ id: currentFolder.id, name: currentFolder.name });
                      else await loadRootFiles();
                    } catch (e) {
                      Alert.alert('Error', 'Failed to rename');
                    }
                  }}
                >
                  <Text style={[styles.modalButtonText, { color: '#FF4444' }]}>Rename</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}
      </Modal>

      {/* Move Mode Banner */}
      {moveMode?.node && (
        <View style={styles.moveBanner}>
          <Text style={{ color: '#F5F5F5', flex: 1 }}>
            Select destination for "{moveMode.node.name}" then tap Move Here
          </Text>
          <TouchableOpacity
            style={[styles.addButton, { marginRight: 8 }]}
            onPress={async () => {
              try {
                const destParentId = currentFolder?.id || null;
                await fileService.moveNode(moveMode.node.id, (destParentId || undefined) as any);
                setMoveMode(null);
                if (currentFolder?.id) await openFolder({ id: currentFolder.id, name: currentFolder.name });
                else await loadRootFiles();
              } catch (e) {
                Alert.alert('Error', 'Failed to move');
              }
            }}
          >
            <Text style={styles.addButtonText}>Move Here</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.addButton, { backgroundColor: '#2A2A2A' }]} onPress={() => setMoveMode(null)}>
            <Text style={styles.addButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      )}
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
  fileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  fileIcon: {
    fontSize: 18,
    marginRight: 10,
    color: '#F5F5F5',
  },
  fileName: {
    flex: 1,
    color: '#F5F5F5',
    fontSize: 16,
    letterSpacing: 0.3,
  },
  fileExt: {
    color: '#9A9A9A',
    fontSize: 14,
  },
  lockBadge: {
    color: '#FF4444',
    fontSize: 12,
    fontWeight: '700',
  },
  progressBarContainer: {
    marginTop: 4,
    width: 120,
    height: 6,
    backgroundColor: '#2A2A2A',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#FF2A2A',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    backgroundColor: '#1E1E1A',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#333',
    width: '100%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#F5F5F5',
    marginBottom: 8,
  },
  modalText: {
    fontSize: 14,
    color: '#CCCCCC',
    marginBottom: 16,
    lineHeight: 20,
  },
  confirmInput: {
    backgroundColor: '#121212',
    color: '#F5F5F5',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333',
    marginBottom: 16,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  modalButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#2A2A2A',
  },
  modalButtonText: {
    color: '#F5F5F5',
    fontSize: 14,
    fontWeight: '600',
  },
  moveBanner: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
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
  settingsButton: {
    padding: 8,
    marginRight: 8,
  },
  settingsIcon: {
    fontSize: 16,
    color: '#FF2A2A',
    fontWeight: '600',
  },
  headerBackButton: {
    padding: 8,
    marginLeft: 8,
  },
  headerBackIcon: {
    color: '#FF2A2A',
    fontSize: 22,
    fontWeight: '700',
    marginTop: -2,
  },
});