import React from 'react';
import { Modal, View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';

interface Member {
  id: string;
  display_name: string;
  email: string;
  role: 'LEADER' | 'RESEARCHER' | 'GUEST';
}

interface Props {
  visible: boolean;
  members: Member[];
  onClose: () => void;
  onManage: () => void;
  renderMember: (member: Member) => React.ReactNode;
}

export default function MembersModal({ visible, members, onClose, onManage, renderMember }: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <View style={[styles.modalCard, { maxHeight: '85%' }]}>
          <View style={[styles.sectionHeader, { marginBottom: 12 }]}>
            <Text style={styles.sectionTitle}>Team Members</Text>
            <TouchableOpacity style={styles.actionButton} onPress={onManage}>
              <Text style={styles.actionButtonText}>+ Manage</Text>
            </TouchableOpacity>
          </View>
          <ScrollView style={{ maxHeight: '75%' }}>
            {members.length > 0 ? (
              members.map((m) => (
                <View key={m.id}>{renderMember(m)}</View>
              ))
            ) : (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateText}>No team members</Text>
                <Text style={styles.emptyStateSubtext}>Invite colleagues to collaborate</Text>
              </View>
            )}
          </ScrollView>
          <View style={{ alignItems: 'flex-end', marginTop: 12 }}>
            <TouchableOpacity style={[styles.actionButton]} onPress={onClose}>
              <Text style={styles.actionButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
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
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#F5F5F5',
    letterSpacing: 0.5,
  },
  actionButton: {
    backgroundColor: '#FF2A2A',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
  },
  actionButtonText: {
    fontSize: 12,
    color: '#F5F5F5',
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
});
