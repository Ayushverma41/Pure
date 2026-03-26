const USER_STORE_KEY = "pure_users_v1";
const SESSION_KEY = "pure_user_session_v1";

function readUsers() {
  return JSON.parse(localStorage.getItem(USER_STORE_KEY) || '{"buyer":[],"seller":[]}');
}

function writeUsers(data) {
  localStorage.setItem(USER_STORE_KEY, JSON.stringify(data));
}

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

function initUserManager() {
  const page = document.getElementById("accountPage");
  if (!page) return;

  let role = "buyer";
  let mode = "login";

  const roleSwitch = document.getElementById("roleSwitch");
  const roleBtns = [...page.querySelectorAll(".role-btn")];
  const modeTitle = document.getElementById("modeTitle");
  const modeHeading = document.getElementById("modeHeading");
  const emailInput = document.getElementById("authEmail");
  const passLabel = document.getElementById("passwordLabel");
  const passInput = document.getElementById("authPassword");
  const mainBtn = document.getElementById("mainActionBtn");
  const afterLogin = document.getElementById("afterLoginPanel");
  const status = document.getElementById("authStatus");

  const setRole = (next) => {
    role = next;
    roleBtns.forEach((b) => b.classList.toggle("active", b.dataset.role === next));
    roleSwitch.classList.toggle("seller", next === "seller");
  };

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

  const findUserIndex = (list, email) => list.findIndex((u) => u.email === email);

  mainBtn.addEventListener("click", () => {
    const email = normalizeEmail(emailInput.value);
    const password = passInput.value;
    if (!email) return showToast("Email required");
    if (!password) return showToast("Password required");

    const data = readUsers();
    data.buyer = Array.isArray(data.buyer) ? data.buyer : [];
    data.seller = Array.isArray(data.seller) ? data.seller : [];
    const list = data[role];
    const idx = findUserIndex(list, email);

    if (mode === "register") {
      if (idx !== -1) return showToast("User already exists");
      list.push({ email, password, createdAt: Date.now(), updatedAt: Date.now() });
      writeUsers(data);
      showToast("User created");
      setMode("login");
      return;
    }

    if (mode === "forgot") {
      if (idx === -1) return showToast("User not found");
      list[idx].password = password;
      list[idx].updatedAt = Date.now();
      writeUsers(data);
      showToast("Password updated");
      setMode("login");
      return;
    }

    if (idx === -1) return showToast("User not found");
    if (list[idx].password !== password) return showToast("Invalid password");

    setSession({ role, email, loginAt: Date.now() });
    afterLogin.style.display = "block";
    status.textContent = `Logged in as ${role}: ${email}`;
    showToast("Login success");
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
    if (!session) return showToast("Login first");
    const data = readUsers();
    const list = data[session.role] || [];
    const idx = findUserIndex(list, session.email);
    if (idx === -1) return showToast("User not found");
    list.splice(idx, 1);
    writeUsers(data);
    clearSession();
    afterLogin.style.display = "none";
    showToast("Account deleted");
  });

  roleBtns.forEach((b) => b.addEventListener("click", () => setRole(b.dataset.role)));

  const session = getSession();
  if (session && session.role && session.email) {
    setRole(session.role);
    afterLogin.style.display = "block";
    status.textContent = `Logged in as ${session.role}: ${session.email}`;
  }

  setRole("buyer");
  setMode("login");
}

document.addEventListener("DOMContentLoaded", initUserManager);
