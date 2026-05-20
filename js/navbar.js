// ============================================================
// navbar.js — Top + Bottom navbar, Toast, Utilities
// Load on every page after auth.js and api.js
// ============================================================

const navbar = {
  currentPage: window.location.pathname,

  // ── Top Navbar ─────────────────────────────────────────────
  renderTop(options = {}) {
    const { showSearch = false, title = "" } = options;

    // Left side — logo or back button
    let leftSide = `<a href="/index.html" class="top-nav-logo">Lux<span>Store</span></a>`;
    if (title) {
      leftSide = `
        <button class="top-nav-icon-btn" onclick="history.back()">←</button>
        <span class="top-nav-title">${title}</span>
      `;
    }

    // Right side — changes based on login state
    let rightSide = "";
    if (auth.isLoggedIn()) {
      // Cart icon always shown when logged in
      rightSide = `
        <a href="cart.html" class="top-nav-icon-btn" id="top-cart-btn" title="Cart">
          🛒
          <span class="nav-cart-badge" id="top-cart-badge" style="display:none">0</span>
        </a>
      `;
      // Admin icon only for admin/superadmin
      if (auth.isAdmin()) {
        rightSide += `<a href="admin.html" class="top-nav-icon-btn" title="Admin Panel">⚙️</a>`;
      }
    } else {
      // Not logged in — show Login and Register
      rightSide = `
        <a href="/login.html" class="btn btn-sm btn-outline" style="width:auto">Login</a>
        <a href="/register.html" class="btn btn-sm btn-primary" style="width:auto;margin-left:6px">Register</a>
      `;
    }

    // Search bar (only on index page)
    const searchBar = showSearch ? `
      <div class="top-nav-search" id="top-search-bar">
        <span class="search-icon">🔍</span>
        <input type="text" id="search-input" placeholder="Search products..." autocomplete="off" />
      </div>
    ` : "";

    const nav = document.createElement("nav");
    nav.className = "top-nav";

    if (showSearch) {
      nav.innerHTML = `${leftSide}${searchBar}<div style="display:flex;align-items:center;gap:6px;flex-shrink:0">${rightSide}</div>`;
    } else {
      nav.innerHTML = `${leftSide}<div style="display:flex;align-items:center;gap:6px;">${rightSide}</div>`;
    }

    document.body.insertBefore(nav, document.body.firstChild);

    // Update cart badge after nav is injected
    if (auth.isLoggedIn()) this.updateCartBadge();
  },

  // ── Bottom Navbar ───────────────────────────────────────────
  renderBottom() {
    const page = this.currentPage;

    const isHome   = page === "/" || page.includes("index");
    const isOrders = page.includes("orders");
    const isCart   = page.includes("cart");
    const isMe     = page.includes("me");
    const isAdmin  = page.includes("admin");

    const nav = document.createElement("nav");
    nav.className = "bottom-nav";
    nav.id = "bottom-nav";

    nav.innerHTML = `
      <a href="/index.html" class="bottom-nav-item ${isHome ? "active" : ""}">
        <span class="nav-icon">🏠</span>
        <span>Home</span>
      </a>
      <a href="/index.html?focus=search" class="bottom-nav-item" id="bottom-search-btn">
        <span class="nav-icon">🔍</span>
        <span>Search</span>
      </a>
      <a href="${auth.isLoggedIn() ? "/orders.html" : "/login.html"}" class="bottom-nav-item ${isOrders ? "active" : ""}">
        <span class="nav-icon">📦</span>
        <span>Orders</span>
      </a>
      <a href="${auth.isLoggedIn() ? "/cart.html" : "/login.html"}" class="bottom-nav-item ${isCart ? "active" : ""}">
        <span class="nav-icon">🛒</span>
        <span>Cart</span>
        <span class="bottom-nav-badge" id="bottom-cart-badge" style="display:none">0</span>
      </a>
      <a href="${auth.isLoggedIn() ? "/me.html" : "/login.html"}" class="bottom-nav-item ${isMe ? "active" : ""}">
        <span class="nav-icon">👤</span>
        <span>Me</span>
      </a>
    `;

    document.body.appendChild(nav);

    // Search tab focuses the search input on index page
    const searchBtn = document.getElementById("bottom-search-btn");
    if (searchBtn) {
      searchBtn.addEventListener("click", (e) => {
        if (page === "/" || page.includes("index")) {
          e.preventDefault();
          const input = document.getElementById("search-input");
          if (input) {
            input.focus();
            input.scrollIntoView({ behavior: "smooth" });
          }
        }
        // Otherwise it navigates to index with focus=search param
      });
    }
  },

  // ── Cart Badge ──────────────────────────────────────────────
  async updateCartBadge() {
    if (!auth.isLoggedIn()) return;
    try {
      const res = await api.getCart();
      if (!res || !res.ok) return;
      const count = (res.data.cart?.items || []).reduce((sum, item) => sum + item.quantity, 0);
      ["top-cart-badge", "bottom-cart-badge"].forEach(id => {
        const badge = document.getElementById(id);
        if (!badge) return;
        if (count > 0) {
          badge.textContent = count > 99 ? "99+" : count;
          badge.style.display = "flex";
        } else {
          badge.style.display = "none";
        }
      });
    } catch {
      // Silently fail
    }
  },

  // ── Render both navbars ─────────────────────────────────────
  render(options = {}) {
    this.renderTop(options);
    this.renderBottom();
  },
};

// ── Toast System ──────────────────────────────────────────────
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
      t.addEventListener("animationend", () => t.remove(), { once: true });
    }, duration);
  },

  success: (msg) => toast.show(msg, "success"),
  error:   (msg) => toast.show(msg, "error"),
  info:    (msg) => toast.show(msg, "default"),
};

// ── Utilities ─────────────────────────────────────────────────

// Naira currency formatter
function formatPrice(amount) {
  return "₦" + new Intl.NumberFormat("en-NG", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(dateString) {
  return new Intl.DateTimeFormat("en-NG", {
    year: "numeric", month: "short", day: "numeric",
  }).format(new Date(dateString));
}

function debounce(fn, delay = 400) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

function escHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
