import React, { useEffect, useMemo, useState, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, Platform, ScrollView, TextInput } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { fileService } from '../src/services/fileService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import TextFilePanel from '../src/components/data/TextFilePanel';
import CsvPanel from '../src/components/data/CsvPanel';
import ExcelPanel from '../src/components/data/ExcelPanel';

// Lazy import to avoid native bundling issues
let Papa: any = null;
let XLSX: any = null;
let AutoSizer: any = null;
let VariableSizeGrid: any = null;

export default function DataPreviewScreen() {
  const { nodeId, name, kind } = useLocalSearchParams<{ nodeId: string; name: string; kind?: string }>();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [textContent, setTextContent] = useState<string | null>(null);
  const [table, setTable] = useState<string[][] | null>(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [gridReady, setGridReady] = useState(false);
  const [originalTitle, setOriginalTitle] = useState<string>('');
  const [editableTitle, setEditableTitle] = useState<string>('');
  const [isNoteFile, setIsNoteFile] = useState(false);
  // markdown handled by TextFilePanel
  const gridRef = useRef<any>(null);
  const defaultCols = 1000; // virtual infinite feel
  const defaultRows = 1000;
  const colWidthPx = 96; // ~12ch monospace approximation in px
  const rowHeaderWidth = 28; // slimmer index column
  const rowHeightPx = 30;
  const [gridScroll, setGridScroll] = useState({ left: 0, top: 0, width: 0, height: 0 });

  // Inject global CSS for markdown rendering on web once
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const STYLE_ID = 'stratum-markdown-styles';
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      /* Global markdown styles for web */
      .markdown-body { color: #EAEAEA; line-height: 1.6; font-size: 14px; font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
      .markdown-body h1, .markdown-body h2, .markdown-body h3, .markdown-body h4, .markdown-body h5, .markdown-body h6 { color: #F5F5F5; margin-top: 1.5em; margin-bottom: 0.5em; font-weight: 600; }
      .markdown-body h1 { font-size: 2em; border-bottom: 1px solid #333; padding-bottom: 0.3em; }
      .markdown-body h2 { font-size: 1.5em; }
      .markdown-body h3 { font-size: 1.25em; }
      .markdown-body p { margin: 0 0 1em 0; color: #EAEAEA; }
      .markdown-body code { background: #1A1A1A; padding: 0.2em 0.4em; border-radius: 3px; font-size: 0.95em; font-family: SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace; color: #FF6B6B; }
      .markdown-body pre { background: #0A0A0A; padding: 1em; border-radius: 6px; overflow: auto; margin: 0 0 1em 0; }
      .markdown-body pre code { background: transparent; padding: 0; color: #EAEAEA; }
      .markdown-body blockquote { border-left: 4px solid #FF2A2A; padding-left: 1em; margin-left: 0; color: #CCCCCC; font-style: italic; }
      .markdown-body ul, .markdown-body ol { padding-left: 2em; margin: 0 0 1em 0; }
      .markdown-body li { margin-bottom: 0.5em; }
      .markdown-body a { color: #FF2A2A; text-decoration: none; }
      .markdown-body a:hover { text-decoration: underline; }
      .markdown-body table { border-collapse: collapse; width: 100%; margin: 0 0 1em 0; }
      .markdown-body th, .markdown-body td { border: 1px solid #333; padding: 0.5em; text-align: left; }
      .markdown-body th { background: #1A1A1A; font-weight: 600; }
      .markdown-body img { max-width: 100%; height: auto; }
      .markdown-body hr { border: none; border-top: 1px solid #333; margin: 1.5em 0; }
      /* Extra elements */
      .markdown-body mark { background: #665500; color: #fff3cd; padding: 0.1em 0.2em; border-radius: 2px; }
      .markdown-body ins { text-decoration: none; border-bottom: 2px solid #1db954; background: rgba(29,185,84,0.1); }
      .markdown-body sup { vertical-align: super; font-size: 0.75em; }
      .markdown-body sub { vertical-align: sub; font-size: 0.75em; }
      /* KaTeX layout */
      .markdown-body .katex-display { margin: 1em 0; overflow-x: auto; }
      .markdown-body .katex { font-size: 1em; }
    `;
    document.head.appendChild(style);

    // Inject KaTeX CSS for math rendering
    const KATEX_ID = 'stratum-katex-css';
    if (!document.getElementById(KATEX_ID)) {
      const link = document.createElement('link');
      link.id = KATEX_ID;
      link.rel = 'stylesheet';
      link.href = 'https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css';
      link.crossOrigin = 'anonymous';
      document.head.appendChild(link);
    }
  }, []);

  const ensureSize = useCallback((r: number, c: number) => {
    setTable((prev) => {
      if (!prev) return prev;
      const rows = prev.slice();
      while (rows.length <= r) rows.push([] as any);
      const row = rows[r] ? rows[r].slice() : [];
      while (row.length <= c) row.push('');
      rows[r] = row;
      return rows;
    });
  }, []);

  // Wrap a string at fixed N-character chunks with explicit newlines
  const WRAP_CHARS = 12;
  const wrap15 = (value: any): string => {
    const s = String(value ?? '');
    if (!s) return '';
    const out: string[] = [];
    for (let i = 0; i < s.length; i += WRAP_CHARS) {
      out.push(s.slice(i, i + WRAP_CHARS));
    }
    return out.join('\n');
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (Platform.OS !== 'web') {
          // For now show simple message with Download fallback on native
          const res = await fileService.downloadFile(nodeId);
          const reader = new FileReader();
          reader.onloadend = () => {
            if (!cancelled) {
              const content = typeof reader.result === 'string' ? reader.result : '';
              setTextContent(content);
            }
          };
          reader.readAsText(res.data);
        } else {
          const token = await AsyncStorage.getItem('authToken');
          const { blob }: any = await fileService.downloadFileStream(nodeId, token, undefined);
          const ext = (name as string)?.toLowerCase() || '';
          
          // Handle text files (txt, md, json)
            if (ext.endsWith('.txt') || ext.endsWith('.md') || ext.endsWith('.json')) {
            const text = await blob.text();
            setTextContent(text);
            // Markdown preloading now moved into MarkdownView/TextFilePanel
            
            // Check if this is a note file (by checking if it's a txt file, which might be a note)
            // We'll assume txt files could be notes and allow title editing
            // You could also check the kind parameter or make an API call to determine if it's in Notes folder
            if (ext.endsWith('.txt')) {
              setIsNoteFile(true);
              const filename = (name as string) || '';
              const titleWithoutExt = filename.endsWith('.txt') ? filename.slice(0, -4) : filename;
              setOriginalTitle(titleWithoutExt);
              setEditableTitle(titleWithoutExt);
            }
          } else {
            // Handle CSV/Excel files
            if (!Papa) Papa = (await import('papaparse')).default || (await import('papaparse'));
            if (!XLSX) XLSX = await import('xlsx');
            if (!AutoSizer) AutoSizer = (await import('react-virtualized-auto-sizer')).default;
            if (!VariableSizeGrid) VariableSizeGrid = (await import('react-window')).VariableSizeGrid;
            setGridReady(true);

            // (moved markdown preloading to the txt/md branch above)

            if (ext.endsWith('.csv')) {
              const text = await blob.text();
              const parsed = Papa.parse(text, { skipEmptyLines: true });
              if (parsed?.data) setTable(parsed.data as any);
              else setTextContent(text);
            } else if (ext.endsWith('.xlsx') || ext.endsWith('.xls')) {
              const arrayBuffer = await blob.arrayBuffer();
              const wb = XLSX.read(arrayBuffer, { type: 'array' });
              const firstSheet = wb.SheetNames[0];
              const ws = wb.Sheets[firstSheet];
              const json = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[];
              setTable(json as string[][]);
            } else {
              // Try CSV by MIME fallback
              try {
                const text = await blob.text();
                const parsed = Papa.parse(text, { skipEmptyLines: true });
                if (parsed?.data) setTable(parsed.data as any);
                else setTextContent(text);
              } catch {
                setError('Unsupported format for preview');
              }
            }
          }
        }
      } catch (e) {
        console.error(e);
        setError('Failed to load file');
      } finally {
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [nodeId]);

  const handleDownload = async () => {
    try {
      if (Platform.OS === 'web') {
        const token = await AsyncStorage.getItem('authToken');
        const { blob }: any = await fileService.downloadFileStream(nodeId, token, undefined);
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = (name as string) || 'download';
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
      } else {
        Alert.alert('Download', 'File downloaded (placeholder).');
      }
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Failed to download file');
    }
  };

  const handleSave = async () => {
    if (Platform.OS !== 'web') {
      Alert.alert('Save', 'Editing and saving is only available on web for now.');
      return;
    }
    try {
      setSaving(true);
      const ext = (name as string)?.toLowerCase() || '';
      let blob: Blob;
      let finalFilename = name as string;
      
      // Handle text files
      if (ext.endsWith('.txt') || ext.endsWith('.md') || ext.endsWith('.json')) {
        if (!textContent) return;
        const contentType = ext.endsWith('.json') ? 'application/json' : 'text/plain';
        blob = new Blob([textContent], { type: contentType });
        
        // For note files, check if title changed and update filename
        if (isNoteFile && editableTitle !== originalTitle) {
          const newFilename = `${editableTitle}.txt`;
          finalFilename = newFilename;
          
          // Rename the file first
          try {
            await fileService.renameNode(nodeId as string, newFilename);
            setOriginalTitle(editableTitle); // Update the original title
          } catch (e) {
            console.error('Failed to rename file:', e);
            Alert.alert('Warning', 'Failed to rename file, but content will be saved.');
          }
        }
      } else if (table) {
        // Handle CSV/Excel files
        // Trim trailing empty rows/columns to avoid growing file size unnecessarily
        let trimmed = table.map((r) => r.slice());
        // Trim columns
        let maxCol = 0;
        for (const r of trimmed) {
          for (let i = r.length - 1; i >= 0; i--) {
            if (String(r[i] ?? '').length > 0) { maxCol = Math.max(maxCol, i + 1); break; }
          }
        }
        trimmed = trimmed.map((r) => r.slice(0, maxCol));
        // Trim rows
        let lastRow = trimmed.length - 1;
        while (lastRow >= 0) {
          const row = trimmed[lastRow] || [];
          const hasData = row.some((v) => String(v ?? '').length > 0);
          if (hasData) break;
          lastRow--;
        }
        trimmed = trimmed.slice(0, Math.max(0, lastRow + 1));
        
        if (ext.endsWith('.csv')) {
          if (!Papa) Papa = (await import('papaparse')).default || (await import('papaparse'));
          const csv = Papa.unparse(trimmed);
          blob = new Blob([csv], { type: 'text/csv' });
        } else {
          if (!XLSX) XLSX = await import('xlsx');
          const ws = XLSX.utils.aoa_to_sheet(trimmed);
          const wb = XLSX.utils.book_new();
          XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
          const wbout = XLSX.write(wb, { bookType: ext.endsWith('.xls') ? 'xls' : 'xlsx', type: 'array' });
          blob = new Blob([wbout], { type: ext.endsWith('.xls') ? 'application/vnd.ms-excel' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        }
      } else {
        return;
      }
      
      // Upload via replaceFile
      const formData = new FormData();
      // On web, wrap blob in File so filename is sent
      const file = Platform.OS === 'web' ? new File([blob], finalFilename, { type: blob.type }) : (blob as any);
      formData.append('file', file as any, finalFilename);
      await fileService.replaceFile(nodeId as string, formData);
      // Keep current editing mode; do not force exit on save
      setDirty(false);
      Alert.alert('Saved', 'File updated successfully.');
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Failed to save file');
    } finally {
      setSaving(false);
    }
  };

  const header = useMemo(() => {
    const ext = (name as string)?.toLowerCase() || '';
    if (ext.endsWith('.txt')) {
      // For note files, show the editable title when editing, otherwise show the current title
      if (editing && isNoteFile) {
        return editableTitle || 'Text File';
      }
      return originalTitle || (name as string) || 'Text File';
    }
    if (ext.endsWith('.md')) return (name as string) || 'Markdown File';
    return (name as string) || (kind === 'csv' ? 'CSV' : 'Spreadsheet');
  }, [name, kind, editing, isNoteFile, editableTitle, originalTitle]);

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: header,
          headerStyle: { backgroundColor: '#111111' },
          headerTintColor: '#FF2A2A',
          headerTitleStyle: { color: '#F5F5F5' },
        }}
      />
      <View style={styles.outerContainer}>
        <View style={styles.contentContainer}>
        {loading && (
          <View style={styles.center}>
            <ActivityIndicator color="#FF2A2A" />
            <Text style={styles.loadingText}>Loading…</Text>
          </View>
        )}
        {!loading && error && (
          <View style={styles.center}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}
        {!loading && !error && (
          table ? (
            (() => {
              const ext = (name as string)?.toLowerCase() || '';
              const isCsv = ext.endsWith('.csv') || kind === 'csv';
              const Panel = isCsv ? CsvPanel : ExcelPanel;
              return (
                <Panel
                  table={table}
                  setTable={(updater: any) => setTable((prev) => updater(prev || [] as any) as any)}
                  editing={editing}
                  onDirty={() => setDirty(true)}
                />
              );
            })()
          ) : (
            <TextFilePanel
              editing={editing}
              isNoteFile={isNoteFile}
              editableTitle={editableTitle}
              setEditableTitle={(t) => { setEditableTitle(t); setDirty(true); }}
              textContent={textContent || ''}
              setTextContent={(t) => { setTextContent(t); setDirty(true); }}
              filename={(name as string) || ''}
              onDirty={() => setDirty(true)}
            />
          )
        )}
        </View>
      </View>
      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => {
            // Toggle edit mode without any prompts; keep dirty so Save remains available after
            setEditing((prev) => !prev);
          }}
          disabled={!table && !textContent}
        >
          <Text style={styles.actionButtonText}>{editing ? 'Stop Editing' : 'Edit'}</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.actionButton, saving && { opacity: 0.6 }, !dirty && { opacity: 0.6 }]} 
          onPress={handleSave} 
          disabled={(!table && !textContent) || saving || !dirty}
        >
          <Text style={styles.actionButtonText}>{saving ? 'Saving…' : 'Save'}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionButton]} onPress={handleDownload}>
          <Text style={styles.actionButtonText}>Download</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionButton, styles.closeButton]} onPress={() => router.back()}>
          <Text style={[styles.actionButtonText, { color: '#9A9A9A' }]}>Close</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#111111' },
  content: { flex: 1, padding: 12 },
  contentScroll: { flex: 1, minHeight: 0 },
  outerHScroll: { flex: 1 },
  outerContainer: { flex: 1 },
  contentContainer: { flex: 1, padding: 12 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, color: '#9A9A9A' },
  errorText: { color: '#FF4444', fontSize: 16 },
  // table/text styles moved into components
  actions: { flexDirection: 'row', gap: 12, padding: 16 },
  actionButton: { flex: 1, backgroundColor: '#2A2A2A', padding: 14, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: '#333' },
  closeButton: { backgroundColor: '#1A1A1A' },
  actionButtonText: { color: '#F5F5F5', fontWeight: '600' },
  headerCell: { backgroundColor: '#151515', borderRightWidth: 1, borderRightColor: '#2A2A2A', borderBottomWidth: 1, borderBottomColor: '#2A2A2A', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4, paddingVertical: 4 },
  headerText: { color: '#9A9A9A', fontSize: 10, fontWeight: '600' },
  markdownWrapper: {},
});
