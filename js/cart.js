// ============================================================
// cart.js — Cart page logic
// Render cart, update quantity, remove item, checkout
// ============================================================

document.addEventListener("DOMContentLoaded", async () => {
  auth.requireLogin();
  navbar.render({ title: "My Cart" });
  await loadCart();
});

// ── Load and render the cart ──────────────────────────────────
async function loadCart() {
  const listEl    = document.getElementById("cart-items-list");
  const summaryEl = document.getElementById("order-summary");

  listEl.innerHTML = `<div class="spinner-wrap"><div class="spinner"></div><p>Loading cart…</p></div>`;

  const res = await api.getCart();

  if (!res || !res.ok) {
    listEl.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">😕</div>
        <h3>Failed to load cart</h3>
        <p>Please refresh and try again</p>
      </div>
    `;
    return;
  }

  const { cart, total } = res.data;
  const items = cart?.items || [];

  if (items.length === 0) {
    listEl.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">🛒</div>
        <h3>Your cart is empty</h3>
        <p>Add some products to get started</p>
        <a href="/index.html" class="btn btn-primary" style="width:auto;margin-top:12px">Browse Products</a>
      </div>
    `;
    summaryEl.style.display = "none";
    document.getElementById("checkout-btn-wrap").style.display = "none";
    return;
  }

  summaryEl.style.display = "block";
  document.getElementById("checkout-btn-wrap").style.display = "block";

  renderCartItems(items);
  renderSummary(items, total || 0);
}

// ── Render all cart item rows ─────────────────────────────────
function renderCartItems(items) {
  const listEl = document.getElementById("cart-items-list");

  listEl.innerHTML = items.map(item => {
    const product  = item.product || {};
    const name     = product.name  || "Unknown Product";
    const image    = product.image || "https://placehold.co/80x80?text=?";
    const stock    = product.stock !== undefined ? product.stock : 999;
    const subtotal = item.priceAtAdd * item.quantity;

    return `
      <div class="cart-item" data-item-id="${item._id}">
        <img
          class="cart-item-img"
          src="${escHtml(image)}"
          alt="${escHtml(name)}"
          onerror="this.src='https://placehold.co/80x80?text=?'"
        />
        <div class="cart-item-details">
          <div class="cart-item-name">${escHtml(name)}</div>
          <div class="cart-item-price">${formatPrice(item.priceAtAdd)} each</div>
          <div class="cart-item-bottom">
            <div class="qty-control">
              <button
                class="qty-btn"
                data-action="decrease"
                data-item-id="${item._id}"
                data-qty="${item.quantity}"
                ${item.quantity <= 1 ? "disabled" : ""}
              >−</button>
              <span class="qty-display">${item.quantity}</span>
              <button
                class="qty-btn"
                data-action="increase"
                data-item-id="${item._id}"
                data-qty="${item.quantity}"
                data-stock="${stock}"
                ${item.quantity >= stock ? "disabled" : ""}
              >+</button>
            </div>
            <div class="cart-item-subtotal">${formatPrice(subtotal)}</div>
          </div>
        </div>
        <button
          class="cart-item-remove"
          data-item-id="${item._id}"
          title="Remove item"
        >✕</button>
      </div>
    `;
  }).join("");

  attachCartListeners();
}

// ── Render order summary box ──────────────────────────────────
function renderSummary(items, total) {
  const count = items.reduce((sum, item) => sum + item.quantity, 0);

  document.getElementById("summary-items-count").textContent =
    `${count} item${count !== 1 ? "s" : ""}`;
  document.getElementById("summary-total").textContent = formatPrice(total);
}

// ── Attach listeners to qty buttons and remove buttons ───────
function attachCartListeners() {
  // Decrease quantity
  document.querySelectorAll('[data-action="decrease"]').forEach(btn => {
    btn.addEventListener("click", async () => {
      const itemId = btn.dataset.itemId;
      const newQty = parseInt(btn.dataset.qty) - 1;
      await updateQty(itemId, newQty);
    });
  });

  // Increase quantity
  document.querySelectorAll('[data-action="increase"]').forEach(btn => {
    btn.addEventListener("click", async () => {
      const itemId = btn.dataset.itemId;
      const newQty = parseInt(btn.dataset.qty) + 1;
      const stock  = parseInt(btn.dataset.stock);
      if (newQty > stock) {
        toast.error("Not enough stock available");
        return;
      }
      await updateQty(itemId, newQty);
    });
  });

  // Remove item
  document.querySelectorAll(".cart-item-remove").forEach(btn => {
    btn.addEventListener("click", async () => {
      const itemId = btn.dataset.itemId;
      await removeItem(itemId);
    });
  });
}

// ── Update item quantity ──────────────────────────────────────
async function updateQty(itemId, newQty) {
  const res = await api.updateCartItem(itemId, newQty);

  if (res && res.ok) {
    const items = res.data.cart?.items || [];
    renderCartItems(items);
    renderSummary(items, res.data.total || 0);
    navbar.updateCartBadge();
  } else {
    toast.error(res?.data?.error || "Failed to update quantity");
  }
}

// ── Remove item from cart ─────────────────────────────────────
async function removeItem(itemId) {
  const res = await api.removeCartItem(itemId);

  if (res && res.ok) {
    toast.success("Item removed");
    await loadCart();
    navbar.updateCartBadge();
  } else {
    toast.error(res?.data?.error || "Failed to remove item");
  }
}

// ── Checkout ──────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  const checkoutBtn = document.getElementById("checkout-btn");
  if (!checkoutBtn) return;

  checkoutBtn.addEventListener("click", async () => {
    checkoutBtn.disabled    = true;
    checkoutBtn.textContent = "Placing order…";

    const res = await api.checkout();

    if (res && res.ok) {
      toast.success("Order placed successfully! 🎉");
      navbar.updateCartBadge();
      setTimeout(() => window.location.href = "/orders.html", 1500);
    } else {
      const errors = res?.data?.errors;
      if (errors && errors.length > 0) {
        errors.forEach(err => toast.error(err));
      } else {
        toast.error(res?.data?.error || "Checkout failed. Please try again.");
      }
      checkoutBtn.disabled    = false;
      checkoutBtn.textContent = "Checkout";
    }
  });
});
