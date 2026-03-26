const SESSION_KEY = "pure_user_session_v1";

function normalizeEmail(v) {
  return String(v || "").trim().toLowerCase();
}

function setSession(session) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

function getSession() {
  return JSON.parse(localStorage.getItem(SESSION_KEY) || "null");
}

function clearSession() {
  localStorage.removeItem(SESSION_KEY);
}

function hashPassword(password) {
  return btoa(unescape(encodeURIComponent(String(password || ""))));
}

function initUserManager() {
  const page = document.getElementById("accountPage");
  if (!page) return;

  let mode = "login";

  const modeTitle = document.getElementById("modeTitle");
  const modeHeading = document.getElementById("modeHeading");
  const emailInput = document.getElementById("authEmail");
  const passLabel = document.getElementById("passwordLabel");
  const passInput = document.getElementById("authPassword");
  const mainBtn = document.getElementById("mainActionBtn");
  const afterLogin = document.getElementById("afterLoginPanel");
  const status = document.getElementById("authStatus");

  const setMode = (next) => {
    mode = next;
    if (next === "login") {
      modeTitle.textContent = "Login";
      modeHeading.textContent = "Welcome Back";
      passLabel.style.display = "flex";
      mainBtn.textContent = "Login";
    }
    if (next === "register") {
      modeTitle.textContent = "New User";
      modeHeading.textContent = "Create Account";
      passLabel.style.display = "flex";
      mainBtn.textContent = "Create User";
    }
    if (next === "forgot") {
      modeTitle.textContent = "Forgot Password";
      modeHeading.textContent = "Reset Password";
      passLabel.style.display = "flex";
      mainBtn.textContent = "Update Password";
    }
  };

  mainBtn.addEventListener("click", () => {
    const email = normalizeEmail(emailInput.value);
    const password = passInput.value;
    if (!email) return showToast("Email required");
    if (!password) return showToast("Password required");

    try {
      mainBtn.disabled = true;
      const db = window.PureDB.read();
      const users = db.buyers;
      const idx = users.findIndex((u) => normalizeEmail(u.email) === email);

      if (mode === "register") {
        if (idx !== -1) throw new Error("Buyer already exists");
        users.push({
          id: window.PureDB.id("buyer"),
          name: "Buyer",
          email,
          password_hash: hashPassword(password),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
        window.PureDB.write(db);
        showToast("Buyer account created");
        setMode("login");
        passInput.value = "";
        return;
      }

      if (mode === "forgot") {
        if (idx === -1) throw new Error("Buyer not found");
        users[idx].password_hash = hashPassword(password);
        users[idx].updated_at = new Date().toISOString();
        window.PureDB.write(db);
        showToast("Password updated");
        setMode("login");
        passInput.value = "";
        return;
      }

      if (idx === -1) throw new Error("Buyer not found");
      if (users[idx].password_hash !== hashPassword(password)) throw new Error("Invalid email or password");
      setSession({ role: "buyer", email, loginAt: Date.now() });
      afterLogin.style.display = "block";
      status.textContent = `Logged in as buyer: ${email}`;
      showToast("Login success");
    } catch (error) {
      showToast(error.message || "Action failed");
    } finally {
      mainBtn.disabled = false;
    }
  });

  page.querySelectorAll("[data-mode]").forEach((btn) => {
    btn.addEventListener("click", () => setMode(btn.dataset.mode));
  });

  document.getElementById("logoutBtn").addEventListener("click", () => {
    clearSession();
    afterLogin.style.display = "none";
    showToast("Logged out");
  });

  document.getElementById("deleteAccountBtn").addEventListener("click", () => {
    const session = getSession();
    if (!session || session.role !== "buyer") return showToast("Login first");
    try {
      const db = window.PureDB.read();
      db.buyers = db.buyers.filter((u) => normalizeEmail(u.email) !== normalizeEmail(session.email));
      window.PureDB.write(db);
      clearSession();
      afterLogin.style.display = "none";
      showToast("Account deleted");
    } catch (error) {
      showToast(error.message || "Delete failed");
    }
  });

  const session = getSession();
  if (session && session.role === "buyer" && session.email) {
    afterLogin.style.display = "block";
    status.textContent = `Logged in as buyer: ${session.email}`;
  }

  setMode("login");
}

document.addEventListener("DOMContentLoaded", initUserManager);
