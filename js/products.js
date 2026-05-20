// ============================================================
// products.js — Shop page logic
// Products load without login. Actions require login.
// ============================================================

const CATEGORIES = [
  { label: "All",         icon: "🏪" },
  { label: "Electronics", icon: "📱" },
  { label: "Fashion",     icon: "👗" },
  { label: "Food",        icon: "🍎" },
  { label: "Books",       icon: "📚" },
  { label: "Beauty",      icon: "💄" },
  { label: "Sports",      icon: "⚽" },
  { label: "Home",        icon: "🏠" },
];

let allProducts    = [];
let activeCategory = "All";

// ── Init ──────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", async () => {
  // Render navbar — products page does NOT require login
  navbar.render();
  renderCategories();
  await loadProducts();
  initSearch();
  checkAutoFocus();
});

// ── Load products (no login required) ─────────────────────────
async function loadProducts() {
  const grid = document.getElementById("products-grid");
  grid.innerHTML = renderSkeletons();

  const res = await api.getProducts();

  if (!res || !res.ok) {
    grid.innerHTML = `
      <div class="empty-state" style="grid-column:1/-1">
        <div class="empty-icon">😕</div>
        <h3>Failed to load products</h3>
        <p>Check your connection and try again</p>
        <button class="btn btn-outline" style="width:auto;margin-top:8px" onclick="loadProducts()">Retry</button>
      </div>
    `;
    return;
  }

  allProducts = res.data.products || [];
  renderProducts(allProducts);
}

// ── Render categories ─────────────────────────────────────────
function renderCategories() {
  const container = document.getElementById("categories-scroll");
  if (!container) return;

  container.innerHTML = CATEGORIES.map(cat => `
    <div class="category-chip ${cat.label === activeCategory ? "active" : ""}" data-category="${cat.label}">
      <div class="category-chip-icon">${cat.icon}</div>
      <span class="category-chip-label">${cat.label}</span>
    </div>
  `).join("");

  container.querySelectorAll(".category-chip").forEach(chip => {
    chip.addEventListener("click", () => {
      activeCategory = chip.dataset.category;
      container.querySelectorAll(".category-chip").forEach(c => c.classList.remove("active"));
      chip.classList.add("active");
      // Clear search input when selecting a category
      const searchInput = document.getElementById("search-input");
      if (searchInput) searchInput.value = "";
      filterByCategory();
    });
  });
}

// ── Filter by category ────────────────────────────────────────
function filterByCategory() {
  const header = document.getElementById("search-results-header");
  if (header) header.style.display = "none";

  if (activeCategory === "All") {
    renderProducts(allProducts);
    return;
  }

  const filtered = allProducts.filter(p =>
    p.category.toLowerCase() === activeCategory.toLowerCase()
  );
  renderProducts(filtered, `${activeCategory} (${filtered.length})`);
}

// ── Render product grid ───────────────────────────────────────
function renderProducts(products, headerText = null) {
  const grid   = document.getElementById("products-grid");
  const header = document.getElementById("search-results-header");

  if (header) {
    if (headerText) {
      header.style.display = "block";
      header.innerHTML = headerText;
    } else {
      header.style.display = "none";
    }
  }

  if (!products || products.length === 0) {
    grid.innerHTML = `
      <div class="empty-state" style="grid-column:1/-1">
        <div class="empty-icon">🔍</div>
        <h3>No products found</h3>
        <p>Try a different search or category</p>
      </div>
    `;
    return;
  }

  grid.innerHTML = products.map(p => buildProductCard(p)).join("");

  grid.querySelectorAll(".product-add-btn").forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      handleAddToCart(btn.dataset.id, btn.dataset.name);
    });
  });
}

