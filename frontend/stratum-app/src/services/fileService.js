import api from './api';
import { Platform, Alert } from 'react-native';

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
    // Content-Type for multipart is set by axios interceptor
    const res = await api.post(`/files/project/${projectId}/upload`, formData);
    return res.data;
  },

  replaceFile: async (nodeId, formData) => {
    const res = await api.put(`/files/${nodeId}/content`, formData);
    return res.data;
  },

  // Text preview helper (unified)
  getText: async (nodeId) => {
    const res = await api.get(`/files/${nodeId}/text`);
    return res.data; // { text, content_type, filename }
  },

  // Download file (blob on web, arraybuffer on native)
  downloadFile: async (nodeId) => {
    const responseType = Platform.OS === 'web' ? 'blob' : 'arraybuffer';
    try {
      return await api.get(`/files/${nodeId}/download`, { responseType });
    } catch (err) {
      if (Platform.OS === 'web') {
        // Fallback fetch (in case axios/adapter misreports blob)
        const url = `${api.defaults.baseURL}/files/${nodeId}/download`;
        const headers = api.defaults.headers.common || {};
        const res = await fetch(url, { headers });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const blob = await res.blob();
        // Mimic axios response shape we use
        const headersMap = {
          'content-type': res.headers.get('Content-Type') || '',
          'content-disposition': res.headers.get('Content-Disposition') || '',
        };
        return { data: blob, headers: headersMap };
      }
      throw err;
    }
  },

  // Progress (used in Files list downloads)
  downloadFileWithProgress: async (nodeId, onProgress) => {
    const responseType = Platform.OS === 'web' ? 'blob' : 'arraybuffer';
    return api.get(`/files/${nodeId}/download`, {
      responseType,
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

  // Fallback helper for plain text on web (used only if /text fails)
  downloadText: async (nodeId) => {
    const res = await api.get(`/files/${nodeId}/download`, { responseType: 'blob', transformResponse: [(d) => d] });
    if (Platform.OS === 'web' && res.data && typeof res.data.text === 'function') {
      return await res.data.text();
    }
    return res.data;
  },

  // Preserve filename when downloading on web
  openDownload: async (nodeId) => {
    if (Platform.OS === 'web') {
      const res = await api.get(`/files/${nodeId}/download`, { responseType: 'blob' });
      const cd = res.headers?.['content-disposition'] || res.headers?.['Content-Disposition'] || '';
      let filename = 'download';
      const m = typeof cd === 'string'
        ? cd.match(/filename\*?=(?:UTF-8'')?["']?([^"';]+)["']?/i) || cd.match(/filename="?([^"]+)"?/i)
        : null;
      if (m?.[1]) filename = decodeURIComponent(m[1]);

      const url = window.URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      return;
    }
    const blob = new Blob(chunks, { type: response.headers.get('Content-Type') || 'application/octet-stream' });
    return { blob, contentLength };
  },
};

export default fileService;
