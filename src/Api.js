

// src/Api.js
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL;

// Create a configured instance
const api = axios.create({
    baseURL: API_BASE,
    withCredentials: true // CRITICAL: Sends the HttpOnly cookies
});

/* =========================================
   ✅ GLOBAL RESPONSE INTERCEPTOR
========================================= */
api.interceptors.response.use(
    (response) => {
        return response;
    },
    (error) => {
        // Check if the error is 401 or 403
        if (error.response && (error.response.status === 401 || error.response.status === 403)) {
            
            // 🛑 THE FIX: Check for all public authentication routes
            const path = window.location.pathname;
            const isPublicPage = path === '/login' || path === '/' || path === '/register' || path === '/forgotpass';

            // Only trigger the wipe and redirect if we are NOT on a public page
            if (!isPublicPage) {
                console.warn("Session expired or invalid. Wiping client state and redirecting...");
                
                alert("Your session has expired or is invalid. Please log in again to continue.");

                localStorage.clear();
                sessionStorage.clear();

                document.cookie.split(";").forEach((c) => {
                    document.cookie = c
                        .replace(/^ +/, "")
                        .replace(/=.*/, "=;expires=" + new Date(0).toUTCString() + ";path=/");
                });

                window.location.href = "/login"; 
            }
        }

        return Promise.reject(error);
    }
);

/* =========================================
   SECURITY INITIALIZATION
========================================= */
// Fetch or restore the CSRF token automatically
export const initializeAppSecurity = async (forceFetch = false) => {
    try {
        // 1. Try to grab it from session storage to avoid an API call on page refresh
        const cachedToken = sessionStorage.getItem('x_csrf_token');
        
        if (!forceFetch && cachedToken) {
            api.defaults.headers.common['X-CSRF-Token'] = cachedToken;
            console.log("✅ Security token restored from cache (No API call)");
            return;
        }

        // 2. If not cached (or forced after a fresh login), fetch from backend
        const response = await api.get('/api/init');
        const { csrfToken } = response.data;
        
        // Cache it for subsequent page reloads
        sessionStorage.setItem('x_csrf_token', csrfToken);
        
        // Tell Axios to attach this token to every future request
        api.defaults.headers.common['X-CSRF-Token'] = csrfToken;
        console.log("✅ Security tokens initialized from server");
    } catch (error) {
        console.error("Failed to fetch CSRF token", error);
    }
};

// Helper to wipe the token completely (called during logout)
export const clearAppSecurity = () => {
    delete api.defaults.headers.common['X-CSRF-Token'];
    sessionStorage.removeItem('x_csrf_token');
    console.log("🔒 Security tokens cleared");
};

export default api;