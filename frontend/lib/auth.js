/**
 * Auth helper utilities
 * All functions are SSR-safe (window-guarded)
 */

/**
 * Get JWT token from localStorage
 * @returns {string|null}
 */
export const getToken = () => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('token');
};

/**
 * Get current user object from localStorage
 * @returns {Object|null}
 */
export const getUser = () => {
  if (typeof window === 'undefined') return null;
  const stored = localStorage.getItem('user');
  if (!stored) return null;
  try {
    return JSON.parse(stored);
  } catch {
    return null;
  }
};

/**
 * Check if user is authenticated
 * @returns {boolean}
 */
export const isAuthenticated = () => {
  return !!(getToken() && getUser());
};

/**
 * Redirect to /login if not authenticated
 * Call inside useEffect
 * @param {Object} router - Next.js router
 * @returns {boolean} true if auth is valid, false if redirected
 */
export const requireAuth = (router) => {
  if (!isAuthenticated()) {
    router.push('/login');
    return false;
  }
  return true;
};

/**
 * Clear auth state (logout)
 */
export const clearAuth = () => {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('token');
  localStorage.removeItem('user');
};

/**
 * Check if current user has one of the given roles
 * @param {string[]} roles
 * @returns {boolean}
 */
export const hasRole = (...roles) => {
  const user = getUser();
  if (!user) return false;
  return roles.includes(user.role);
};
