// One place for the backend URL.
// Set VITE_API_URL in Vercel (frontend project) and in frontend/.env for local work.
export const API = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/$/, '');
