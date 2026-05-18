// ============================================================
// api.js — All fetch calls to the backend live here
// Every other JS file imports functions from this file
// No other file talks to the backend directly
// ============================================================

// const BASE_URL = "http://localhost:5000/api";
const BASE_URL = "https://luxstore.onrender.com/api";

// ── Core Request Function ─────────────────────────────────────
// Every API call goes through this one function
// It handles: token attachment, JSON parsing, error handling
async function request(method, endpoint, body = null) {
  const token = auth.getToken();

  const headers = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const config = { method, headers };
  if (body) config.body = JSON.stringify(body);

  const response = await fetch(`${BASE_URL}${endpoint}`, config);
  const data = await response.json();

  // If token expired or invalid, log the user out
  if (response.status === 401) {
    auth.clearAuth();
    window.location.href = "/login.html";
    return;
  }

  return { ok: response.ok, status: response.status, data };
}

// ── Shorthand Methods ─────────────────────────────────────────
const api = {
  get:    (endpoint)       => request("GET",    endpoint),
  post:   (endpoint, body) => request("POST",   endpoint, body),
  put:    (endpoint, body) => request("PUT",    endpoint, body),
  delete: (endpoint)       => request("DELETE", endpoint),

  // ── Auth ────────────────────────────────────────────────────
  register: (name, email, password) =>
    request("POST", "/auth/register", { name, email, password }),

  login: (email, password) =>
    request("POST", "/auth/login", { email, password }),

  getMe: () =>
    request("GET", "/auth/me"),

  getUsers: () =>
    request("GET", "/auth/users"),

  changeUserRole: (userId, role) =>
    request("PUT", `/auth/users/${userId}/role`, { role }),

  // ── Products ────────────────────────────────────────────────
  getProducts: () =>
    request("GET", "/products"),

  searchProducts: (term) =>
    request("GET", `/products/search?q=${encodeURIComponent(term)}`),

  createProduct: (data) =>
    request("POST", "/products", data),

  updateProduct: (id, data) =>
    request("PUT", `/products/${id}`, data),

  deleteProduct: (id) =>
    request("DELETE", `/products/${id}`),

  // ── Cart ────────────────────────────────────────────────────
  getCart: () =>
    request("GET", "/cart"),

  addToCart: (productId, quantity = 1) =>
    request("POST", "/cart", { productId, quantity }),

  updateCartItem: (itemId, quantity) =>
    request("PUT", `/cart/${itemId}`, { quantity }),

  removeCartItem: (itemId) =>
    request("DELETE", `/cart/${itemId}`),

  clearCart: () =>
    request("DELETE", "/cart"),

  // ── Orders ──────────────────────────────────────────────────
  checkout: () =>
    request("POST", "/orders/checkout"),

  getMyOrders: () =>
    request("GET", "/orders/my-orders"),

  getAllOrders: () =>
    request("GET", "/orders"),

  updateOrderStatus: (orderId, status) =>
    request("PUT", `/orders/${orderId}/status`, { status }),
};
