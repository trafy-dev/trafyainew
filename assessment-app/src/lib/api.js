import axios from 'axios';
import { supabase } from './supabase';

const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export const api = axios.create({ baseURL, timeout: 30000 });

/**
 * Attach the current Supabase access token to every request.
 * The API derives the user's identity from this token, which is why no
 * component sends a userId any more.
 */
api.interceptors.request.use(async (config) => {
  const { data } = await supabase.auth.getSession();
  const token = data?.session?.access_token;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

/** Normalises server errors into a readable message plus useful fields. */
export function apiError(err, fallback = 'Something went wrong. Please try again.') {
  if (err?.response?.data?.error) {
    return { message: err.response.data.error, details: err.response.data.details, status: err.response.status };
  }
  if (err?.code === 'ERR_NETWORK') {
    return { message: 'Cannot reach the server. Is the backend running?', status: 0 };
  }
  return { message: fallback, status: err?.response?.status };
}

export const socketUrl = baseURL;
