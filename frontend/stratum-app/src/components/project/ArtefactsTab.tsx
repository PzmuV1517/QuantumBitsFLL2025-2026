import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Modal, TextInput, Platform, ScrollView, Image } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { useRouter } from 'expo-router';
import { fileService } from '../../services/fileService';
import QRCodeView from '../common/QRCodeView';

interface FileNode { id: string; name: string; type: 'file' | 'folder' | 'note'; mime_type?: string; }
interface ArtefactMeta { id: string; name: string; number: number; previewFileId?: string; createdAt?: string; }

export default function ArtefactsTab({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [artefactFolder, setArtefactFolder] = useState<FileNode | null>(null);
  const [artefacts, setArtefacts] = useState<Array<{ folder: FileNode; meta: ArtefactMeta | null; previewUrl?: string }>>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [pickedImages, setPickedImages] = useState<Array<{ uri: string; name: string; mime: string }>>([]);
  const [previewIndex, setPreviewIndex] = useState<number>(0);
  const [notes, setNotes] = useState<string[]>(['']);
  const [creating, setCreating] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

  useEffect(() => {
    if (projectId) load();
  }, [projectId]);

  const load = async () => {
    try {
      setLoading(true);
      // Ensure top-level Artefacts folder exists
      const root = await fileService.listRoot(projectId);
      let af = root.find((n: any) => n.type === 'folder' && n.name === 'Artefacts');
      if (!af) {
        af = await fileService.createFolder(projectId, 'Artefacts');
      }
      setArtefactFolder(af);
      // List child folders as artefacts
      const children = await fileService.listChildren(af.id);
      const folders = children.filter((c: any) => c.type === 'folder');
      const out: Array<{ folder: FileNode; meta: ArtefactMeta | null; previewUrl?: string }> = [];
      for (const f of folders) {
        let meta: ArtefactMeta | null = null;
        let previewUrl: string | undefined = undefined;
        try {
          const grand = await fileService.listChildren(f.id);
          const metaFile = grand.find((c: any) => c.type === 'file' && (c.name === 'artefact.json' || c.name.endsWith('.json')));
          if (metaFile) {
            const res = await fileService.downloadFile(metaFile.id);
            const text = await (res.data?.text?.() || res.data?.arrayBuffer?.().then((b: any) => new TextDecoder().decode(b)));
            if (text) meta = JSON.parse(text);
          }
          const pv = grand.find((c: any) => c.type === 'file' && /^preview\.(png|jpg|jpeg|webp)$/i.test(c.name));
          if (pv && Platform.OS === 'web') {
            const blobRes = await fileService.downloadFile(pv.id);
            const blob = blobRes.data;
            const url = URL.createObjectURL(blob);
            previewUrl = url;
          }
        } catch {}
        out.push({ folder: f, meta, previewUrl });
      }
      // Sort by number desc then name
      out.sort((a, b) => (b.meta?.number || 0) - (a.meta?.number || 0) || a.folder.name.localeCompare(b.folder.name));
      setArtefacts(out);
    } catch (e) {
      console.error('Failed to load artefacts', e);
    } finally {
      setLoading(false);
    }
  };

  const pickImages = async () => {
    const res = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true, multiple: true, type: 'image/*' });
    if (res.canceled) return;
    const items = res.assets.map((a) => ({ uri: a.uri, name: a.name || 'image', mime: a.mimeType || 'image/jpeg' }));
    setPickedImages((prev) => [...prev, ...items]);
  };

  const addNoteField = () => setNotes((n) => [...n, '']);

  const createArtefact = async () => {
    if (!artefactFolder) return;
    if (!newName.trim()) return;
    try {
      setCreating(true);
      // Determine sequence number
      const children = await fileService.listChildren(artefactFolder.id);
      const existingFolders = children.filter((c: any) => c.type === 'folder');
      const number = existingFolders.length + 1;
      // Create folder
  const folder = await fileService.createFolder(projectId, newName.trim(), artefactFolder.id as any);
      // Upload images
      const uploadedIds: string[] = [];
      for (let i = 0; i < pickedImages.length; i++) {
        const img = pickedImages[i];
        const fd = new FormData();
        fd.append('parent_id', String(folder.id));
        if (Platform.OS === 'web') {
          const blob = await fetch(img.uri).then((r) => r.blob());
          const file = new File([blob], img.name, { type: img.mime });
          fd.append('file', file, img.name);
        } else {
          fd.append('file', { uri: img.uri, name: img.name, type: img.mime } as any);
        }
        const up = await fileService.uploadFile(projectId, fd);
        uploadedIds.push(up.id || up.file_id || up.node_id || up?.file?.id);
      }
      // Generate and upload preview (web only for now)
      let previewFileId: string | undefined;
      if (Platform.OS === 'web' && pickedImages[previewIndex]) {
        try {
          const blob = await downscaleWebImage(pickedImages[previewIndex].uri, 512, 512, 0.6);
          const fd = new FormData();
          fd.append('parent_id', String(folder.id));
          const file = new File([blob], 'preview.jpg', { type: 'image/jpeg' });
          fd.append('file', file, 'preview.jpg');
          const up = await fileService.uploadFile(projectId, fd);
          previewFileId = up.id || up.file_id || up.node_id || up?.file?.id;
        } catch (e) { console.warn('Preview generation failed', e); }
      }
      // Upload notes as text files (web only for now)
      const noteFileIds: string[] = [];
      for (let idx = 0; idx < notes.length; idx++) {
        const content = notes[idx]?.trim();
        if (!content) continue;
        if (Platform.OS === 'web') {
          const blob = new Blob([content], { type: 'text/plain' });
          const fd = new FormData();
          fd.append('parent_id', String(folder.id));
          const file = new File([blob], `note-${idx + 1}.txt`, { type: 'text/plain' });
          fd.append('file', file, `note-${idx + 1}.txt`);
          const up = await fileService.uploadFile(projectId, fd);
          noteFileIds.push(up.id || up.file_id || up.node_id || up?.file?.id);
        }
      }
      // Upload artefact.json
      const meta: ArtefactMeta = { id: folder.id, name: newName.trim(), number, previewFileId, createdAt: new Date().toISOString() };
      if (Platform.OS === 'web') {
        const blob = new Blob([JSON.stringify(meta, null, 2)], { type: 'application/json' });
        const fd = new FormData();
        fd.append('parent_id', String(folder.id));
        const file = new File([blob], 'artefact.json', { type: 'application/json' });
        fd.append('file', file, 'artefact.json');
        await fileService.uploadFile(projectId, fd);
      }
      setShowCreate(false);
      setNewName('');
      setPickedImages([]);
      setNotes(['']);
      setPreviewIndex(0);
      await load();
    } catch (e) {
      console.error('Failed to create artefact', e);
    } finally {
      setCreating(false);
    }
  };

  const linkForFolder = (folderId: string) => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      return `${window.location.origin}/artefact/${folderId}`;
    }
    return `artefact://${folderId}`;
  };

  return (
    <View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <Text style={{ color: '#F5F5F5', fontWeight: '700', fontSize: 16 }}>Artefacts</Text>
        <TouchableOpacity style={styles.primaryBtn} onPress={() => setShowCreate(true)}>
          <Text style={styles.primaryBtnText}>New Artefact</Text>
        </TouchableOpacity>
      </View>
      {loading ? (
        <View style={{ paddingVertical: 24, alignItems: 'center' }}>
          <ActivityIndicator color="#FF2A2A" />
          <Text style={{ color: '#9A9A9A', marginTop: 8 }}>Loading artefacts…</Text>
        </View>
      ) : artefacts.length === 0 ? (
        <View style={{ alignItems: 'center', paddingVertical: 24 }}>
          <Text style={{ color: '#9A9A9A' }}>No artefacts yet</Text>
        </View>
      ) : (
        <View style={styles.grid}>
          {artefacts.map(({ folder, meta, previewUrl }) => (
            <TouchableOpacity key={folder.id} style={styles.card} onPress={() => router.push({ pathname: '/artefact/[id]' as any, params: { id: folder.id } as any })}>
              <View style={styles.previewBox}>
                {previewUrl ? (
                  <Image source={{ uri: previewUrl }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                ) : (
                  <Text style={{ color: '#9A9A9A' }}>No preview</Text>
                )}
              </View>
              <Text style={styles.cardTitle} numberOfLines={1}>{meta?.name || folder.name}</Text>
              <Text style={styles.cardMeta}>#{meta?.number ?? '—'}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Create Modal */}
      <Modal visible={showCreate} animationType="slide" presentationStyle="fullScreen" transparent={false} onRequestClose={() => setShowCreate(false)}>
        <View style={styles.modalScreen}>
        <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.modalRoot}>
          <Text style={styles.modalTitle}>New Artefact</Text>
          <TextInput placeholder="Artefact name" placeholderTextColor="#777" value={newName} onChangeText={setNewName} style={styles.input} />
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <Text style={styles.modalLabel}>Pictures</Text>
            <TouchableOpacity style={styles.secondaryBtn} onPress={pickImages}><Text style={styles.secondaryBtnText}>Add Pictures</Text></TouchableOpacity>
          </View>
          {pickedImages.length > 0 ? (
            <View style={{ gap: 8 }}>
              {pickedImages.map((img, idx) => (
                <TouchableOpacity key={idx} style={[styles.imageRow, previewIndex === idx && styles.imageRowActive]} onPress={() => setPreviewIndex(idx)}>
                  <Text style={{ color: '#F5F5F5' }}>{img.name}</Text>
                  <Text style={{ color: previewIndex === idx ? '#FF2A2A' : '#9A9A9A' }}>{previewIndex === idx ? 'Preview' : 'Set preview'}</Text>
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <Text style={{ color: '#9A9A9A', marginBottom: 8 }}>No images selected</Text>
          )}

          <Text style={styles.modalLabel}>Notes (.txt)</Text>
          {notes.map((n, i) => (
            <TextInput key={i} multiline placeholder={`Note ${i + 1}`} placeholderTextColor="#777" value={n} onChangeText={(t) => setNotes((arr) => arr.map((x, idx) => (idx === i ? t : x)))} style={[styles.input, { height: 120, textAlignVertical: 'top' }]} />
          ))}
          <TouchableOpacity onPress={addNoteField} style={styles.secondaryBtn}><Text style={styles.secondaryBtnText}>Add another note</Text></TouchableOpacity>

          {/* QR Preview (web) */}
          <View style={{ marginTop: 16, alignItems: 'center' }}>
            <Text style={styles.modalLabel}>QR (for this artefact page)</Text>
            <QRCodeView value={linkForFolder('new')} label={`${newName || 'Artefact'} #—`} onReadyDataUrl={setQrDataUrl} />
            {Platform.OS === 'web' && qrDataUrl ? (
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                <TouchableOpacity style={styles.secondaryBtn} onPress={() => printQr(qrDataUrl, `${newName || 'artefact'}-qr.png`, `${newName || 'Artefact'} #—`)}>
                  <Text style={styles.secondaryBtnText}>Print</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.secondaryBtn} onPress={() => downloadDataUrl(qrDataUrl, `${newName || 'artefact'}-qr.png`)}>
                  <Text style={styles.secondaryBtnText}>Save</Text>
                </TouchableOpacity>
              </View>
            ) : null}
          </View>

          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 16 }}>
            <TouchableOpacity style={[styles.secondaryBtn, { flex: 1, marginRight: 8 }]} onPress={() => setShowCreate(false)}><Text style={styles.secondaryBtnText}>Cancel</Text></TouchableOpacity>
            <TouchableOpacity style={[styles.primaryBtn, { flex: 1, marginLeft: 8 }]} onPress={createArtefact} disabled={creating}>
              <Text style={styles.primaryBtnText}>{creating ? 'Creating…' : 'Create Artefact'}</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

async function downscaleWebImage(uri: string, maxW: number, maxH: number, quality = 0.7): Promise<Blob> {
  const img = document.createElement('img');
  img.crossOrigin = 'anonymous';
  img.src = uri;
  await new Promise((res, rej) => { img.onload = () => res(null); img.onerror = rej; });
  let { width, height } = img;
  const scale = Math.min(maxW / width, maxH / height, 1);
  width = Math.floor(width * scale);
  height = Math.floor(height * scale);
  const canvas = document.createElement('canvas');
  canvas.width = width; canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context not available');
  ctx.drawImage(img, 0, 0, width, height);
  return await new Promise<Blob>((resolve) => canvas.toBlob((b) => resolve(b || new Blob()), 'image/jpeg', quality));
}

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

const styles = StyleSheet.create({
  modalScreen: { flex: 1, backgroundColor: '#111' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  card: { width: 180, backgroundColor: '#1A1A1A', borderRadius: 12, borderWidth: 1, borderColor: '#2A2A2A', padding: 8 },
  previewBox: { width: '100%', aspectRatio: 1, borderRadius: 8, backgroundColor: '#0A0A0A', alignItems: 'center', justifyContent: 'center', marginBottom: 6, overflow: 'hidden' },
  cardTitle: { color: '#F5F5F5', fontWeight: '700' },
  cardMeta: { color: '#9A9A9A', fontSize: 12 },
  primaryBtn: { backgroundColor: '#FF2A2A', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },
  primaryBtnText: { color: '#F5F5F5', fontWeight: '700' },
  secondaryBtn: { backgroundColor: '#222222', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: '#2A2A2A' },
  secondaryBtnText: { color: '#F5F5F5', fontWeight: '600' },
  modalRoot: { padding: 16, backgroundColor: '#111', gap: 10 },
  modalTitle: { color: '#F5F5F5', fontSize: 18, fontWeight: '700', marginBottom: 8 },
  modalLabel: { color: '#F5F5F5', fontWeight: '600', marginVertical: 8 },
  input: { backgroundColor: '#1A1A1A', borderRadius: 10, borderWidth: 1, borderColor: '#2A2A2A', paddingHorizontal: 12, paddingVertical: 10, color: '#F5F5F5', marginBottom: 8 },
  imageRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#1A1A1A', borderRadius: 10, borderWidth: 1, borderColor: '#2A2A2A', paddingHorizontal: 12, paddingVertical: 10 },
  imageRowActive: { borderColor: '#FF2A2A' },
});
