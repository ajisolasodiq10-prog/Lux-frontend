// ============================================================
// admin.js — Admin dashboard logic
// Products CRUD, Orders management, Users list
// ============================================================

document.addEventListener("DOMContentLoaded", async () => {
  auth.requireAdmin();
  navbar.render({ title: "Admin Dashboard" });
  initTabs();
  await Promise.all([loadStats(), loadProducts(), loadOrders(), loadUsers()]);
});

// ── Tabs ──────────────────────────────────────────────────────
function initTabs() {
  document.querySelectorAll(".tab-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
      document.querySelectorAll(".tab-panel").forEach(p => p.classList.remove("active"));
      btn.classList.add("active");
      document.getElementById(`tab-${btn.dataset.tab}`).classList.add("active");
    });
  });
}

// ── Load Stats ────────────────────────────────────────────────
async function loadStats() {
  const [productsRes, ordersRes, usersRes] = await Promise.all([
    api.getProducts(),
    api.getAllOrders(),
    api.getUsers(),
  ]);

  if (productsRes?.ok) {
    document.getElementById("stat-products").textContent = productsRes.data.count;
  }

  if (ordersRes?.ok) {
    const orders  = ordersRes.data.orders || [];
    const revenue = orders
      .filter(o => o.status !== "cancelled")
      .reduce((sum, o) => sum + o.totalPrice, 0);

    document.getElementById("stat-orders").textContent  = ordersRes.data.count;
    document.getElementById("stat-revenue").textContent = formatPrice(revenue);
  }

  if (usersRes?.ok) {
    document.getElementById("stat-users").textContent = usersRes.data.count;
  }
}

// ════════════════════════════════════════════════════════════
// PRODUCTS
// ════════════════════════════════════════════════════════════

async function loadProducts() {
  const tbody = document.getElementById("products-tbody");
  tbody.innerHTML = `<tr><td colspan="6"><div class="spinner-wrap"><div class="spinner"></div></div></td></tr>`;

  const res = await api.getProducts();
  if (!res?.ok) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;color:#aaa;padding:24px">Failed to load products</td></tr>`;
    return;
  }

  const products = res.data.products || (res.data.product ? [res.data.product] : []);
  const user     = auth.getUser();

  if (products.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;color:#aaa;padding:24px">No products yet</td></tr>`;
    return;
  }

  tbody.innerHTML = products.map(p => {
    // Admin can only edit/delete their own products. Superadmin can edit all.
    const canManage = auth.isSuperAdmin() || p.createdBy?._id === user?.id;
    const imageUrl = p.image || "https://placehold.co/40x40?text=?";

    return `
      <tr>
        <td>
          <img
            class="admin-table-img"
            src="${escHtml(imageUrl)}"
            alt="${escHtml(p.name)}"
            onerror="this.src='https://placehold.co/40x40?text=?'"
          />
        </td>
        <td><div class="table-product-name">${escHtml(p.name)}</div></td>
        <td>${formatPrice(p.price)}</td>
        <td>${p.stock}</td>
        <td>${escHtml(p.category)}</td>
        <td>
          <div class="table-actions">
            ${canManage ? `
              <button class="action-btn edit"   onclick="openEditModal('${p._id}')">Edit</button>
              <button class="action-btn delete" onclick="deleteProduct('${p._id}','${escHtml(p.name)}')">Del</button>
            ` : `<span style="font-size:10px;color:#aaa">—</span>`}
          </div>
        </td>
      </tr>
    `;
  }).join("");
}

// ── Product Modal ─────────────────────────────────────────────
let editingProductId = null;

function openAddModal() {
  editingProductId = null;
  document.getElementById("product-modal-title").textContent = "Add Product";
  document.getElementById("product-form").reset();
  document.getElementById("product-modal").classList.add("open");
}

async function openEditModal(productId) {
  editingProductId = productId;
  document.getElementById("product-modal-title").textContent = "Edit Product";

  // Find product from already loaded list (no extra API call needed)
  const res = await api.getProducts();
  const product = res?.data?.products?.find(p => p._id === productId);
  if (!product) return;

  document.getElementById("p-name").value        = product.name;
  document.getElementById("p-description").value = product.description;
  document.getElementById("p-price").value       = product.price;
  document.getElementById("p-stock").value       = product.stock;
  document.getElementById("p-category").value    = product.category;
  document.getElementById("p-image").value       = product.image || "";

  document.getElementById("product-modal").classList.add("open");
}

function closeProductModal() {
  document.getElementById("product-modal").classList.remove("open");
  editingProductId = null;
}

document.addEventListener("DOMContentLoaded", () => {
  // FAB button
  document.getElementById("fab-add-product")?.addEventListener("click", openAddModal);

  // Close modal
  document.getElementById("close-product-modal")?.addEventListener("click", closeProductModal);
  document.getElementById("product-modal")?.addEventListener("click", (e) => {
    if (e.target === e.currentTarget) closeProductModal();
  });

  // Save product
  document.getElementById("save-product-btn")?.addEventListener("click", saveProduct);
});

