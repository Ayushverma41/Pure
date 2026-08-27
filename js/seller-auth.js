(function () {
  const form = document.getElementById("sellerAuthForm");
  if (!form || !window.PureDB) return;

  const elements = {
    tabs: [...document.querySelectorAll(".tab")],
    tabsContainer: document.querySelector(".tabs"),
    nameWrap: document.getElementById("nameWrap"),
    name: document.getElementById("nameInput"),
    identityLabel: document.getElementById("identityLabel"),
    email: document.getElementById("emailInput"),
    password: document.getElementById("passwordInput"),
    passwordLabel: document.getElementById("passwordLabel"),
    submit: document.getElementById("submitBtn"),
    submitText: document.getElementById("submitBtnText"),
    submitIcon: document.getElementById("submitBtnIcon"),
    status: document.getElementById("statusText")
  };

  const modes = {
    login: { button: "Login", icon: "bi-arrow-right", passwordLabel: "Password", placeholder: "Enter your password", autocomplete: "current-password" },
    register: { button: "Create Seller Account", icon: "bi-person-plus", passwordLabel: "New Password", placeholder: "Minimum 6 characters", autocomplete: "new-password" },
    forgot: { button: "Update Password", icon: "bi-key", passwordLabel: "New Password", placeholder: "Enter your new password", autocomplete: "new-password" }
  };

  let mode = "login";
  let isRedirecting = false;
  const hashPassword = (password) => btoa(unescape(encodeURIComponent(password)));

  function setStatus(message = "", type = "") {
    elements.status.textContent = message;
    elements.status.className = `status${message ? ` show ${type}` : ""}`;
  }

  function setMode(nextMode) {
    mode = nextMode;
    const config = modes[mode];
    const isRegistering = mode === "register";
    elements.tabsContainer.dataset.active = mode;
    elements.tabs.forEach((tab) => {
      const isActive = tab.dataset.mode === mode;
      tab.classList.toggle("active", isActive);
      tab.setAttribute("aria-pressed", String(isActive));
    });
    elements.nameWrap.classList.toggle("hidden", !isRegistering);
    elements.name.disabled = !isRegistering;
    elements.name.required = isRegistering;
    elements.identityLabel.textContent = mode === "login" ? "Username" : "Email Address";
    elements.email.type = mode === "login" ? "text" : "email";
    elements.email.autocomplete = mode === "login" ? "username" : "email";
    elements.email.placeholder = mode === "login" ? "Enter your username" : "seller@example.com";
    elements.passwordLabel.textContent = config.passwordLabel;
    elements.password.placeholder = config.placeholder;
    elements.password.autocomplete = config.autocomplete;
    elements.submitText.textContent = config.button;
    elements.submitIcon.className = `bi ${config.icon}`;
    setStatus();
  }

  function getSeller(db, identity) {
    return db.sellers.find((seller) =>
      window.PureDB.normalizeEmail(seller.email) === identity ||
      String(seller.username || "").trim().toLowerCase() === identity
    );
  }

  elements.tabs.forEach((tab) => tab.addEventListener("click", () => {
    if (tab.dataset.mode !== mode) setMode(tab.dataset.mode);
  }));

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    if (isRedirecting) return;
    const identity = elements.email.value.trim();
    const password = elements.password.value;
    const name = elements.name.value.trim();

    if (!identity || !password || (mode === "register" && !name)) {
      setStatus("Please complete all required fields.", "error");
      return;
    }
    if (mode !== "login" && !elements.email.validity.valid) {
      setStatus("Enter a valid email address.", "error");
      return;
    }
    if (mode !== "login" && password.length < 6) {
      setStatus("Password must be at least 6 characters.", "error");
      return;
    }

    elements.submit.disabled = true;
    try {
      const email = window.PureDB.normalizeEmail(identity);
      const db = window.PureDB.read();
      const seller = getSeller(db, email);
      if (mode === "register") {
        if (seller) throw new Error("A seller account with this email already exists.");
        const now = new Date().toISOString();
        db.sellers.push({ id: window.PureDB.id("seller"), name, email, password_hash: hashPassword(password), created_at: now, updated_at: now });
        window.PureDB.write(db);
        elements.name.value = "";
        elements.password.value = "";
        setMode("login");
        setStatus("Seller account created. You can log in now.", "success");
      } else if (mode === "forgot") {
        if (!seller) throw new Error("No seller account found with this email.");
        seller.password_hash = hashPassword(password);
        seller.updated_at = new Date().toISOString();
        window.PureDB.write(db);
        elements.password.value = "";
        setMode("login");
        setStatus("Password updated. Log in with your new password.", "success");
      } else {
        if (!seller || seller.password_hash !== hashPassword(password)) {
          throw new Error("Invalid username or password.");
        }
        localStorage.setItem("pure_seller_user", JSON.stringify({
          email: seller.email, name: seller.name, role: "seller"
        }));
        isRedirecting = true;
        setStatus("Login successful. Redirecting...", "success");
        window.setTimeout(() => { window.location.href = "seller.html"; }, 450);
      }
    } catch (error) {
      setStatus(error.message || "Action failed.", "error");
    } finally {
      if (!isRedirecting) elements.submit.disabled = false;
    }
  });

  setMode(mode);
})();
