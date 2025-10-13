import api from './api';

export const projectService = {
  // Get all projects for the current user
  getProjects: async () => {
    try {
      const response = await api.get('/projects');
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Get a single project by ID
  getProject: async (projectId) => {
    try {
      const response = await api.get(`/projects/${projectId}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Create a new project
  createProject: async (projectData) => {
    try {
      const response = await api.post('/projects', projectData);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Update a project
  updateProject: async (projectId, projectData) => {
    try {
      const response = await api.put(`/projects/${projectId}`, projectData);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Delete a project
  deleteProject: async (projectId) => {
    try {
      await api.delete(`/projects/${projectId}`);
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Invite a user to a project
  inviteUser: async (projectId, email, role) => {
    try {
      const response = await api.post(`/projects/${projectId}/invite`, {
        email,
        role,
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Get project members
  getProjectMembers: async (projectId) => {
    try {
      const response = await api.get(`/projects/${projectId}/members`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Remove a member from a project
  removeMember: async (projectId, userId) => {
    try {
      await api.delete(`/projects/${projectId}/members/${userId}`);
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Update member role
  updateMemberRole: async (projectId, userId, role) => {
    try {
      const response = await api.put(`/projects/${projectId}/members/${userId}`, {
        role,
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },
};
