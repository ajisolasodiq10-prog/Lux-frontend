// ============================================================
// navbar.js — Builds and injects top + bottom navbar
// Load this on every HTML page after auth.js and api.js
// ============================================================

const navbar = {
  // Which page is currently active (used to highlight bottom nav)
  currentPage: window.location.pathname,

  // ── Build & inject the top navbar ─────────────────────────
  renderTop(options = {}) {
    const { showSearch = false, title = "" } = options;
    const user = auth.getUser();

    let leftSide = `
      <a href="/index.html" class="top-nav-logo">Lux<span>Store</span></a>
    `;

    // Inner pages show a back button and page title instead of logo
    if (title) {
      leftSide = `
        <button class="top-nav-icon-btn" onclick="history.back()">←</button>
        <span class="top-nav-title">${title}</span>
      `;
    }

    let rightSide = "";
    if (auth.isLoggedIn()) {
      rightSide = `
        <a href="/cart.html" class="top-nav-icon-btn" id="top-cart-btn">
          🛒
          <span class="nav-cart-badge" id="top-cart-badge" style="display:none">0</span>
        </a>
      `;
      if (auth.isAdmin()) {
        rightSide += `<a href="/admin.html" class="top-nav-icon-btn">⚙️</a>`;
      }
    } else {
      rightSide = `<a href="/login.html" class="btn btn-sm btn-primary" style="width:auto">Login</a>`;
    }

    const searchBar = showSearch ? `
      <div class="top-nav-search" id="top-search-bar">
        <span class="search-icon">🔍</span>
        <input
          type="text"
          id="search-input"
          placeholder="Search products..."
          autocomplete="off"
        />
      </div>
    ` : "";

    const nav = document.createElement("nav");
    nav.className = "top-nav";

    if (showSearch) {
      nav.innerHTML = `
        ${leftSide}
        ${searchBar}
        ${rightSide}
      `;
    } else {
      nav.innerHTML = `
        ${leftSide}
        <div style="display:flex;align-items:center;gap:8px;">${rightSide}</div>
      `;
    }

    document.body.insertBefore(nav, document.body.firstChild);

    // Update cart badge count
    if (auth.isLoggedIn()) {
      this.updateCartBadge();
    }
  },

  // ── Build & inject the bottom navbar ──────────────────────
  renderBottom() {
    const page = this.currentPage;

    const isHome   = page.includes("index")  || page === "/";
    const isCart   = page.includes("cart");
    const isOrders = page.includes("orders");
    const isAdmin  = page.includes("admin");

    const nav = document.createElement("nav");
    nav.className = "bottom-nav";
    nav.id = "bottom-nav";

    nav.innerHTML = `
      <a href="/index.html" class="bottom-nav-item ${isHome ? "active" : ""}">
        <span class="nav-icon">🏠</span>
        <span>Home</span>
      </a>
      <a href="/index.html?search=1" class="bottom-nav-item" id="bottom-search-btn">
        <span class="nav-icon">🔍</span>
        <span>Search</span>
      </a>
      <a href="/cart.html" class="bottom-nav-item ${isCart ? "active" : ""}">
        <span class="nav-icon">🛒</span>
        <span>Cart</span>
        <span class="bottom-nav-badge" id="bottom-cart-badge" style="display:none">0</span>
      </a>
      <a href="/orders.html" class="bottom-nav-item ${isOrders ? "active" : ""}">
        <span class="nav-icon">📦</span>
        <span>Orders</span>
      </a>
      ${auth.isAdmin() ? `
        <a href="/admin.html" class="bottom-nav-item ${isAdmin ? "active" : ""}">
          <span class="nav-icon">⚙️</span>
          <span>Admin</span>
        </a>
      ` : ""}
    `;

    document.body.appendChild(nav);
  },

  // ── Fetch cart count and update both badges ────────────────
  async updateCartBadge() {
    if (!auth.isLoggedIn()) return;

    try {
      const res = await api.getCart();
      if (!res || !res.ok) return;

      const count = (res.data.cart?.items || []).reduce(
        (sum, item) => sum + item.quantity, 0
      );

      const topBadge    = document.getElementById("top-cart-badge");
      const bottomBadge = document.getElementById("bottom-cart-badge");

      [topBadge, bottomBadge].forEach(badge => {
        if (!badge) return;
        if (count > 0) {
          badge.textContent = count > 99 ? "99+" : count;
          badge.style.display = "flex";
        } else {
          badge.style.display = "none";
        }
      });
    } catch {
      // Silently fail — badge stays hidden
    }
  },

  // ── Shorthand: render both navbars at once ─────────────────
  render(options = {}) {
    this.renderTop(options);
    this.renderBottom();
  },
};

// ── Toast Notification System ─────────────────────────────────
const toast = {
  container: null,

  init() {
    if (this.container) return;
    this.container = document.createElement("div");
    this.container.className = "toast-container";
    document.body.appendChild(this.container);
  },

  show(message, type = "default", duration = 3000) {
    this.init();

    const t = document.createElement("div");
    t.className = `toast ${type}`;

    const icons = { success: "✓", error: "✕", default: "ℹ" };
    t.textContent = `${icons[type] || "ℹ"} ${message}`;

    this.container.appendChild(t);

    setTimeout(() => {
      t.classList.add("fade-out");
      t.addEventListener("animationend", () => t.remove());
    }, duration);
  },

  success: (msg) => toast.show(msg, "success"),
  error:   (msg) => toast.show(msg, "error"),
  info:    (msg) => toast.show(msg, "default"),
};

// ── Utility: Format price ─────────────────────────────────────
function formatPrice(amount) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

// ── Utility: Format date ──────────────────────────────────────
function formatDate(dateString) {
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(dateString));
}

// ── Utility: Debounce ─────────────────────────────────────────
function debounce(fn, delay = 400) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

// ── Utility: Escape HTML to prevent XSS ──────────────────────
function escHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
