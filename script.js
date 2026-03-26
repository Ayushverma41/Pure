function readCart() {
  return JSON.parse(localStorage.getItem("pure_cart") || "[]");
}

function writeCart(cart) {
  localStorage.setItem("pure_cart", JSON.stringify(cart));
  updateCartCount();
}

function updateCartCount() {
  const count = readCart().reduce((t, i) => t + i.qty, 0);
  document.querySelectorAll("[data-cart-count]").forEach((el) => {
    el.textContent = count;
    el.classList.add("pulse");
    setTimeout(() => el.classList.remove("pulse"), 300);
  });
}

function addToCart(productId, qty = 1) {
  const cart = readCart();
  const existing = cart.find((i) => i.id === productId);
  if (existing) {
    existing.qty += qty;
  } else {
    cart.push({ id: productId, qty });
  }
  writeCart(cart);
  showToast("Added to cart");
}

function getProductById(id) {
  return PRODUCTS.find((p) => p.id === id);
}

async function syncProductsFromApi() {
  const db = window.PureDB && window.PureDB.read ? window.PureDB.read() : { products: [] };
  const incoming = Array.isArray(db.products) ? db.products : [];
  if (!incoming.length) return;
  const map = new Map(PRODUCTS.map((p) => [p.id, p]));
  incoming.forEach((p) => {
    if (!p || !p.id) return;
    const normalized = {
      id: String(p.id),
      name: String(p.name || "Untitled Product"),
      category: String(p.category || "Other"),
      price: Number(p.price || 0),
      image: String(p.image || "image/Offer/01.png"),
      gallery: Array.isArray(p.gallery) && p.gallery.length ? p.gallery : [String(p.image || "image/Offer/01.png")],
      rating: Number(p.rating || 4.5),
      desc: String(p.desc || "Seller listed product.")
    };
    map.set(normalized.id, normalized);
  });
  PRODUCTS = [...map.values()];
}

function stars(rating) {
  const full = Math.floor(rating);
  const half = rating - full >= 0.5 ? 1 : 0;
  return "★".repeat(full) + (half ? "½" : "") + "☆".repeat(5 - full - half);
}

function setTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  localStorage.setItem("pure_theme", theme);
}

function initTheme() {
  const theme = localStorage.getItem("pure_theme") || "light";
  setTheme(theme);
  const btn = document.getElementById("themeToggle");
  if (btn) {
    btn.textContent = theme === "light" ? "Dark" : "Light";
    btn.onclick = () => {
      const current = document.documentElement.getAttribute("data-theme");
      const next = current === "light" ? "dark" : "light";
      setTheme(next);
      btn.textContent = next === "light" ? "Dark" : "Light";
    };
  }
}

function showToast(message) {
  const toast = document.getElementById("toast");
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(window.__pureToastTimer);
  window.__pureToastTimer = setTimeout(() => toast.classList.remove("show"), 1300);
}

function initPageFx() {
  window.addEventListener("load", () => {
    document.body.classList.add("loaded");
  });

  document.querySelectorAll("a[href$='.html'], a[href*='.html?']").forEach((a) => {
    a.addEventListener("click", (e) => {
      const href = a.getAttribute("href");
      if (!href || href.startsWith("#")) return;
      if (e.ctrlKey || e.metaKey || e.shiftKey) return;
      e.preventDefault();
      document.body.classList.remove("loaded");
      setTimeout(() => {
        window.location.href = href;
      }, 220);
    });
  });
}

function productCard(p) {
  return `
    <article class="card reveal">
      <a href="product.html?id=${p.id}" class="card-media"><img src="${p.image}" alt="${p.name}"></a>
      <div class="card-body">
        <h3>${p.name}</h3>
        <div class="meta">${p.category} • ${stars(p.rating)}</div>
        <div class="row">
          <div class="price">${formatPrice(p.price)}</div>
          <button class="btn-primary" data-add="${p.id}">Add to Cart</button>
        </div>
      </div>
    </article>`;
}

