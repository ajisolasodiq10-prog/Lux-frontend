// ============================================================
// auth.js — Token & user helpers shared across all pages
// Load this before api.js and every other JS file
// ============================================================

const auth = {
  // ── Storage ───────────────────────────────────────────────
  saveAuth(token, user) {
    localStorage.setItem("token", token);
    localStorage.setItem("user", JSON.stringify(user));
  },

  clearAuth() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
  },

  getToken() {
    return localStorage.getItem("token");
  },

  getUser() {
    try {
      return JSON.parse(localStorage.getItem("user"));
    } catch {
      return null;
    }
  },

  // ── Checks ────────────────────────────────────────────────
  isLoggedIn() {
    return !!this.getToken();
  },

  isAdmin() {
    const user = this.getUser();
    return user && (user.role === "admin" || user.role === "superadmin");
  },

  isSuperAdmin() {
    const user = this.getUser();
    return user && user.role === "superadmin";
  },

  // ── Guards ────────────────────────────────────────────────
  // Call at the top of any page that requires login
  requireLogin() {
    if (!this.isLoggedIn()) {
      window.location.href = "/login.html";
    }
  },

  // Call at the top of any admin-only page
  requireAdmin() {
    if (!this.isLoggedIn()) {
      window.location.href = "/login.html";
      return;
    }
    if (!this.isAdmin()) {
      window.location.href = "/index.html";
    }
  },
};
