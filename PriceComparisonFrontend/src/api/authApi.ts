import apiClient from './axios';

export interface LoginResponse {
  success: boolean;
  message?: string;
  data: {
    token: string;
    user: {
      _id: string;
      email: string;
      username?: string;
      role: string;
    };
  };
}

export const loginApi = async (credentials: any): Promise<LoginResponse> => {
  const response = await apiClient.post<LoginResponse>('/auth/login', credentials);
  return response.data;
};

// Placeholder for missing register API (if needed in future)
export const registerApi = async (data: any): Promise<any> => {
  const response = await apiClient.post('/auth/register', data);
  return response.data;
};
