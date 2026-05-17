// ============================================================
// register.js — Register page logic
// ============================================================

// Redirect if already logged in
if (auth.isLoggedIn()) {
  window.location.href = "/index.html";
}

document.addEventListener("DOMContentLoaded", () => {
  const form      = document.getElementById("register-form");
  const alertEl   = document.getElementById("register-alert");
  const submitBtn = document.getElementById("register-btn");

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

    const name     = document.getElementById("name").value.trim();
    const email    = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;
    const confirm  = document.getElementById("confirm-password").value;

    if (!name || !email || !password || !confirm) {
      showError("Please fill in all fields.");
      return;
    }
    if (name.length < 3) {
      showError("Name must be at least 3 characters.");
      return;
    }
    if (password.length < 6) {
      showError("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirm) {
      showError("Passwords do not match.");
      return;
    }

    submitBtn.disabled    = true;
    submitBtn.textContent = "Creating account…";

    const res = await api.register(name, email, password);

    if (res && res.ok) {
      auth.saveAuth(res.data.token, res.data.user);
      window.location.href = "/index.html";
    } else {
      showError(res?.data?.error || "Registration failed. Please try again.");
      submitBtn.disabled    = false;
      submitBtn.textContent = "Create Account";
    }
  });
});
