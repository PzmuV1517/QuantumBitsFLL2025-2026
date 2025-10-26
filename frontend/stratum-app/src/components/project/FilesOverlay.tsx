import React from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, ScrollView, StyleSheet, Platform, Alert } from 'react-native';

interface FileNode {
  id: string;
  name: string;
  type: 'file' | 'folder' | 'note';
  mime_type?: string;
  is_locked?: boolean;
  note_id?: string;
}

interface Props {
  visible: boolean;
  title?: string;
  currentFolder: { id: string | null; name: string } | null;
  fileNodes: FileNode[];
  fileLoading: boolean;
  breadcrumbs?: { id: string | null; name: string }[];
  onNavigateBreadcrumb?: (index: number) => void;
  onClose: () => void;
  onLoadRoot: () => void;
  onOpenFolder: (node: FileNode) => void;
  onUpload: () => void;
  onCreateFolder: () => void;
  onDownload: (node: FileNode) => void;
  onRename: (node: FileNode) => void;
  onMove: (node: FileNode) => void;
  onDelete: (node: FileNode) => void;
  onOpenFile: (node: FileNode) => void;
}

export default function FilesOverlay({ visible, title = 'Files', currentFolder, fileNodes, fileLoading, breadcrumbs, onNavigateBreadcrumb, onClose, onLoadRoot, onOpenFolder, onUpload, onCreateFolder, onDownload, onRename, onMove, onDelete, onOpenFile }: Props) {
  if (!visible) return null;
  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose} style={{ padding: 8, marginRight: 8 }}>
          <Text style={{ color: '#FF2A2A', fontSize: 18 }}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={{ color: '#F5F5F5', fontSize: 18, fontWeight: '700' }}>{title}</Text>
      </View>
      <ScrollView style={{ flex: 1, padding: 24 }}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Files</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity style={styles.actionButton} onPress={onCreateFolder}>
              <Text style={styles.actionButtonText}>+ Folder</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton} onPress={onUpload}>
              <Text style={styles.actionButtonText}>+ Upload</Text>
            </TouchableOpacity>
          </View>
        </View>
        {fileLoading ? (
          <ActivityIndicator color="#FF2A2A" />
        ) : (
          <View>
            <View style={{ flexDirection: 'row', marginBottom: 12, alignItems: 'center', flexWrap: 'wrap' }}>
              {(breadcrumbs && breadcrumbs.length ? breadcrumbs : ([{ id: null, name: 'Root' }, ...(currentFolder ? [currentFolder] : [])]))
                .map((crumb, idx, arr) => (
                  <View key={`${crumb.id ?? 'root'}-${idx}`} style={{ flexDirection: 'row', alignItems: 'center' }}>
                    {idx < (arr.length - 1) ? (
                      <TouchableOpacity onPress={() => {
                        if (idx === 0) onLoadRoot();
                        if (onNavigateBreadcrumb) onNavigateBreadcrumb(idx);
                      }}>
                        <Text style={{ color: '#FF2A2A' }}>{idx === 0 ? 'Root' : crumb.name}</Text>
                      </TouchableOpacity>
                    ) : (
                      <Text style={{ color: '#9A9A9A' }}>{idx === 0 ? 'Root' : crumb.name}</Text>
                    )}
                    {idx < (arr.length - 1) && <Text style={{ color: '#9A9A9A', marginHorizontal: 6 }}>/</Text>}
                  </View>
                ))}
            </View>

            {fileNodes.length > 0 ? (
              <View>
                {fileNodes.map((node) => (
                  <View key={node.id} style={styles.fileRow}>
                    <Text style={styles.fileIcon}>{node.type === 'folder' ? '📁' : node.type === 'note' ? '📝' : '📄'}</Text>
                    <TouchableOpacity style={{ flex: 1 }} onPress={() => node.type === 'folder' ? onOpenFolder(node) : onOpenFile(node)}>
                      <Text style={styles.fileName}>{node.name}</Text>
                    </TouchableOpacity>
                    {node.is_locked && <Text style={styles.lockBadge}>LOCKED</Text>}
                    <View style={{ flexDirection: 'row', gap: 8, marginLeft: 8 }}>
                      {node.type === 'file' && (
                        <TouchableOpacity onPress={() => onDownload(node)}>
                          <Text style={{ color: '#9A9A9A' }}>Download</Text>
                        </TouchableOpacity>
                      )}
                      {!node.is_locked && (
                        <>
                          <TouchableOpacity onPress={() => onRename(node)}>
                            <Text style={{ color: '#9A9A9A' }}>Rename</Text>
                          </TouchableOpacity>
                          <TouchableOpacity onPress={() => onMove(node)}>
                            <Text style={{ color: '#9A9A9A' }}>Move</Text>
                          </TouchableOpacity>
                          <TouchableOpacity onPress={() => onDelete(node)}>
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
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#111111' },
  header: { paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#2A2A2A', flexDirection: 'row', alignItems: 'center' },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#F5F5F5', letterSpacing: 0.5 },
  actionButton: { backgroundColor: '#FF2A2A', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12 },
  actionButtonText: { fontSize: 12, color: '#F5F5F5', fontWeight: '600', letterSpacing: 0.5 },
  fileRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1A1A1A', borderRadius: 12, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: '#2A2A2A' },
  fileIcon: { fontSize: 18, marginRight: 10, color: '#F5F5F5' },
  fileName: { flex: 1, color: '#F5F5F5', fontSize: 16, letterSpacing: 0.3 },
  lockBadge: { color: '#FF4444', fontSize: 12, fontWeight: '700' },
  emptyState: { alignItems: 'center', paddingVertical: 48 },
  emptyStateText: { fontSize: 18, fontWeight: '600', color: '#F5F5F5', marginBottom: 8, letterSpacing: 0.5 },
  emptyStateSubtext: { fontSize: 14, color: '#9A9A9A', marginBottom: 24, letterSpacing: 0.5 },
});