function bindAddButtons(root = document) {
  root.querySelectorAll("[data-add]").forEach((btn) => {
    btn.onclick = () => {
      addToCart(btn.dataset.add, 1);
      btn.textContent = "Added";
      setTimeout(() => (btn.textContent = "Add to Cart"), 700);
    };
  });
}

function initCatalogPage() {
  const grid = document.getElementById("catalogGrid");
  if (!grid) return;
  const filterButtons = [...document.querySelectorAll(".filter-btn")];
  const draw = (cat) => {
    const list = cat === "All" ? PRODUCTS : PRODUCTS.filter((p) => p.category === cat);
    grid.innerHTML = list.map(productCard).join("");
    bindAddButtons(grid);
  };
  filterButtons.forEach((btn) => {
    btn.onclick = () => {
      filterButtons.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      draw(btn.dataset.filter);
    };
  });
  draw("All");
}

function initHomePage() {
  const featured = document.getElementById("featuredGrid");
  if (!featured) return;
  featured.innerHTML = PRODUCTS.slice(0, 8).map(productCard).join("");
  bindAddButtons(featured);
}

function initProductPage() {
  const wrap = document.getElementById("productPage");
  if (!wrap) return;
  const params = new URLSearchParams(location.search);
  const p = getProductById(params.get("id")) || PRODUCTS[0];

  document.getElementById("pName").textContent = p.name;
  document.getElementById("pCat").textContent = p.category;
  document.getElementById("pRate").textContent = stars(p.rating);
  document.getElementById("pDesc").textContent = p.desc;
  document.getElementById("pPrice").textContent = formatPrice(p.price);

  const main = document.getElementById("mainImage");
  main.src = p.image;

  const strip = document.getElementById("thumbs");
  strip.innerHTML = p.gallery.map((img) => `<img src="${img}" alt="${p.name}">`).join("");
  strip.querySelectorAll("img").forEach((img) => {
    img.onclick = () => (main.src = img.src);
  });

  document.getElementById("addBtn").onclick = () => {
    const qty = Number(document.getElementById("qty").value || 1);
    addToCart(p.id, Math.max(1, qty));
  };
}

function initCartPage() {
  const body = document.getElementById("cartBody");
  if (!body) return;
  const cart = readCart();
  if (!cart.length) {
    body.innerHTML = `<tr><td colspan="5">Cart is empty. <a href="products.html">Explore products</a></td></tr>`;
    document.getElementById("subTotal").textContent = formatPrice(0);
    document.getElementById("grandTotal").textContent = formatPrice(0);
    return;
  }

  let subtotal = 0;
  body.innerHTML = cart.map((item) => {
    const p = getProductById(item.id);
    if (!p) return "";
    const line = p.price * item.qty;
    subtotal += line;
    return `
      <tr>
        <td><img src="${p.image}" alt="${p.name}" style="width:58px;height:58px;object-fit:cover;border-radius:8px"></td>
        <td>${p.name}</td>
        <td>${formatPrice(p.price)}</td>
        <td>${item.qty}</td>
        <td>${formatPrice(line)}</td>
      </tr>`;
  }).join("");

  const ship = subtotal > 50000 ? 0 : 499;
  document.getElementById("subTotal").textContent = formatPrice(subtotal);
  document.getElementById("shipping").textContent = formatPrice(ship);
  document.getElementById("grandTotal").textContent = formatPrice(subtotal + ship);

  const clear = document.getElementById("clearCart");
  if (clear) clear.onclick = () => {
    writeCart([]);
    location.reload();
  };
}

document.addEventListener("DOMContentLoaded", async () => {
  await syncProductsFromApi();
  initPageFx();
  initTheme();
  updateCartCount();
  initHomePage();
  initCatalogPage();
  initProductPage();
  initCartPage();
});
