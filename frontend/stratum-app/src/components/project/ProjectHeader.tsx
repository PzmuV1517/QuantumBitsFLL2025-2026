import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface Project {
  id: string;
  name: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

export default function ProjectHeader({ project }: { project: Project }) {
  return (
    <View style={styles.projectHeader}>
      <Text style={styles.projectName}>{project.name}</Text>
      {!!project.description && <Text style={styles.projectDescription}>{project.description}</Text>}
      <View style={styles.projectMeta}>
  <Text style={styles.projectMetaText}>Created: {new Date(project.created_at).toLocaleDateString(undefined, { timeZone: 'UTC' })}</Text>
  <Text style={styles.projectMetaText}>Updated: {new Date(project.updated_at).toLocaleDateString(undefined, { timeZone: 'UTC' })}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  projectHeader: { padding: 16, borderBottomWidth: 1, borderBottomColor: '#2A2A2A' },
  projectName: { fontSize: 22, color: '#F5F5F5', fontWeight: '700' },
  projectDescription: { color: '#CFCFCF', marginTop: 6 },
  projectMeta: { flexDirection: 'row', gap: 16, marginTop: 8 },
  projectMetaText: { color: '#9A9A9A', fontSize: 12 },
});
