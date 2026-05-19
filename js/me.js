// ============================================================
// me.js — Profile page logic
// ============================================================

document.addEventListener("DOMContentLoaded", async () => {
  auth.requireLogin();
  navbar.render({ title: "My Profile" });

  const user = auth.getUser();
  if (!user) return;

  // ── Populate header ───────────────────────────────────────
  // Avatar — first letter of name
  document.getElementById("profile-avatar").textContent =
    user.name ? user.name.charAt(0).toUpperCase() : "👤";

  document.getElementById("profile-name").textContent  = user.name  || "—";
  document.getElementById("profile-email").textContent = user.email || "—";
  document.getElementById("profile-role").textContent  = user.role  || "user";

  // Show admin menu item if admin or superadmin
  if (auth.isAdmin()) {
    document.getElementById("admin-menu-item").style.display = "flex";
  }

  // ── Load stats from API ───────────────────────────────────
  try {
    const [ordersRes, profileRes] = await Promise.all([
      api.getMyOrders(),
      api.getMe(),
    ]);

    if (ordersRes?.ok) {
      const orders = ordersRes.data.orders || [];
      document.getElementById("stat-orders").textContent = orders.length;

      const totalSpent = orders
        .filter(o => o.status !== "cancelled")
        .reduce((sum, o) => sum + o.totalPrice, 0);
      document.getElementById("stat-spent").textContent = formatPrice(totalSpent);
    }

    if (profileRes?.ok) {
      const createdAt = profileRes.data.user?.createdAt;
      if (createdAt) {
        document.getElementById("profile-since").textContent =
          `Member since ${formatDate(createdAt)}`;
      }
    }
  } catch {
    // Stats fail silently — profile still shows
  }

  // ── Logout ───────────────────────────────────────────────
  document.getElementById("logout-btn").addEventListener("click", () => {
    if (confirm("Are you sure you want to logout?")) {
      auth.clearAuth();
      window.location.href = "/login.html";
    }
  });
});
