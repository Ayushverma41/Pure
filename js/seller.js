(function () {
  const toast = document.getElementById("sellerToast");
  const logoutBtn = document.getElementById("sellerLogoutBtn");

  function getSeller() {
    try {
      return JSON.parse(localStorage.getItem("pure_seller_user") || "null");
    } catch {
      return null;
    }
  }

  function showToast(text) {
    if (!toast) return;
    toast.textContent = text;
    toast.classList.add("show");
    clearTimeout(window.__sellerToastTimer);
    window.__sellerToastTimer = setTimeout(() => toast.classList.remove("show"), 1400);
  }

  function enforceSession() {
    const seller = getSeller();
    if (!seller || !seller.email) {
      window.location.href = "seller-login.html";
      return null;
    }
    return seller;
  }

  function drawManagedProducts(list) {
    const root = document.getElementById("sellerProductsList");
    if (!root) return;
    if (!Array.isArray(list) || !list.length) {
      root.innerHTML = "<li>No products added yet.</li>";
      return;
    }
    root.innerHTML = list
      .slice()
      .reverse()
      .slice(0, 20)
      .map((p) => `<li>${p.id} | ${p.name} | ${p.category} | Rs. ${p.price}</li>`)
      .join("");
  }

  async function refreshProducts(sellerEmail) {
    const db = window.PureDB.read();
    const mine = db.products.filter((p) => window.PureDB.normalizeEmail(p.seller_email) === window.PureDB.normalizeEmail(sellerEmail));
    drawManagedProducts(mine);
  }

  function bindProductForms(sellerEmail) {
    const addForm = document.getElementById("addProductForm");
    const updateForm = document.getElementById("updateProductForm");
    const removeForm = document.getElementById("removeProductForm");

    if (addForm) {
      addForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        const name = document.getElementById("addName").value.trim();
        const category = document.getElementById("addCategory").value.trim();
        const price = Number(document.getElementById("addPrice").value || 0);
        const image = document.getElementById("addImage").value.trim();
        const desc = document.getElementById("addDesc").value.trim();

        if (!name || !category || !Number.isFinite(price) || price <= 0) {
          showToast("Name, category, valid price required");
          return;
        }

        try {
          const db = window.PureDB.read();
          db.products.push({
            id: window.PureDB.id("product"),
            name,
            category,
            price,
            image: image || "image/Offer/01.png",
            gallery: [image || "image/Offer/01.png"],
            rating: 4.5,
            desc: desc || "Seller listed product",
            seller_email: sellerEmail,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
          window.PureDB.write(db);
          addForm.reset();
          await refreshProducts(sellerEmail);
          showToast("Product added");
        } catch (error) {
          showToast(error.message || "Add failed");
        }
      });
    }

    if (updateForm) {
      updateForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        const id = document.getElementById("updateId").value.trim();
        const name = document.getElementById("updateName").value.trim();
        const category = document.getElementById("updateCategory").value.trim();
        const priceRaw = document.getElementById("updatePrice").value.trim();
        const image = document.getElementById("updateImage").value.trim();
        const desc = document.getElementById("updateDesc").value.trim();

        if (!id) {
          showToast("Product ID required");
          return;
        }

        const payload = { sellerEmail, id, name, category, image, desc };
        if (priceRaw) payload.price = Number(priceRaw);

        try {
          const db = window.PureDB.read();
          const idx = db.products.findIndex(
            (p) => p.id === id && window.PureDB.normalizeEmail(p.seller_email) === window.PureDB.normalizeEmail(sellerEmail)
          );
          if (idx === -1) throw new Error("Product not found");
          if (payload.name) db.products[idx].name = payload.name;
          if (payload.category) db.products[idx].category = payload.category;
          if (payload.image) {
            db.products[idx].image = payload.image;
            db.products[idx].gallery = [payload.image];
          }
          if (payload.desc) db.products[idx].desc = payload.desc;
          if (payload.price) db.products[idx].price = Number(payload.price);
          db.products[idx].updated_at = new Date().toISOString();
          window.PureDB.write(db);
          updateForm.reset();
          await refreshProducts(sellerEmail);
          showToast("Product updated");
        } catch (error) {
          showToast(error.message || "Update failed");
        }
      });
    }

    if (removeForm) {
      removeForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        const id = document.getElementById("removeId").value.trim();
        if (!id) {
          showToast("Product ID required");
          return;
        }
        try {
          const db = window.PureDB.read();
          const next = db.products.filter(
            (p) => !(p.id === id && window.PureDB.normalizeEmail(p.seller_email) === window.PureDB.normalizeEmail(sellerEmail))
          );
          if (next.length === db.products.length) throw new Error("Product not found");
          db.products = next;
          window.PureDB.write(db);
          removeForm.reset();
          await refreshProducts(sellerEmail);
          showToast("Product removed");
        } catch (error) {
          showToast(error.message || "Remove failed");
        }
      });
    }
  }

  document.querySelectorAll("[data-seller-action]").forEach((btn) => {
    btn.addEventListener("click", () => showToast(`${btn.textContent} panel placeholder`));
  });

  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      localStorage.removeItem("pure_seller_user");
      window.location.href = "seller-login.html";
    });
  }

  (async () => {
    const seller = enforceSession();
    if (!seller) return;
    bindProductForms(seller.email);
    await refreshProducts(seller.email);
  })();
})();
