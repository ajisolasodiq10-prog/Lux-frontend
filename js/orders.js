// ============================================================
// orders.js — Order history page logic
// ============================================================

document.addEventListener("DOMContentLoaded", async () => {
  auth.requireLogin();
  navbar.render({ title: "My Orders" });
  await loadOrders();
});

// ── Load and render orders ────────────────────────────────────
async function loadOrders() {
  const listEl = document.getElementById("orders-list");

  listEl.innerHTML = `<div class="spinner-wrap"><div class="spinner"></div><p>Loading orders…</p></div>`;

  const res = await api.getMyOrders();

  if (!res || !res.ok) {
    listEl.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">😕</div>
        <h3>Failed to load orders</h3>
        <p>Please refresh and try again</p>
      </div>
    `;
    return;
  }

  const orders = res.data.orders || [];

  if (orders.length === 0) {
    listEl.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">📦</div>
        <h3>No orders yet</h3>
        <p>Start shopping and your orders will appear here</p>
        <a href="/index.html" class="btn btn-primary" style="width:auto;margin-top:12px">Browse Products</a>
      </div>
    `;
    return;
  }

  listEl.innerHTML = orders.map(order => buildOrderCard(order)).join("");
}

// ── Build one order card ──────────────────────────────────────
function buildOrderCard(order) {
  const shortId  = order._id.slice(-8).toUpperCase();
  const date     = formatDate(order.createdAt);
  const count    = order.items.length;
  const maxThumbs = 3;

  // Show up to 3 item thumbnails
  const thumbs = order.items.slice(0, maxThumbs).map(item => `
    <img
      class="order-item-thumb"
      src="${escHtml(item.image || "https://placehold.co/56x56?text=?")}"
      alt="${escHtml(item.name)}"
      onerror="this.src='https://placehold.co/56x56?text=?'"
    />
  `).join("");

  const moreItems = count > maxThumbs
    ? `<div class="order-more-items">+${count - maxThumbs}</div>`
    : "";

  return `
    <div class="order-card">
      <div class="order-card-header">
        <div>
          <div class="order-id">Order <strong>#${shortId}</strong></div>
          <div class="order-date">${date}</div>
        </div>
        <span class="badge badge-${order.status}">${order.status}</span>
      </div>
      <div class="order-items-preview">
        ${thumbs}
        ${moreItems}
      </div>
      <div class="order-card-footer">
        <div>
          <div class="order-total">${formatPrice(order.totalPrice)}</div>
          <div class="order-items-count">${count} item${count !== 1 ? "s" : ""}</div>
        </div>
      </div>
    </div>
  `;
}
