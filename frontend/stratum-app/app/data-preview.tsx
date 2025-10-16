import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, Platform, ScrollView, TextInput } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { fileService } from '../src/services/fileService';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Lazy import to avoid native bundling issues
let Papa: any = null;
let XLSX: any = null;

export default function DataPreviewScreen() {
  const { nodeId, name, kind } = useLocalSearchParams<{ nodeId: string; name: string; kind?: string }>();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [textContent, setTextContent] = useState<string | null>(null);
  const [table, setTable] = useState<string[][] | null>(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  // Wrap a string at fixed 15-character chunks with explicit newlines
  const wrap15 = (value: any): string => {
    const s = String(value ?? '');
    if (!s) return '';
    const out: string[] = [];
    for (let i = 0; i < s.length; i += 15) {
      out.push(s.slice(i, i + 15));
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
          if (!Papa) Papa = (await import('papaparse')).default || (await import('papaparse'));
          if (!XLSX) XLSX = await import('xlsx');

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
    if (!table) return;
    if (Platform.OS !== 'web') {
      Alert.alert('Save', 'Editing and saving is only available on web for now.');
      return;
    }
    try {
      setSaving(true);
      const ext = (name as string)?.toLowerCase() || '';
      let blob: Blob;
      if (ext.endsWith('.csv')) {
        if (!Papa) Papa = (await import('papaparse')).default || (await import('papaparse'));
        const csv = Papa.unparse(table);
        blob = new Blob([csv], { type: 'text/csv' });
      } else {
        if (!XLSX) XLSX = await import('xlsx');
        const ws = XLSX.utils.aoa_to_sheet(table);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
        const wbout = XLSX.write(wb, { bookType: ext.endsWith('.xls') ? 'xls' : 'xlsx', type: 'array' });
        blob = new Blob([wbout], { type: ext.endsWith('.xls') ? 'application/vnd.ms-excel' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      }
      // Upload via replaceFile
      const formData = new FormData();
      const filename = name as string;
      // On web, wrap blob in File so filename is sent
      const file = Platform.OS === 'web' ? new File([blob], filename, { type: blob.type }) : (blob as any);
      formData.append('file', file as any, filename);
      await fileService.replaceFile(nodeId as string, formData);
      setEditing(false);
      Alert.alert('Saved', 'File updated successfully.');
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Failed to save file');
    } finally {
      setSaving(false);
    }
  };

  const header = useMemo(() => {
    return (name as string) || (kind === 'csv' ? 'CSV' : 'Spreadsheet');
  }, [name, kind]);

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
      <ScrollView horizontal style={styles.outerHScroll} contentContainerStyle={{ flexGrow: 1 }}>
        <ScrollView style={styles.contentScroll} contentContainerStyle={{ padding: 12 }}>
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
            <View style={[styles.tableWrapper, { padding: 8 }] }>
              <View>
                {table.slice(0, 200).map((row, rIdx) => (
                  <View key={rIdx} style={styles.tableRow}>
                    {row.map((cell, cIdx) => {
                      const cellWidthOverride = Platform.OS === 'web' ? ({ width: '15ch' } as any) : { width: 120 };
                      const webPreWrap = Platform.OS === 'web' ? ({ whiteSpace: 'pre-wrap' } as any) : undefined;
                      return (
                        <View key={cIdx} style={[styles.tableCell, cellWidthOverride]}>
                          {editing ? (
                            <TextInput
                              style={[styles.cellInput, Platform.OS === 'web' ? ({ fontFamily: 'monospace' } as any) : undefined]}
                              multiline
                              value={String(cell ?? '')}
                              onChangeText={(txt) => {
                                setTable((prev) => {
                                  if (!prev) return prev;
                                  const next = prev.map((r) => r.slice());
                                  next[rIdx][cIdx] = txt;
                                  return next;
                                });
                              }}
                            />
                          ) : (
                            <Text style={[styles.cellText, webPreWrap]}>{wrap15(cell)}</Text>
                          )}
                        </View>
                      );
                    })}
                  </View>
                ))}
                {table.length > 200 && (
                  <Text style={styles.moreText}>Showing first 200 rows…</Text>
                )}
              </View>
            </View>
          ) : (
            <ScrollView style={styles.textWrapper} contentContainerStyle={{ padding: 12 }}>
              <Text style={styles.preText}>{textContent || 'No content to display'}</Text>
            </ScrollView>
          )
        )}
        </ScrollView>
      </ScrollView>
      <View style={styles.actions}>
        <TouchableOpacity style={styles.actionButton} onPress={() => setEditing((e) => !e)} disabled={!table}>
          <Text style={styles.actionButtonText}>{editing ? 'Stop Editing' : 'Edit'}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionButton, saving && { opacity: 0.6 }]} onPress={handleSave} disabled={!table || !editing || saving}>
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
  contentScroll: { flex: 1 },
  outerHScroll: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, color: '#9A9A9A' },
  errorText: { color: '#FF4444', fontSize: 16 },
  tableWrapper: { flex: 1, borderRadius: 12, borderWidth: 1, borderColor: '#2A2A2A', backgroundColor: '#0E0E0E' },
  tableVertical: { maxHeight: '100%' },
  tableRow: { flexDirection: 'row' },
  tableCell: { paddingVertical: 8, paddingHorizontal: 12, borderRightWidth: 1, borderRightColor: '#2A2A2A', borderBottomWidth: 1, borderBottomColor: '#2A2A2A', width: 200 },
  cellText: { color: '#EAEAEA', fontFamily: Platform.select({ web: 'monospace', default: undefined }), lineHeight: 18 },
  cellInput: { color: '#EAEAEA', paddingVertical: 4, paddingHorizontal: 6, borderWidth: 1, borderColor: '#333', borderRadius: 6, minHeight: 36, backgroundColor: '#151515' },
  moreText: { color: '#9A9A9A', padding: 8 },
  textWrapper: { flex: 1, borderRadius: 12, borderWidth: 1, borderColor: '#2A2A2A', backgroundColor: '#0E0E0E' },
  preText: { color: '#EAEAEA', fontFamily: Platform.select({ web: 'monospace', default: undefined }), lineHeight: 20 },
  actions: { flexDirection: 'row', gap: 12, padding: 16 },
  actionButton: { flex: 1, backgroundColor: '#2A2A2A', padding: 14, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: '#333' },
  closeButton: { backgroundColor: '#1A1A1A' },
  actionButtonText: { color: '#F5F5F5', fontWeight: '600' },
});
