(function () {
  const DB_KEY = "pure_local_db_v1";

  const seed = {
    buyers: [],
    sellers: [],
    products: []
  };

  function safeParse(raw, fallback) {
    try {
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === "object" ? parsed : fallback;
    } catch {
      return fallback;
    }
  }

  function read() {
    const db = safeParse(localStorage.getItem(DB_KEY) || "", seed);
    db.buyers = Array.isArray(db.buyers) ? db.buyers : [];
    db.sellers = Array.isArray(db.sellers) ? db.sellers : [];
    db.products = Array.isArray(db.products) ? db.products : [];
    return db;
  }

  function write(db) {
    localStorage.setItem(DB_KEY, JSON.stringify(db));
    return db;
  }

  function normalizeEmail(v) {
    return String(v || "").trim().toLowerCase();
  }

  function id(prefix) {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  }

  window.PureDB = {
    read,
    write,
    normalizeEmail,
    id,
    key: DB_KEY
  };
})();