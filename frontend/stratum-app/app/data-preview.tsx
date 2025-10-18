import React, { useEffect, useMemo, useState, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, Platform, ScrollView, TextInput } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { fileService } from '../src/services/fileService';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
  const gridRef = useRef<any>(null);
  const defaultCols = 1000; // virtual infinite feel
  const defaultRows = 1000;
  const colWidthPx = 96; // ~12ch monospace approximation in px
  const rowHeaderWidth = 28; // slimmer index column
  const rowHeightPx = 30;
  const [gridScroll, setGridScroll] = useState({ left: 0, top: 0, width: 0, height: 0 });

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
          
          // Handle text files (txt, md)
          if (ext.endsWith('.txt') || ext.endsWith('.md')) {
            const text = await blob.text();
            setTextContent(text);
            
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
      if (ext.endsWith('.txt') || ext.endsWith('.md')) {
        if (!textContent) return;
        blob = new Blob([textContent], { type: 'text/plain' });
        
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
      <ScrollView horizontal style={styles.outerHScroll} contentContainerStyle={{ flexGrow: 1 }}>
        <ScrollView style={styles.contentScroll} contentContainerStyle={{ flexGrow: 1, padding: 12 }}>
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
            Platform.OS === 'web' && gridReady && AutoSizer && VariableSizeGrid ? (
              <View style={{ flex: 1, minHeight: 0 }}>
                <AutoSizer>
                  {({ width, height }: any) => (
                    <View style={{ width, height }}>
                      {/* Column header (render only visible range) */}
                      <View style={{ flexDirection: 'row' }}>
                        <View style={[styles.headerCell, { width: rowHeaderWidth, height: rowHeightPx }]} />
                        <View style={{ width: width - rowHeaderWidth, height: rowHeightPx, overflow: 'hidden' }}>
                          {(() => {
                            const visibleCols = Math.ceil((width - rowHeaderWidth) / colWidthPx) + 1;
                            const startCol = Math.floor(gridScroll.left / colWidthPx);
                            const offsetX = -(gridScroll.left % colWidthPx);
                            const cells = [] as any[];
                            for (let c = startCol; c < Math.min(defaultCols, startCol + visibleCols); c++) {
                              cells.push(
                                <View key={c} style={[styles.headerCell, { width: colWidthPx, height: rowHeightPx }]}>
                                  <Text style={styles.headerText}>{c + 1}</Text>
                                </View>
                              );
                            }
                            return <View style={{ flexDirection: 'row', transform: [{ translateX: offsetX }] }}>{cells}</View>;
                          })()}
                        </View>
                      </View>
                      <View style={{ flexDirection: 'row', flex: 1, minHeight: 0 }}>
                        {/* Row header (render only visible range) */}
                        <View style={{ width: rowHeaderWidth, overflow: 'hidden' }}>
                          {(() => {
                            const visibleRows = Math.ceil((height - rowHeightPx) / rowHeightPx) + 1;
                            const startRow = Math.floor(gridScroll.top / rowHeightPx);
                            const offsetY = -(gridScroll.top % rowHeightPx);
                            const rows = [] as any[];
                            for (let r = startRow; r < Math.min(defaultRows, startRow + visibleRows); r++) {
                              rows.push(
                                <View key={r} style={[styles.headerCell, { height: rowHeightPx }]}>
                                  <Text style={styles.headerText}>{r + 1}</Text>
                                </View>
                              );
                            }
                            return <View style={{ transform: [{ translateY: offsetY }] }}>{rows}</View>;
                          })()}
                        </View>
                        {/* Grid */}
                        <View style={{ flex: 1 }}>
                          <VariableSizeGrid
                            ref={gridRef}
                            columnCount={defaultCols}
                            rowCount={defaultRows}
                            columnWidth={() => colWidthPx}
                            rowHeight={() => rowHeightPx}
                            width={width - rowHeaderWidth}
                            height={height - rowHeightPx}
                            itemKey={({ columnIndex, rowIndex }: any) => `${rowIndex}:${columnIndex}`}
                            onScroll={({ scrollLeft, scrollTop }: any) => {
                              setGridScroll((prev) => ({ ...prev, left: scrollLeft, top: scrollTop, width, height }));
                            }}
                          >
                            {({ columnIndex, rowIndex, style }: any) => {
                              const r = rowIndex;
                              const c = columnIndex;
                              const value = table?.[r]?.[c] ?? '';
                              const webPreWrap = Platform.OS === 'web' ? ({ whiteSpace: 'pre-wrap' } as any) : undefined;
                              return (
                                <View style={[styles.tableCell, style]}>
                                  {editing ? (
                                    <TextInput
                                      style={[styles.cellInput, Platform.OS === 'web' ? ({ fontFamily: 'monospace' } as any) : undefined]}
                                      multiline
                                      value={String(value)}
                                      onFocus={() => ensureSize(r, c)}
                                      onChangeText={(txt) => {
                                        setTable((prev) => {
                                          if (!prev) return prev;
                                          const next = prev.map((row) => row.slice());
                                          while (next.length <= r) next.push([] as any);
                                          const row = next[r] ? next[r].slice() : [];
                                          while (row.length <= c) row.push('');
                                          row[c] = txt;
                                          next[r] = row;
                                          return next;
                                        });
                                        setDirty(true);
                                      }}
                                      onPressIn={() => {
                                        // If value is empty, allocate immediately so cursor shows up
                                        if (!value) ensureSize(r, c);
                                      }}
                                    />
                                  ) : (
                                    <Text style={[styles.cellText, webPreWrap]}>{wrap15(value)}</Text>
                                  )}
                                </View>
                              );
                            }}
                          </VariableSizeGrid>
                        </View>
                      </View>
                    </View>
                  )}
                </AutoSizer>
              </View>
            ) : (
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
                                setDirty(true);
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
            )
          ) : (
            <ScrollView style={styles.textWrapper} contentContainerStyle={{ padding: 12 }}>
              {/* Title editor for note files */}
              {editing && isNoteFile && (
                <View style={styles.titleEditor}>
                  <Text style={styles.titleLabel}>Note Title:</Text>
                  <TextInput
                    style={[
                      styles.titleInput,
                      Platform.OS === 'web' ? ({ outline: 'none' } as any) : undefined
                    ]}
                    value={editableTitle}
                    onChangeText={(text) => {
                      setEditableTitle(text);
                      setDirty(true);
                    }}
                    placeholder="Enter note title..."
                    placeholderTextColor="#666"
                  />
                </View>
              )}
              
              {editing ? (
                <TextInput
                  style={[
                    styles.textEditor,
                    Platform.OS === 'web' ? ({ fontFamily: 'monospace', outline: 'none' } as any) : undefined
                  ]}
                  multiline
                  value={textContent || ''}
                  onChangeText={(text) => {
                    setTextContent(text);
                    setDirty(true);
                  }}
                  placeholder="Start typing..."
                  placeholderTextColor="#666"
                />
              ) : (
                <Text style={styles.preText}>{textContent || 'No content to display'}</Text>
              )}
            </ScrollView>
          )
        )}
        </ScrollView>
      </ScrollView>
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
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, color: '#9A9A9A' },
  errorText: { color: '#FF4444', fontSize: 16 },
  tableWrapper: { flex: 1, borderRadius: 12, borderWidth: 1, borderColor: '#2A2A2A', backgroundColor: '#0E0E0E' },
  tableVertical: { maxHeight: '100%' },
  tableRow: { flexDirection: 'row' },
  tableCell: { paddingVertical: 4, paddingHorizontal: 6, borderRightWidth: 1, borderRightColor: '#2A2A2A', borderBottomWidth: 1, borderBottomColor: '#2A2A2A', width: 160 },
  cellText: { color: '#EAEAEA', fontFamily: Platform.select({ web: 'monospace', default: undefined }), fontSize: 12, lineHeight: 14 },
  cellInput: { color: '#EAEAEA', paddingVertical: 2, paddingHorizontal: 4, borderWidth: 1, borderColor: '#333', borderRadius: 4, minHeight: 24, backgroundColor: '#151515', fontSize: 12 },
  moreText: { color: '#9A9A9A', padding: 8 },
  textWrapper: { flex: 1, borderRadius: 12, borderWidth: 1, borderColor: '#2A2A2A', backgroundColor: '#0E0E0E' },
  preText: { color: '#EAEAEA', fontFamily: Platform.select({ web: 'monospace', default: undefined }), lineHeight: 20 },
  textEditor: { 
    color: '#EAEAEA', 
    fontFamily: Platform.select({ web: 'monospace', default: undefined }), 
    fontSize: 14, 
    lineHeight: 20, 
    minHeight: 200, 
    textAlignVertical: 'top',
    backgroundColor: 'transparent',
    borderWidth: 0,
    padding: 0
  },
  titleEditor: {
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#2A2A2A'
  },
  titleLabel: {
    color: '#F5F5F5',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8
  },
  titleInput: {
    color: '#EAEAEA',
    fontSize: 16,
    backgroundColor: '#1A1A1A',
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontWeight: '500'
  },
  actions: { flexDirection: 'row', gap: 12, padding: 16 },
  actionButton: { flex: 1, backgroundColor: '#2A2A2A', padding: 14, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: '#333' },
  closeButton: { backgroundColor: '#1A1A1A' },
  actionButtonText: { color: '#F5F5F5', fontWeight: '600' },
  headerCell: { backgroundColor: '#151515', borderRightWidth: 1, borderRightColor: '#2A2A2A', borderBottomWidth: 1, borderBottomColor: '#2A2A2A', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4, paddingVertical: 4 },
  headerText: { color: '#9A9A9A', fontSize: 10, fontWeight: '600' },
});
