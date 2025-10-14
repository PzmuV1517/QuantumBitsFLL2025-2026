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
    const res = await api.post(`/files/project/${projectId}/upload`, formData);
    return res.data;
  },
  downloadFile: async (nodeId) => {
    const res = await api.get(`/files/${nodeId}/download`, {
      responseType: 'blob',
    });
    return res;
  },
  downloadFileWithProgress: async (nodeId, onProgress) => {
    const res = await api.get(`/files/${nodeId}/download`, {
      responseType: 'blob',
      onDownloadProgress: (e) => {
        if (onProgress) {
          const loaded = e.loaded;
            // Some browsers supply e.total; if missing attempt to parse from headers after request
          const total = e.total || 0;
          onProgress(loaded, total);
        }
      },
    });
    return res;
  },
  downloadFileStream: async (nodeId, token, onProgress) => {
    if (Platform.OS !== 'web') {
      // Fallback to axios progress for non-web
      return fileService.downloadFileWithProgress(nodeId, onProgress);
    }
    const url = `${api.defaults.baseURL}/files/${nodeId}/download`;
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    const response = await fetch(url, { headers });
    if (!response.ok) throw new Error('Download failed');
    const contentLength = parseInt(response.headers.get('Content-Length') || '0', 10) || 0;
    const reader = response.body.getReader();
    let received = 0;
    const chunks = [];
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      received += value.length;
      if (onProgress) onProgress(received, contentLength);
    }
    const blob = new Blob(chunks, { type: response.headers.get('Content-Type') || 'application/octet-stream' });
    return { blob, contentLength };
  },
};
