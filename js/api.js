// ============================================================
// api.js — All fetch calls to the backend live here
// ============================================================

const BASE_URL = window.location.hostname === "localhost" ||
                 window.location.hostname === "127.0.0.1"
  ? "http://localhost:5000/api"
  : "https://luxstore.onrender.com/api";

async function request(method, endpoint, body = null) {
  const token = auth.getToken();
  const headers = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const config = { method, headers };
  if (body) config.body = JSON.stringify(body);

  try {
    const response = await fetch(`${BASE_URL}${endpoint}`, config);
    const data = await response.json();
    if (response.status === 401) {
      auth.clearAuth();
      window.location.href = "/login.html";
      return;
    }
    return { ok: response.ok, status: response.status, data };
  } catch (error) {
    console.error("Network error:", error.message);
    return { ok: false, status: 0, data: { error: "Network error. Check your connection." } };
  }
}

const api = {
  get:    (endpoint)       => request("GET",    endpoint),
  post:   (endpoint, body) => request("POST",   endpoint, body),
  put:    (endpoint, body) => request("PUT",    endpoint, body),
  delete: (endpoint)       => request("DELETE", endpoint),

  register:       (name, email, password) => request("POST", "/auth/register", { name, email, password }),
  login:          (email, password)       => request("POST", "/auth/login", { email, password }),
  getMe:          ()                      => request("GET",  "/auth/me"),
  getUsers:       ()                      => request("GET",  "/auth/users"),
  changeUserRole: (userId, role)          => request("PUT",  `/auth/users/${userId}/role`, { role }),

  getProducts:    ()        => request("GET",    "/products"),
  searchProducts: (term)    => request("GET",    `/products/search?q=${encodeURIComponent(term)}`),
  createProduct:  (data)    => request("POST",   "/products", data),
  updateProduct:  (id, data)=> request("PUT",    `/products/${id}`, data),
  deleteProduct:  (id)      => request("DELETE", `/products/${id}`),

  getCart:        ()              => request("GET",    "/cart"),
  addToCart:      (productId, qty)=> request("POST",   "/cart", { productId, quantity: qty }),
  updateCartItem: (itemId, qty)   => request("PUT",    `/cart/${itemId}`, { quantity: qty }),
  removeCartItem: (itemId)        => request("DELETE", `/cart/${itemId}`),
  clearCart:      ()              => request("DELETE", "/cart"),

  checkout:          ()              => request("POST", "/orders/checkout"),
  getMyOrders:       ()              => request("GET",  "/orders/my-orders"),
  getAllOrders:       ()              => request("GET",  "/orders"),
  updateOrderStatus: (orderId, status) => request("PUT", `/orders/${orderId}/status`, { status }),
};
