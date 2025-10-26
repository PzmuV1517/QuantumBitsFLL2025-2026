import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, ScrollView, TouchableOpacity, Image, Platform, Alert, Modal, TextInput } from 'react-native';
import { useLocalSearchParams, Stack, useRouter } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import QRCodeView from '../../src/components/common/QRCodeView';
import { fileService } from '../../src/services/fileService';
import { useAuth } from '../../src/contexts/AuthContext';
import { buildManifestFromChildren, ArtefactManifest } from '../../src/utils/artefactManifest';

interface FileNode { id: string; name: string; type: 'file' | 'folder' | 'note'; mime_type?: string; }
interface ArtefactMeta { id: string; name: string; number: number; previewFileId?: string; createdAt?: string; }

export default function ArtefactDetail() {
  const { id } = useLocalSearchParams<{ id: string }>(); // folder id
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [children, setChildren] = useState<FileNode[]>([]);
  const [meta, setMeta] = useState<ArtefactMeta | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [confirmName, setConfirmName] = useState('');
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (id) load();
  }, [id]);

  const load = async () => {
    try {
      setLoading(true);
      const ch = await fileService.listChildren(id as string);
      setChildren(ch);
      // meta
  const metaFile = ch.find((c: any) => c.type === 'file' && (c.name === 'artefact.json' || c.name.endsWith('.json')));
      if (metaFile) {
        try {
          const res = await fileService.downloadFile(metaFile.id);
          const text = await (res.data?.text?.() || res.data?.arrayBuffer?.().then((b: any) => new TextDecoder().decode(b)));
          if (text) setMeta(JSON.parse(text));
        } catch {}
      }
      // preview
  const pv = ch.find((c: any) => c.type === 'file' && /^preview\.(png|jpg|jpeg|webp)$/i.test(c.name));
      if (pv && Platform.OS === 'web') {
        const blobRes = await fileService.downloadFile(pv.id);
        const blob = blobRes.data;
        setPreviewUrl(URL.createObjectURL(blob));
      }
      // qr
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        setQrUrl(`${window.location.origin}/artefact/${id}`);
      }
    } catch (e) {
      console.error('Failed to load artefact', e);
    } finally {
      setLoading(false);
    }
  };

  const onDeleteArtefact = useCallback(() => {
    setConfirmName('');
    setShowDeleteModal(true);
  }, []);

  const uploadMoreFiles = async () => {
    const res = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true, multiple: true, type: '*/*' });
    if (res.canceled) return;
    for (const asset of res.assets) {
      const fd = new FormData();
      fd.append('parent_id', String(id));
      if (Platform.OS === 'web') {
        const blob = await fetch(asset.uri).then((r) => r.blob());
        const file = new File([blob], asset.name || 'file', { type: asset.mimeType || blob.type || 'application/octet-stream' });
        fd.append('file', file, file.name);
      } else {
        fd.append('file', { uri: asset.uri, name: asset.name || 'file', type: asset.mimeType || 'application/octet-stream' } as any);
      }
      await fileService.uploadFile(meta?.id || ('' as any), fd);
    }
    // After upload, refresh children and update artefact.json manifest
    try {
      const ch = await fileService.listChildren(id as string);
      setChildren(ch);
      const existingMetaFile = ch.find((c: any) => c.type === 'file' && (c.name === 'artefact.json' || c.name.endsWith('.json')));
      let existing: Partial<ArtefactManifest> | undefined = undefined;
      if (existingMetaFile) {
        try {
          const res = await fileService.downloadFile(existingMetaFile.id);
          const text = await (res.data?.text?.() || res.data?.arrayBuffer?.().then((b: any) => new TextDecoder().decode(b)));
          if (text) existing = JSON.parse(text);
        } catch {}
      }
      const pv = ch.find((c: any) => c.type === 'file' && /^preview\.(png|jpg|jpeg|webp)$/i.test(c.name));
      const manifest = buildManifestFromChildren(
        id as string,
        (existing as any)?.name || meta?.name || 'Artefact',
        (existing as any)?.number || meta?.number || 0,
        ch as any,
        { ...existing, previewFileId: pv?.id },
        { user: user || undefined, qrUrl: qrUrl || undefined }
      );
      if (existingMetaFile && Platform.OS === 'web') {
        const blob = new Blob([JSON.stringify(manifest, null, 2)], { type: 'application/json' });
        const fd = new FormData();
        const file = new File([blob], 'artefact.json', { type: 'application/json' });
        fd.append('file', file, 'artefact.json');
        await fileService.replaceFile(existingMetaFile.id, fd);
      }
    } catch (e) {
      console.error('Failed updating artefact.json after upload', e);
    }
    await load();
  };

  const notes = children.filter((c) => c.type === 'file' && /\.txt$/i.test(c.name));
  const images = children.filter((c) => c.type === 'file' && (c.mime_type?.startsWith('image/') || /\.(png|jpg|jpeg|gif|webp|heic)$/i.test(c.name)));

  return (
    <View style={{ flex: 1, backgroundColor: '#111' }}>
      <Stack.Screen 
        options={{ 
          title: meta?.name ? `${meta.name} #${meta.number ?? '—'}` : 'Artefact',
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
            <TouchableOpacity onPress={onDeleteArtefact} style={{ paddingHorizontal: 8, paddingVertical: 4 }}>
              <Text style={{ color: '#FF4444', fontWeight: '700' }}>Delete</Text>
            </TouchableOpacity>
          ),
        }} 
      />
      {loading ? (
        <View style={styles.center}><ActivityIndicator color="#FF2A2A" /><Text style={{ color: '#9A9A9A', marginTop: 8 }}>Loading…</Text></View>
      ) : (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 16 }}>
          {/* Hero section with preview */}
          <View style={styles.hero}>
            {previewUrl ? (
              <Image source={{ uri: previewUrl }} style={styles.heroImage} resizeMode="cover" />
            ) : (
              <View style={[styles.heroImage, { alignItems: 'center', justifyContent: 'center', backgroundColor: '#0A0A0A' }]}>
                <Text style={{ color: '#9A9A9A' }}>No preview</Text>
              </View>
            )}
            <View style={styles.heroOverlay} />
          </View>

          <View style={styles.contentPad}>
          {/* QR Section */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>QR Code</Text>
            {Platform.OS === 'web' && qrDataUrl ? (
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TouchableOpacity style={styles.addButton} onPress={() => printQr(qrDataUrl!, `${meta?.name || 'artefact'}-qr.png`, `${meta?.name || 'Artefact'} #${meta?.number ?? '—'}`)}>
                  <Text style={styles.addButtonText}>Print</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.addButton} onPress={() => downloadDataUrl(qrDataUrl!, `${meta?.name || 'artefact'}-qr.png`)}>
                  <Text style={styles.addButtonText}>Save</Text>
                </TouchableOpacity>
              </View>
            ) : null}
          </View>
          <View style={[styles.card, { alignItems: 'center' }]}>
            <QRCodeView value={qrUrl || ''} label={`${meta?.name || 'Artefact'} #${meta?.number ?? '—'}`} onReadyDataUrl={setQrDataUrl} />
          </View>

          {/* Files Section */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Files</Text>
            <TouchableOpacity style={styles.addButton} onPress={uploadMoreFiles}>
              <Text style={styles.addButtonText}>Upload Files</Text>
            </TouchableOpacity>
          </View>
          {images.length === 0 && notes.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>No files yet</Text>
              <Text style={styles.emptyStateSubtext}>Upload images or add notes</Text>
            </View>
          ) : (
            <View>
              {images.length > 0 ? (
                <View style={[styles.grid, { marginBottom: 8 }]}>
                  {images.map((img) => (
                    <View key={img.id} style={styles.fileCard}>
                      <Text style={styles.fileText}>{img.name}</Text>
                    </View>
                  ))}
                </View>
              ) : null}
              {notes.length > 0 ? (
                <View style={{ gap: 8 }}>
                  {notes.map((n) => (
                    <View key={n.id} style={styles.noteRow}>
                      <Text style={styles.fileText}>{n.name}</Text>
                    </View>
                  ))}
                </View>
              ) : null}
            </View>
          )}

          <View style={{ height: 16 }} />
          </View>
        </ScrollView>
      )}

      {/* Delete confirmation modal */}
      <Modal visible={showDeleteModal} transparent animationType="fade" onRequestClose={() => setShowDeleteModal(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Delete artefact</Text>
            <Text style={styles.modalText}>This will permanently delete this artefact and all its files and notes. Type the artefact name to confirm.</Text>
            <Text style={[styles.modalText, { marginTop: 8 }]}>
              Artefact name: <Text style={{ color: '#F5F5F5', fontWeight: '700' }}>{meta?.name || '—'}</Text>
            </Text>
            <TextInput
              value={confirmName}
              onChangeText={setConfirmName}
              placeholder="Type the artefact name"
              placeholderTextColor="#777"
              style={styles.input}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
              <TouchableOpacity style={[styles.secondaryBtn, { flex: 1 }]} onPress={() => setShowDeleteModal(false)} disabled={deleting}>
                <Text style={styles.secondaryBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.deleteBtn, { flex: 1, opacity: deleting || confirmName !== (meta?.name || '') ? 0.6 : 1 }]}
                disabled={deleting || confirmName !== (meta?.name || '')}
                onPress={async () => {
                  try {
                    setDeleting(true);
                    await fileService.deleteNode(id as string);
                    setShowDeleteModal(false);
                    router.back();
                  } catch (e) {
                    console.error('Failed to delete artefact', e);
                    Alert.alert('Error', 'Failed to delete artefact');
                  } finally {
                    setDeleting(false);
                  }
                }}
              >
                <Text style={styles.deleteBtnText}>{deleting ? 'Deleting…' : 'Delete'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, marginBottom: 8 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#F5F5F5' },
  addButton: { backgroundColor: '#FF2A2A', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12 },
  addButtonText: { color: '#F5F5F5', fontWeight: '600', fontSize: 12 },
  card: { backgroundColor: '#1A1A1A', borderRadius: 12, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: '#2A2A2A' },
  cardRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 },
  title: { color: '#F5F5F5', fontWeight: '700', fontSize: 16 },
  subtle: { color: '#9A9A9A', fontSize: 12 },
  preview: { width: '100%', aspectRatio: 1.6, borderRadius: 10, overflow: 'hidden', backgroundColor: '#0A0A0A', alignItems: 'center', justifyContent: 'center' },
  previewEmpty: { borderWidth: 1, borderColor: '#2A2A2A' },
  thumbSmall: { width: 72, height: 72, borderRadius: 10, overflow: 'hidden', backgroundColor: '#0A0A0A', alignItems: 'center', justifyContent: 'center' },
  hero: { width: '100%', aspectRatio: 3.4, position: 'relative' },
  heroImage: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  heroOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.25)' },
  heroContent: { position: 'absolute', left: 16, right: 16, bottom: 12 },
  heroTitle: { color: '#F5F5F5', fontSize: 22, fontWeight: '700' },
  heroSubtitle: { color: '#CFCFCF', fontSize: 14, marginTop: 2 },
  contentPad: { paddingHorizontal: 16 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  fileCard: { padding: 10, borderRadius: 12, borderWidth: 1, borderColor: '#2A2A2A', backgroundColor: '#1A1A1A' },
  noteRow: { padding: 10, borderRadius: 12, borderWidth: 1, borderColor: '#2A2A2A', backgroundColor: '#1A1A1A' },
  fileText: { color: '#F5F5F5' },
  emptyState: { alignItems: 'center', paddingVertical: 24 },
  emptyStateText: { fontSize: 16, fontWeight: '600', color: '#F5F5F5', marginBottom: 4 },
  emptyStateSubtext: { fontSize: 14, color: '#9A9A9A' },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center', padding: 16 },
  modalCard: { width: '100%', maxWidth: 420, backgroundColor: '#111', borderRadius: 12, borderWidth: 1, borderColor: '#2A2A2A', padding: 16 },
  modalTitle: { color: '#F5F5F5', fontSize: 18, fontWeight: '700', marginBottom: 8 },
  modalText: { color: '#CFCFCF' },
  input: { backgroundColor: '#1A1A1A', borderRadius: 10, borderWidth: 1, borderColor: '#2A2A2A', paddingHorizontal: 12, paddingVertical: 10, color: '#F5F5F5', marginTop: 8 },
  deleteBtn: { backgroundColor: '#3a0f0f', paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: '#5a1a1a', alignItems: 'center' },
  deleteBtnText: { color: '#FF4444', fontWeight: '700' },
  secondaryBtn: { backgroundColor: '#222222', paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: '#2A2A2A', alignItems: 'center' },
  secondaryBtnText: { color: '#F5F5F5', fontWeight: '600' },
});

function downloadDataUrl(dataUrl: string, filename: string) {
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

function printQr(dataUrl: string, filename: string, label?: string) {
  const win = window.open('', '_blank');
  if (!win) return;
  const html = `<!doctype html><html><head><title>QR</title><style>body{font-family:system-ui;display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;margin:0} img{width:320px;height:320px} h1{font-size:18px;margin-top:8px}</style></head><body><img src="${dataUrl}" alt="QR"/>${label ? `<h1>${label}</h1>` : ''}<script>setTimeout(()=>{window.print();},300);</script></body></html>`;
  win.document.write(html);
  win.document.close();
}
