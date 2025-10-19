import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet, Platform } from 'react-native';
import { fileService } from '../../services/fileService';

type Mode = 'day' | 'week' | 'month';

interface FileNode {
  id: string;
  name: string;
  type: 'file' | 'folder' | 'note';
  mime_type?: string;
  note_id?: string;
  created_at?: string;
  updated_at?: string;
}

export default function FileGallery({ projectId, onOpenItem }: { projectId: string; onOpenItem: (node: FileNode) => void; }) {
  const [mode, setMode] = useState<Mode>('day');
  const [loading, setLoading] = useState(false);
  const [files, setFiles] = useState<FileNode[]>([]);
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [FaListIcon, setFaListIcon] = useState<React.ComponentType<{ color?: string; size?: number }> | null>(null);
  const [IoGridIcon, setIoGridIcon] = useState<React.ComponentType<{ color?: string; size?: number }> | null>(null);
  const [FaRegFileIcon, setFaRegFileIcon] = useState<React.ComponentType<{ color?: string; size?: number }> | null>(null);

  useEffect(() => {
    if (!projectId) return;
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        const list = await fetchAllProjectFiles(projectId);
        if (mounted) setFiles(list);
      } catch (e) {
        console.error('Failed to load gallery files', e);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [projectId]);

  // Web-only dynamic import for icons to avoid bundling issues on native
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    import('react-icons/fa')
      .then((mod) => {
        setFaListIcon(() => mod.FaList);
        setFaRegFileIcon(() => mod.FaRegFile);
      })
      .catch(() => {});
    import('react-icons/io5')
      .then((mod) => setIoGridIcon(() => mod.IoGridOutline))
      .catch(() => {});
  }, []);

  const groups = useMemo(() => groupFiles(files, mode), [files, mode]);

  return (
    <View>
      <View style={styles.controlsRow}>
        {/* Left: D / W / M */}
        <View style={styles.controls}>
          {(['day','week','month'] as const).map((m) => (
            <TouchableOpacity key={m} style={[styles.modeBtn, mode === m && styles.modeBtnActive]} onPress={() => setMode(m)}>
              <Text style={[styles.modeText, mode === m && styles.modeTextActive]}>
                {m === 'day' ? 'D' : m === 'week' ? 'W' : 'M'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        {/* Right: Grid/List switcher */}
        <View style={styles.controls}>
          <TouchableOpacity style={[styles.modeBtn, view === 'grid' && styles.modeBtnActive]} onPress={() => setView('grid')}>
            {Platform.OS === 'web' && IoGridIcon ? (
              <IoGridIcon color={view === 'grid' ? '#F5F5F5' : '#9A9A9A'} size={16} />
            ) : (
              <Text style={[styles.modeText, view === 'grid' && styles.modeTextActive]}>▦</Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity style={[styles.modeBtn, view === 'list' && styles.modeBtnActive]} onPress={() => setView('list')}>
            {Platform.OS === 'web' && FaListIcon ? (
              <FaListIcon color={view === 'list' ? '#F5F5F5' : '#9A9A9A'} size={16} />
            ) : (
              <Text style={[styles.modeText, view === 'list' && styles.modeTextActive]}>≣</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
      {loading ? (
        <View style={{ paddingVertical: 24, alignItems: 'center' }}>
          <ActivityIndicator color="#FF2A2A" />
          <Text style={{ color: '#9A9A9A', marginTop: 8 }}>Loading gallery…</Text>
        </View>
      ) : groups.length === 0 ? (
        <View style={{ alignItems: 'center', paddingVertical: 48 }}>
          <Text style={{ fontSize: 18, fontWeight: '600', color: '#F5F5F5', marginBottom: 8, letterSpacing: 0.5 }}>No files</Text>
          <Text style={{ fontSize: 14, color: '#9A9A9A', marginBottom: 24, letterSpacing: 0.5 }}>Upload or create files to see them here</Text>
        </View>
      ) : (
        groups.map((group, idx) => (
          <View key={group.label + idx} style={{ marginBottom: 24 }}>
            <Text style={styles.groupHeader}>{group.label}</Text>
            {view === 'grid' ? (
              <View style={styles.grid}>
                {group.items.map((node) => (
                  <TouchableOpacity key={node.id} style={styles.tile} onPress={() => onOpenItem(node)}>
                    <View style={styles.thumb}>
                      {Platform.OS === 'web' && FaRegFileIcon ? (
                        <FaRegFileIcon color="#F5F5F5" size={24} />
                      ) : (
                        <Text style={styles.icon}>{iconFor(node)}</Text>
                      )}
                    </View>
                    <Text style={styles.name} numberOfLines={2}>{node.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            ) : (
              <View>
                {group.items.map((node) => (
                  <TouchableOpacity key={node.id} style={styles.listRow} onPress={() => onOpenItem(node)}>
                    <Text style={styles.listIcon}>{iconFor(node)}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.listName} numberOfLines={1}>{node.name}</Text>
                      <Text style={styles.listMeta}>{formatWhen(node)}</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        ))
      )}
    </View>
  );
}

async function fetchAllProjectFiles(projectId: string): Promise<FileNode[]> {
  const root = await fileService.listRoot(projectId);
  const files: FileNode[] = [];
  const queue: any[] = [];
  for (const n of root) {
    if (n.type === 'folder') queue.push(n);
    else files.push(n);
  }
  while (queue.length) {
    const folder = queue.shift();
    try {
      const children = await fileService.listChildren(folder.id);
      for (const c of children) {
        if (c.type === 'folder') queue.push(c);
        else files.push(c);
      }
    } catch (e) {
      console.warn('Failed to list children for folder', folder?.id);
    }
  }
  return files;
}

function groupFiles(files: FileNode[], mode: Mode) {
  const groups = new Map<string, { label: string; dateKey: number; items: FileNode[] }>();
  const toDate = (n: FileNode) => new Date(n?.created_at || n?.updated_at || Date.now());

  const startOfWeek = (d: Date) => {
    const tmp = new Date(d);
    const day = tmp.getDay();
    const diff = (day + 6) % 7; // Monday start
    tmp.setHours(0, 0, 0, 0);
    tmp.setDate(tmp.getDate() - diff);
    return tmp;
  };
  const startOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1);

  for (const n of files) {
    const d = toDate(n);
    let key = '';
    let label = '';
    let sortDate = 0;
    if (mode === 'day') {
      key = d.toISOString().slice(0, 10);
      label = d.toLocaleDateString();
      sortDate = new Date(key).getTime();
    } else if (mode === 'week') {
      const s = startOfWeek(d);
      key = `W:${s.toISOString().slice(0, 10)}`;
      label = `Week of ${s.toLocaleDateString()}`;
      sortDate = s.getTime();
    } else {
      const s = startOfMonth(d);
      key = `M:${s.getFullYear()}-${String(s.getMonth() + 1).padStart(2, '0')}`;
      label = `${s.toLocaleString(undefined, { month: 'long' })} ${s.getFullYear()}`;
      sortDate = s.getTime();
    }
    if (!groups.has(key)) groups.set(key, { label, dateKey: sortDate, items: [] });
    groups.get(key)!.items.push(n);
  }
  const out = Array.from(groups.values());
  out.sort((a, b) => b.dateKey - a.dateKey);
  out.forEach((g) => g.items.sort((a, b) => +new Date(b.created_at || b.updated_at || 0) - +new Date(a.created_at || a.updated_at || 0)));
  return out;
}

function iconFor(node: FileNode) {
  const lower = (node.name || '').toLowerCase();
  if ((node.mime_type && node.mime_type.startsWith('image/')) || /(\.png|\.jpg|\.jpeg|\.gif|\.webp|\.heic)$/i.test(lower)) return '📷';
  if (node.type === 'note') return '📝';
  if (lower.endsWith('.csv')) return '📊';
  if (lower.endsWith('.xlsx') || lower.endsWith('.xls')) return '📈';
  if (lower.endsWith('.md') || lower.endsWith('.txt')) return '📄';
  return '📁';
}

function formatWhen(node: FileNode) {
  const d = new Date(node.created_at || node.updated_at || Date.now());
  return d.toLocaleString();
}

const styles = StyleSheet.create({
  controlsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, paddingHorizontal: 2 },
  controls: { flexDirection: 'row', backgroundColor: '#1A1A1A', borderRadius: 12, borderWidth: 1, borderColor: '#2A2A2A' },
  modeBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 },
  modeBtnActive: { backgroundColor: '#FF2A2A' },
  modeText: { color: '#9A9A9A', fontWeight: '700', letterSpacing: 0.5 },
  modeTextActive: { color: '#F5F5F5' },
  groupHeader: { color: '#F5F5F5', fontWeight: '700', marginBottom: 8, letterSpacing: 0.5 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  tile: { width: '31%', minWidth: 120, backgroundColor: '#1A1A1A', borderRadius: 12, borderWidth: 1, borderColor: '#2A2A2A', padding: 8 },
  thumb: { width: '100%', aspectRatio: 1, borderRadius: 8, backgroundColor: '#0A0A0A', justifyContent: 'center', alignItems: 'center', marginBottom: 6 },
  icon: { fontSize: 24, color: '#F5F5F5' },
  name: { color: '#CFCFCF', fontSize: 12 },
  listRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1A1A1A', borderRadius: 12, borderWidth: 1, borderColor: '#2A2A2A', padding: 10, marginBottom: 8 },
  listIcon: { fontSize: 20, color: '#F5F5F5', marginRight: 10 },
  listName: { color: '#F5F5F5', fontSize: 14, fontWeight: '600' },
  listMeta: { color: '#9A9A9A', fontSize: 12 },
});
