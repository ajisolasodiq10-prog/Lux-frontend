// ============================================================
// login.js — Login page logic
// ============================================================

// Redirect if already logged in
if (auth.isLoggedIn()) {
  window.location.href = auth.isAdmin() ? "/admin.html" : "/index.html";
}

document.addEventListener("DOMContentLoaded", () => {
  if (window.navbar && typeof navbar.render === "function") {
    navbar.render();
  }

  const form      = document.getElementById("login-form");
  const alertEl   = document.getElementById("login-alert");
  const submitBtn = document.getElementById("login-btn");

  function showError(msg) {
    alertEl.textContent = msg;
    alertEl.className   = "alert alert-error show";
  }

  function clearError() {
    alertEl.className = "alert";
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    clearError();

    const email    = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;

    if (!email || !password) {
      showError("Please enter your email and password.");
      return;
    }

    submitBtn.disabled    = true;
    submitBtn.textContent = "Signing in…";

    const res = await api.login(email, password);

    if (res && res.ok) {
      auth.saveAuth(res.data.token, res.data.user);
      window.location.href = res.data.user.role === "user"
        ? "/index.html"
        : "/admin.html";
    } else {
      showError(res?.data?.error || "Login failed. Please try again.");
      submitBtn.disabled    = false;
      submitBtn.textContent = "Sign In";
    }
  });
});
