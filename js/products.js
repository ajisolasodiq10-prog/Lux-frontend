// ============================================================
// products.js — Shop page logic
// Loads products, handles search, category filter, add to cart
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

let allProducts   = [];
let activeCategory = "All";

// ── Init ──────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", async () => {
  navbar.render({ showSearch: true });
  renderCategories();
  await loadProducts();
  initSearch();
  checkAutoSearch();
});

// ── Load all products from backend ────────────────────────────
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

// ── Render category chips ─────────────────────────────────────
function renderCategories() {
  const container = document.getElementById("categories-scroll");
  if (!container) return;

  container.innerHTML = CATEGORIES.map(cat => `
    <div
      class="category-chip ${cat.label === activeCategory ? "active" : ""}"
      data-category="${cat.label}"
    >
      <div class="category-chip-icon">${cat.icon}</div>
      <span class="category-chip-label">${cat.label}</span>
    </div>
  `).join("");

  container.querySelectorAll(".category-chip").forEach(chip => {
    chip.addEventListener("click", () => {
      activeCategory = chip.dataset.category;
      // Update active state visually
      container.querySelectorAll(".category-chip").forEach(c => c.classList.remove("active"));
      chip.classList.add("active");
      // Filter products
      filterByCategory();
    });
  });
}

// ── Filter displayed products by category ────────────────────
function filterByCategory() {
  if (activeCategory === "All") {
    renderProducts(allProducts);
    return;
  }
  const filtered = allProducts.filter(p =>
    p.category.toLowerCase().includes(activeCategory.toLowerCase())
  );
  renderProducts(filtered);
}

// ── Render product cards into the grid ───────────────────────
function renderProducts(products) {
  const grid = document.getElementById("products-grid");
  const header = document.getElementById("search-results-header");

  if (header) {
    header.style.display = "none";
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

  // Attach add-to-cart buttons
  grid.querySelectorAll(".product-add-btn").forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      handleAddToCart(btn.dataset.id, btn.dataset.name);
    });
  });
}

// ── Build one product card HTML ───────────────────────────────
function buildProductCard(product) {
  const inStock  = product.stock > 0;
  const lowStock = product.stock > 0 && product.stock <= 5;

  const stockText = product.stock === 0
    ? "Out of stock"
    : lowStock
    ? `Only ${product.stock} left`
    : `${product.stock} in stock`;

  const stockClass = product.stock === 0 ? "out" : lowStock ? "low" : "";

  return `
    <div class="product-card">
      <div class="product-card-img-wrap">
        <img
          class="product-card-img"
          src="${escHtml(product.image)}"
          alt="${escHtml(product.name)}"
          loading="lazy"
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

// ── Handle Add to Cart click ──────────────────────────────────
async function handleAddToCart(productId, productName) {
  if (!auth.isLoggedIn()) {
    toast.info("Please log in to add items to your cart");
    setTimeout(() => window.location.href = "/login.html", 1200);
    return;
  }

  const btn = document.querySelector(`.product-add-btn[data-id="${productId}"]`);
  if (btn) {
    btn.disabled = true;
    btn.textContent = "✓";
  }

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
      setTimeout(() => {
        btn.disabled = false;
        btn.textContent = "+";
      }, 1000);
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

    if (!term.trim()) {
      if (header) header.style.display = "none";
      filterByCategory();
      return;
    }

    grid.innerHTML = renderSkeletons();

    const res = await api.searchProducts(term.trim());

    if (header) {
      header.style.display = "block";
      header.innerHTML = res?.ok
        ? `<strong>${res.data.count}</strong> result${res.data.count !== 1 ? "s" : ""} for "<strong>${escHtml(term)}</strong>"`
        : `No results for "<strong>${escHtml(term)}</strong>"`;
    }

    if (!res || !res.ok) {
      grid.innerHTML = `
        <div class="empty-state" style="grid-column:1/-1">
          <div class="empty-icon">🔍</div>
          <h3>No results found</h3>
          <p>Try a different keyword</p>
        </div>
      `;
      return;
    }

    renderProducts(res.data.products || []);
  }, 450);

  input.addEventListener("input", (e) => doSearch(e.target.value));
}

// ── If user clicked Search from another page ──────────────────
function checkAutoSearch() {
  const params = new URLSearchParams(window.location.search);
  const q = params.get("q");
  if (q) {
    const input = document.getElementById("search-input");
    if (input) {
      input.value = q;
      input.dispatchEvent(new Event("input"));
    }
  }
}

// ── Skeleton loader cards ────────────────────────────────────
function renderSkeletons(count = 6) {
  return Array.from({ length: count }).map(() => `
    <div class="product-card-skeleton">
      <div class="skeleton skeleton-img"></div>
      <div class="skeleton skeleton-text"></div>
      <div class="skeleton skeleton-text2"></div>
    </div>
  `).join("");
}