// ── Build product card ────────────────────────────────────────
function buildProductCard(product) {
  const inStock  = product.stock > 0;
  const lowStock = product.stock > 0 && product.stock <= 5;

  const stockText  = product.stock === 0 ? "Out of stock" : lowStock ? `Only ${product.stock} left` : `${product.stock} in stock`;
  const stockClass = product.stock === 0 ? "out" : lowStock ? "low" : "";
  
  const imageUrl = product.image || "https://placehold.co/400x400?text=No+Image";

  return `
    <div class="product-card">
      <div class="product-card-img-wrap">
        <img
          class="product-card-img"
          src="${escHtml(imageUrl)}"
          alt="${escHtml(product.name)}"
          loading="lazy"
          onload="this.classList.add('loaded')"
          onerror="this.src='https://placehold.co/400x400?text=No+Image'"
        />
        <span class="product-category-tag">${escHtml(product.category)}</span>
        ${!inStock ? '<div class="product-out-of-stock-overlay">Sold Out</div>' : ""}
      </div>
      <div class="product-card-body">
        <div class="product-card-name">${escHtml(product.name)}</div>
        <div class="product-card-price">${formatPrice(product.price)}</div>
        <div class="product-card-stock ${stockClass}">${stockText}</div>
        <button
          class="product-add-btn"
          data-id="${product._id}"
          data-name="${escHtml(product.name)}"
          ${!inStock ? "disabled" : ""}
          title="Add to cart"
        >+</button>
      </div>
    </div>
  `;
}

// ── Add to cart — requires login ──────────────────────────────
async function handleAddToCart(productId, productName) {
  // Require login before any cart action
  if (!auth.isLoggedIn()) {
    toast.info("Please log in to add items to your cart");
    setTimeout(() => window.location.href = "/login.html", 1200);
    return;
  }

  const btn = document.querySelector(`.product-add-btn[data-id="${productId}"]`);
  if (btn) { btn.disabled = true; btn.textContent = "✓"; }

  try {
    const res = await api.addToCart(productId, 1);
    if (res && res.ok) {
      toast.success(`"${productName}" added to cart`);
      navbar.updateCartBadge();
    } else {
      toast.error(res?.data?.error || "Failed to add item");
    }
  } catch {
    toast.error("Network error. Please try again.");
  } finally {
    if (btn) {
      setTimeout(() => { btn.disabled = false; btn.textContent = "+"; }, 1000);
    }
  }
}

// ── Search ────────────────────────────────────────────────────
function initSearch() {
  const input = document.getElementById("search-input");
  if (!input) return;

  const doSearch = debounce(async (term) => {
    const grid   = document.getElementById("products-grid");
    const header = document.getElementById("search-results-header");

    // Reset category to All when searching
    if (term.trim()) {
      activeCategory = "All";
      document.querySelectorAll(".category-chip").forEach(c => c.classList.remove("active"));
      document.querySelector('.category-chip[data-category="All"]')?.classList.add("active");
    }

    if (!term.trim()) {
      if (header) header.style.display = "none";
      filterByCategory();
      return;
    }

    grid.innerHTML = renderSkeletons();

    const res = await api.searchProducts(term.trim());

    if (!res || !res.ok) {
      if (header) { header.style.display = "block"; header.textContent = `No results for "${term}"`; }
      grid.innerHTML = `
        <div class="empty-state" style="grid-column:1/-1">
          <div class="empty-icon">🔍</div>
          <h3>No results found</h3>
          <p>Try a different keyword</p>
        </div>
      `;
      return;
    }

    const products = res.data.products || [];
    if (header) {
      header.style.display = "block";
      header.innerHTML = `<strong>${products.length}</strong> result${products.length !== 1 ? "s" : ""} for "<strong>${escHtml(term)}</strong>"`;
    }

    renderProducts(products);
  }, 450);

  input.addEventListener("input", (e) => doSearch(e.target.value));
}

// ── Auto focus search if coming from bottom nav search tab ────
function checkAutoFocus() {
  const params = new URLSearchParams(window.location.search);
  if (params.get("focus") === "search") {
    const input = document.getElementById("search-input");
    if (input) {
      input.focus();
      input.scrollIntoView({ behavior: "smooth" });
    }
  }
  // Pre-fill search if q param exists
  const q = params.get("q");
  if (q) {
    const input = document.getElementById("search-input");
    if (input) { input.value = q; input.dispatchEvent(new Event("input")); }
  }
}

// ── Skeleton loaders ──────────────────────────────────────────
function renderSkeletons(count = 6) {
  return Array.from({ length: count }).map(() => `
    <div class="product-card-skeleton">
      <div class="skeleton skeleton-img"></div>
      <div class="skeleton skeleton-text"></div>
      <div class="skeleton skeleton-text2"></div>
    </div>
  `).join("");
}
