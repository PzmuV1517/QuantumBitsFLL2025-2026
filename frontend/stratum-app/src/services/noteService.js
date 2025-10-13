import api from './api';

export const noteService = {
  // Get all notes for a project
  getNotes: async (projectId) => {
    try {
      const response = await api.get(`/projects/${projectId}/notes`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Get a single note by ID
  getNote: async (projectId, noteId) => {
    try {
      const response = await api.get(`/projects/${projectId}/notes/${noteId}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Create a new note
  createNote: async (projectId, noteData) => {
    try {
      const response = await api.post(`/projects/${projectId}/notes`, noteData);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Update a note
  updateNote: async (projectId, noteId, noteData) => {
    try {
      const response = await api.put(`/projects/${projectId}/notes/${noteId}`, noteData);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Delete a note
  deleteNote: async (projectId, noteId) => {
    try {
      await api.delete(`/projects/${projectId}/notes/${noteId}`);
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Upload a photo to a note
  uploadPhoto: async (projectId, noteId, photoUri) => {
    try {
      const formData = new FormData();
      formData.append('file', {
        uri: photoUri,
        type: 'image/jpeg',
        name: 'photo.jpg',
      });

      const response = await api.post(
        `/projects/${projectId}/notes/${noteId}/photos`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Delete a photo from a note
  deletePhoto: async (projectId, noteId, photoId) => {
    try {
      await api.delete(`/projects/${projectId}/notes/${noteId}/photos/${photoId}`);
    } catch (error) {
      throw error.response?.data || error;
    }
  },
};