async function saveProduct() {
  const name        = document.getElementById("p-name").value.trim();
  const description = document.getElementById("p-description").value.trim();
  const price       = parseFloat(document.getElementById("p-price").value);
  const stock       = parseInt(document.getElementById("p-stock").value);
  const category    = document.getElementById("p-category").value.trim();
  const image       = document.getElementById("p-image").value.trim();

  const alertEl = document.getElementById("product-form-alert");

  if (!name || !description || isNaN(price) || !category) {
    alertEl.textContent = "Please fill in all required fields.";
    alertEl.className   = "alert alert-error show";
    return;
  }

  alertEl.className = "alert";

  const saveBtn = document.getElementById("save-product-btn");
  saveBtn.disabled    = true;
  saveBtn.textContent = "Saving…";

  const data = { name, description, price, stock: stock || 0, category, image };

  const res = editingProductId
    ? await api.updateProduct(editingProductId, data)
    : await api.createProduct(data);

  saveBtn.disabled    = false;
  saveBtn.textContent = "Save";

  if (res && res.ok) {
    toast.success(editingProductId ? "Product updated!" : "Product created!");
    closeProductModal();
    await Promise.all([loadProducts(), loadStats()]);
  } else {
    alertEl.textContent = res?.data?.error || "Failed to save product.";
    alertEl.className   = "alert alert-error show";
  }
}

async function deleteProduct(id, name) {
  if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;

  const res = await api.deleteProduct(id);

  if (res && res.ok) {
    toast.success(`"${name}" deleted`);
    await Promise.all([loadProducts(), loadStats()]);
  } else {
    toast.error(res?.data?.error || "Failed to delete product.");
  }
}

// ════════════════════════════════════════════════════════════
// ORDERS
// ════════════════════════════════════════════════════════════

async function loadOrders() {
  const tbody = document.getElementById("orders-tbody");
  tbody.innerHTML = `<tr><td colspan="5"><div class="spinner-wrap"><div class="spinner"></div></div></td></tr>`;

  const res = await api.getAllOrders();
  if (!res?.ok) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;color:#aaa;padding:24px">Failed to load orders</td></tr>`;
    return;
  }

  const orders = res.data.orders || [];

  if (orders.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;color:#aaa;padding:24px">No orders yet</td></tr>`;
    return;
  }

  tbody.innerHTML = orders.map(o => `
    <tr>
      <td style="font-family:monospace;font-size:10px">#${o._id.slice(-6).toUpperCase()}</td>
      <td>${escHtml(o.user?.name || "—")}</td>
      <td>${formatPrice(o.totalPrice)}</td>
      <td><span class="badge badge-${o.status}">${o.status}</span></td>
      <td>
        <select
          class="status-select"
          data-order-id="${o._id}"
          onchange="handleStatusChange(this)"
        >
          <option value="">Change…</option>
          <option value="pending"   ${o.status === "pending"   ? "disabled" : ""}>Pending</option>
          <option value="shipped"   ${o.status === "shipped"   ? "disabled" : ""}>Shipped</option>
          <option value="delivered" ${o.status === "delivered" ? "disabled" : ""}>Delivered</option>
          <option value="cancelled" ${o.status === "cancelled" ? "disabled" : ""}>Cancelled</option>
        </select>
      </td>
    </tr>
  `).join("");
}

async function handleStatusChange(selectEl) {
  const orderId = selectEl.dataset.orderId;
  const status  = selectEl.value;
  if (!status) return;

  const res = await api.updateOrderStatus(orderId, status);

  if (res && res.ok) {
    toast.success(`Order updated to "${status}"`);
    await Promise.all([loadOrders(), loadStats()]);
  } else {
    toast.error(res?.data?.error || "Failed to update status.");
    selectEl.value = "";
  }
}

// ════════════════════════════════════════════════════════════
// USERS
// ════════════════════════════════════════════════════════════

async function loadUsers() {
  const tbody = document.getElementById("users-tbody");
  tbody.innerHTML = `<tr><td colspan="4"><div class="spinner-wrap"><div class="spinner"></div></div></td></tr>`;

  const res = await api.getUsers();
  if (!res?.ok) {
    tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;color:#aaa;padding:24px">Failed to load users</td></tr>`;
    return;
  }

  const users = res.data.users || [];

  if (users.length === 0) {
    tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;color:#aaa;padding:24px">No users yet</td></tr>`;
    return;
  }

  tbody.innerHTML = users.map(u => `
    <tr>
      <td style="font-weight:600">${escHtml(u.name)}</td>
      <td style="font-size:10px;color:#777">${escHtml(u.email)}</td>
      <td><span class="badge badge-${u.role === "user" ? "pending" : "delivered"}">${u.role}</span></td>
      <td>
        ${auth.isSuperAdmin() && u.role !== "superadmin" ? `
          <button
            class="action-btn ${u.role === "user" ? "edit" : "delete"}"
            onclick="changeRole('${u._id}','${u.role === "user" ? "admin" : "user"}')"
          >
            ${u.role === "user" ? "→ Admin" : "→ User"}
          </button>
        ` : `<span style="font-size:10px;color:#aaa">—</span>`}
      </td>
    </tr>
  `).join("");
}

async function changeRole(userId, newRole) {
  const label = newRole === "admin" ? "upgrade to admin" : "downgrade to user";
  if (!confirm(`Are you sure you want to ${label}?`)) return;

  const res = await api.changeUserRole(userId, newRole);

  if (res && res.ok) {
    toast.success(`User role changed to "${newRole}"`);
    await loadUsers();
  } else {
    toast.error(res?.data?.error || "Failed to change role.");
  }
}
