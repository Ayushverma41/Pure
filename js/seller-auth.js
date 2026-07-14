(function () {
  const form = document.getElementById("sellerAuthForm");
  if (!form) return;

  const tabs = [...document.querySelectorAll(".tab")];
  const nameWrap = document.getElementById("nameWrap");
  const nameInput = document.getElementById("nameInput");
  const emailInput = document.getElementById("emailInput");
  const passwordInput = document.getElementById("passwordInput");
  const passwordLabel = document.getElementById("passwordLabel");
  const submitBtn = document.getElementById("submitBtn");
  const statusText = document.getElementById("statusText");

  let mode = "login";

  function setStatus(text, type) {
    statusText.textContent = text;
    statusText.classList.remove("error", "success");
    if (type) statusText.classList.add(type);
  }

  function setMode(next) {
    mode = next;
    tabs.forEach((tab) => tab.classList.toggle("active", tab.dataset.mode === next));
    nameWrap.classList.toggle("hidden", next !== "register");

    if (next === "login") {
      submitBtn.textContent = "Login";
      passwordLabel.textContent = "Password";
      passwordInput.autocomplete = "current-password";
      setStatus("Use your seller account credentials.");
    } else if (next === "register") {
      submitBtn.textContent = "Create Seller Account";
      passwordLabel.textContent = "New Password";
      passwordInput.autocomplete = "new-password";
      setStatus("Register with name, email and password.");
    } else {
      submitBtn.textContent = "Update Password";
      passwordLabel.textContent = "New Password";
      passwordInput.autocomplete = "new-password";
      setStatus("Reset password for an existing seller account.");
    }
  }

  function hashPassword(password) {
    return btoa(unescape(encodeURIComponent(String(password || ""))));
  }

  tabs.forEach((tab) => tab.addEventListener("click", () => setMode(tab.dataset.mode)));

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const email = String(emailInput.value || "").trim().toLowerCase();
    const password = String(passwordInput.value || "");

    if (!email || !password) {
      setStatus("Email and password are required.", "error");
      return;
    }

    try {
      submitBtn.disabled = true;

      if (mode === "register") {
        const name = String(nameInput.value || "").trim();
        if (!name) {
          setStatus("Name is required for registration.", "error");
          submitBtn.disabled = false;
          return;
        }
        const db = window.PureDB.read();
        const exists = db.sellers.some((s) => window.PureDB.normalizeEmail(s.email) === email);
        if (exists) throw new Error("Seller already exists");
        db.sellers.push({
          id: window.PureDB.id("seller"),
          name,
          email,
          password_hash: hashPassword(password),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
        window.PureDB.write(db);
        setStatus("Seller account created. You can login now.", "success");
        setMode("login");
        passwordInput.value = "";
      } else if (mode === "forgot") {
        const db = window.PureDB.read();
        const idx = db.sellers.findIndex((s) => window.PureDB.normalizeEmail(s.email) === email);
        if (idx === -1) throw new Error("Seller not found");
        db.sellers[idx].password_hash = hashPassword(password);
        db.sellers[idx].updated_at = new Date().toISOString();
        window.PureDB.write(db);
        setStatus("Password updated. Login with new password.", "success");
        setMode("login");
        passwordInput.value = "";
      } else {
        const db = window.PureDB.read();
        const seller = db.sellers.find(
          (s) => window.PureDB.normalizeEmail(s.email) === email && s.password_hash === hashPassword(password)
        );
        if (!seller) throw new Error("Invalid email or password");
        localStorage.setItem("pure_seller_user", JSON.stringify({ email: seller.email, name: seller.name, role: "seller" }));
        window.location.href = "seller.html";
      }
    } catch (error) {
      setStatus(error.message || "Action failed.", "error");
    } finally {
      submitBtn.disabled = false;
    }
  });

  setMode("login");
})();
