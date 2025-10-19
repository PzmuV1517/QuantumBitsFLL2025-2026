import React, { useRef, useState } from 'react';
import { Platform, View, Text, TextInput, StyleSheet } from 'react-native';

interface Props {
  table: string[][];
  setTable: (updater: (prev: string[][]) => string[][]) => void;
  editing: boolean;
  onDirty: () => void;
}

export default function GridPanel({ table, setTable, editing, onDirty }: Props) {
  // Simple fallback grid for all platforms; you can extend with react-window/auto-sizer for web later
  return (
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
                          const next = prev.map((r) => r.slice());
                          next[rIdx][cIdx] = txt;
                          return next;
                        });
                        onDirty();
                      }}
                    />
                  ) : (
                    <Text style={[styles.cellText, webPreWrap]}>{String(cell ?? '')}</Text>
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
  );
}

const styles = StyleSheet.create({
  tableWrapper: { flex: 1, borderRadius: 12, borderWidth: 1, borderColor: '#2A2A2A', backgroundColor: '#0E0E0E' },
  tableRow: { flexDirection: 'row' },
  tableCell: { paddingVertical: 4, paddingHorizontal: 6, borderRightWidth: 1, borderRightColor: '#2A2A2A', borderBottomWidth: 1, borderBottomColor: '#2A2A2A', width: 160 },
  cellText: { color: '#EAEAEA', fontFamily: Platform.select({ web: 'monospace', default: undefined }), fontSize: 12, lineHeight: 14 },
  cellInput: { color: '#EAEAEA', paddingVertical: 2, paddingHorizontal: 4, borderWidth: 1, borderColor: '#333', borderRadius: 4, minHeight: 24, backgroundColor: '#151515', fontSize: 12 },
  moreText: { color: '#9A9A9A', padding: 8 },
});
