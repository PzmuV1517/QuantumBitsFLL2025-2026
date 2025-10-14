import api from './api';
import { Platform } from 'react-native';

export const fileService = {
  listRoot: async (projectId) => {
    const res = await api.get(`/files/project/${projectId}`);
    return res.data;
  },
  listChildren: async (nodeId) => {
    const res = await api.get(`/files/${nodeId}/children`);
    return res.data;
  },
  createFolder: async (projectId, name, parentId = null) => {
    const res = await api.post(`/files/project/${projectId}/folders`, { name, parent_id: parentId });
    return res.data;
  },
  moveNode: async (nodeId, newParentId = null) => {
    const res = await api.put(`/files/${nodeId}/move`, { new_parent_id: newParentId });
    return res.data;
  },
  renameNode: async (nodeId, name) => {
    const res = await api.put(`/files/${nodeId}/rename`, { name });
    return res.data;
  },
  deleteNode: async (nodeId) => {
    await api.delete(`/files/${nodeId}`);
  },
  uploadFile: async (projectId, formData) => {
    // Override the default 'application/json' Content-Type to let the browser set multipart boundary
    const res = await api.post(`/files/project/${projectId}/upload`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return res.data;
  },
};
