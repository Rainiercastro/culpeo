/* main.js — Culpeo. Entry point. IIFE, no modules, works on file:// and any host. */
(function () {
  "use strict";

  var DATA = window.__CULPEO__ || { i18n: { es: {} }, products: [] };
  var reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  var fineHover = matchMedia("(hover: hover) and (pointer: fine)").matches;

  var $ = function (sel, scope) { return (scope || document).querySelector(sel); };
  var $$ = function (sel, scope) { return Array.prototype.slice.call((scope || document).querySelectorAll(sel)); };
  var escHTML = function (s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  };
  function safe(fn, name) { try { fn(); } catch (e) { console.warn("[" + name + "]", e); } }

  /* ---------------- i18n ---------------- */
  var LANG_KEY = "culpeo_lang";
  function getLang() {
    var l = null;
    try { l = localStorage.getItem(LANG_KEY); } catch (e) {}
    if (l && DATA.i18n[l]) return l;
    return "es";
  }
  function setLang(l) { try { localStorage.setItem(LANG_KEY, l); } catch (e) {} }
  function t(key) {
    var dict = DATA.i18n[getLang()] || DATA.i18n.es || {};
    if (dict[key] != null) return dict[key];
    return (DATA.i18n.es || {})[key] || key;
  }
  function pick(field) {
    if (!field) return "";
    if (typeof field === "string") return field;
    var lang = getLang();
    return field[lang] != null ? field[lang] : field.es;
  }
  function applyI18n(root) {
    $$("[data-i18n]", root).forEach(function (el) {
      var v = t(el.getAttribute("data-i18n"));
      if (v != null) el.textContent = v;
    });
    $$("[data-i18n-placeholder]", root).forEach(function (el) {
      el.setAttribute("placeholder", t(el.getAttribute("data-i18n-placeholder")));
    });
    document.documentElement.lang = getLang();
  }

  function formatCLP(n) {
    try { return "$" + Number(n).toLocaleString("es-CL"); }
    catch (e) { return "$" + n; }
  }

  /* ---------------- data helpers ---------------- */
  function findProduct(id) { return (DATA.products || []).filter(function (p) { return p.id === id; })[0]; }

  /* ---------------- cart ---------------- */
  var CART_KEY = "culpeo_cart";
  function getCart() {
    try { var c = JSON.parse(localStorage.getItem(CART_KEY)); return Array.isArray(c) ? c : []; }
    catch (e) { return []; }
  }
  function saveCart(cart) {
    try { localStorage.setItem(CART_KEY, JSON.stringify(cart)); } catch (e) {}
    updateCartBadge();
  }
  function addToCart(id, qty) {
    var cart = getCart();
    var found = null;
    for (var i = 0; i < cart.length; i++) { if (cart[i].id === id) { found = cart[i]; break; } }
    if (found) found.qty += qty; else cart.push({ id: id, qty: qty });
    saveCart(cart);
  }
  function removeFromCart(id) { saveCart(getCart().filter(function (i) { return i.id !== id; })); }
  function setQty(id, qty) {
    var cart = getCart();
    for (var i = 0; i < cart.length; i++) {
      if (cart[i].id === id) { cart[i].qty = Math.max(1, Math.min(20, qty)); break; }
    }
    saveCart(cart);
  }
  function cartCount() { return getCart().reduce(function (s, i) { return s + i.qty; }, 0); }
  function cartTotal() {
    return getCart().reduce(function (s, i) {
      var p = findProduct(i.id);
      return s + (p ? p.priceCLP * i.qty : 0);
    }, 0);
  }
  function updateCartBadge() {
    var c = cartCount();
    $$(".cart-badge").forEach(function (b) {
      b.textContent = String(c);
      b.classList.toggle("is-visible", c > 0);
    });
  }

  /* ---------------- toast ---------------- */
  var toastTimer = null;
  function showToast(msg) {
    var toast = $("[data-toast]");
    if (!toast) return;
    toast.textContent = msg;
    toast.classList.add("is-visible");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toast.classList.remove("is-visible"); }, 2600);
  }

  /* ---------------- nav ---------------- */
  function initNav() {
    var nav = $(".nav");
    if (nav) {
      var onScroll = function () {
        if (window.scrollY > 60) nav.classList.add("is-scrolled");
        else nav.classList.remove("is-scrolled");
      };
      onScroll();
      window.addEventListener("scroll", onScroll, { passive: true });
    }
    var burger = $("[data-hamburger]");
    var mobile = $("[data-nav-mobile]");
    if (burger && mobile) {
      burger.addEventListener("click", function () {
        var open = mobile.getAttribute("data-open") === "true";
        mobile.setAttribute("data-open", open ? "false" : "true");
        burger.classList.toggle("is-open", !open);
        document.body.style.overflow = open ? "" : "hidden";
      });
      $$("a", mobile).forEach(function (a) {
        a.addEventListener("click", function () {
          mobile.setAttribute("data-open", "false");
          burger.classList.remove("is-open");
          document.body.style.overflow = "";
        });
      });
    }
  }

  function initLangSwitch() {
    $$("[data-lang-select]").forEach(function (sel) {
      sel.value = getLang();
      sel.addEventListener("change", function () {
        setLang(sel.value);
        location.reload();
      });
    });
  }

  /* ---------------- mounts ---------------- */
  function stockBadgeHTML(p) {
    if (p.stockStatus === "low") return '<span class="badge-stock product-card-stock is-low">' + t("product.stock.low") + "</span>";
    if (p.stockStatus === "sold-out") return '<span class="badge-stock product-card-stock is-soldout">' + t("product.stock.soldOut") + "</span>";
    return "";
  }

  function productCardHTML(p) {
    return (
      '<article class="product-card" data-tilt>' +
        '<a class="product-card-link" href="producto.html?id=' + encodeURIComponent(p.id) + '">' +
          '<div class="product-card-frame" style="background:linear-gradient(150deg,' + p.colorHex.a + ' 0%,' + p.colorHex.a + ' 45%,' + p.colorHex.b + ' 100%)">' +
            stockBadgeHTML(p) +
            '<img class="product-card-icon" src="assets/img/cap-icon.svg" alt="" aria-hidden="true" loading="lazy" />' +
          "</div>" +
          '<div class="product-card-body">' +
            '<h3 class="product-card-name">' + escHTML(p.name) + "</h3>" +
            '<p class="product-card-color">' + escHTML(pick(p.colorLabel)) + "</p>" +
            '<p class="product-card-price">' + t("product.from") + " " + formatCLP(p.priceCLP) + "</p>" +
          "</div>" +
        "</a>" +
      "</article>"
    );
  }

  function mountProducts() {
    $$("[data-products]").forEach(function (target) {
      if (target.children.length > 0 || !DATA.products) return;
      var limit = parseInt(target.getAttribute("data-limit") || "0", 10);
      var list = limit ? DATA.products.slice(0, limit) : DATA.products;
      target.innerHTML = list.map(productCardHTML).join("");
    });
    initCardInteractions();
  }

  function getQueryParam(name) {
    var m = new RegExp("[?&]" + name + "=([^&]*)").exec(location.search);
    return m ? decodeURIComponent(m[1].replace(/\+/g, " ")) : null;
  }

  function mountProductDetail() {
    var root = $("[data-product-detail]");
    if (!root) return;
    var id = getQueryParam("id");
    var p = id ? findProduct(id) : null;
    if (!p) { location.href = "productos.html"; return; }

    var gallery = $("[data-product-gallery]", root);
    if (gallery) {
      gallery.style.background = "linear-gradient(150deg," + p.colorHex.a + " 0%," + p.colorHex.a + " 45%," + p.colorHex.b + " 100%)";
      gallery.innerHTML = '<img class="product-gallery-icon" src="assets/img/cap-icon.svg" alt="" aria-hidden="true" />';
    }
    var titleEl = $("[data-product-name]", root); if (titleEl) titleEl.textContent = p.name;
    var priceEl = $("[data-product-price]", root); if (priceEl) priceEl.textContent = formatCLP(p.priceCLP);
    var descEl = $("[data-product-desc]", root); if (descEl) descEl.textContent = pick(p.description);
    var colorEl = $("[data-product-color]", root); if (colorEl) colorEl.textContent = pick(p.colorLabel);
    var materialEl = $("[data-product-material]", root); if (materialEl) materialEl.textContent = t("product.materialText");
    document.title = p.name + " · Culpeo";

    var stockEl = $("[data-product-stock]", root);
    if (stockEl) {
      if (p.stockStatus === "low") { stockEl.textContent = t("product.stock.low"); stockEl.className = "badge-stock is-low"; stockEl.hidden = false; }
      else if (p.stockStatus === "sold-out") { stockEl.textContent = t("product.stock.soldOut"); stockEl.className = "badge-stock is-soldout"; stockEl.hidden = false; }
      else { stockEl.hidden = true; }
    }

    var soldOut = p.stockStatus === "sold-out";
    var qty = 1;
    var qtyLabel = $("[data-qty-value]", root);
    $$("[data-qty-minus]", root).forEach(function (b) { b.disabled = soldOut; b.addEventListener("click", function () { qty = Math.max(1, qty - 1); if (qtyLabel) qtyLabel.textContent = qty; }); });
    $$("[data-qty-plus]", root).forEach(function (b) { b.disabled = soldOut; b.addEventListener("click", function () { qty = Math.min(10, qty + 1); if (qtyLabel) qtyLabel.textContent = qty; }); });

    $$("[data-add-to-cart]", root).forEach(function (btn) {
      if (soldOut) {
        btn.textContent = t("product.stock.soldOut");
        btn.disabled = true;
        return;
      }
      btn.addEventListener("click", function () {
        addToCart(p.id, qty);
        showToast(t("productDetail.added") + " — " + p.name);
      });
    });
  }

  function mountCart() {
    var root = $("[data-cart-page]");
    if (!root) return;
    var cart = getCart();
    var itemsWrap = $("[data-cart-items]", root);
    var emptyWrap = $("[data-cart-empty]", root);
    var summaryWrap = $("[data-cart-summary]", root);
    if (!cart.length) {
      if (itemsWrap) itemsWrap.hidden = true;
      if (summaryWrap) summaryWrap.hidden = true;
      if (emptyWrap) emptyWrap.hidden = false;
      return;
    }
    if (emptyWrap) emptyWrap.hidden = true;
    if (itemsWrap) itemsWrap.hidden = false;
    if (summaryWrap) summaryWrap.hidden = false;

    function render() {
      cart = getCart();
      if (!cart.length) { mountCart2(); return; }
      itemsWrap.innerHTML = cart.map(function (item) {
        var p = findProduct(item.id);
        if (!p) return "";
        return (
          '<div class="cart-item" data-id="' + p.id + '">' +
            '<div style="background:linear-gradient(150deg,' + p.colorHex.a + ',' + p.colorHex.b + ');border-radius:10px;width:90px;height:90px;position:relative;overflow:hidden">' +
              '<img src="assets/img/cap-icon.svg" alt="" style="position:absolute;inset:0;margin:auto;width:55%;height:55%;object-fit:contain;opacity:.9" />' +
            "</div>" +
            '<div>' +
              '<p class="cart-item-name">' + escHTML(p.name) + "</p>" +
              '<p class="cart-item-meta">' + t("cart.item.color") + ": " + escHTML(pick(p.colorLabel)) + "</p>" +
              '<p class="cart-item-meta">' + t("cart.item.qty") + ": " +
                '<button class="btn-icon" style="width:26px;height:26px;font-size:.8rem" data-cart-minus="' + p.id + '">-</button> ' +
                '<span style="font-family:var(--mono);padding:0 .4rem">' + item.qty + '</span> ' +
                '<button class="btn-icon" style="width:26px;height:26px;font-size:.8rem" data-cart-plus="' + p.id + '">+</button>' +
              "</p>" +
            "</div>" +
            '<div class="cart-item-actions">' +
              '<span class="cart-item-price">' + formatCLP(p.priceCLP * item.qty) + "</span>" +
              '<button class="cart-item-remove" data-cart-remove="' + p.id + '">' + t("cart.item.remove") + "</button>" +
            "</div>" +
          "</div>"
        );
      }).join("");

      var subtotal = cartTotal();
      if (summaryWrap) {
        summaryWrap.innerHTML =
          '<div class="cart-summary-row"><span>' + t("cart.subtotal") + '</span><span>' + formatCLP(subtotal) + "</span></div>" +
          '<div class="cart-summary-row is-total"><span>' + t("cart.total") + '</span><span>' + formatCLP(subtotal) + "</span></div>" +
          '<button class="btn btn-primary btn-block" data-checkout-whatsapp style="margin-top:1.2rem">' + t("cart.checkout") + "</button>" +
          '<p class="cart-summary-note">' + t("cart.checkoutNote") + ' <a href="faq.html" class="link-underline" style="color:var(--cream-3)">' + t("footer.faq") + "</a></p>";
        var checkoutBtn = $("[data-checkout-whatsapp]", summaryWrap);
        if (checkoutBtn) checkoutBtn.addEventListener("click", openWhatsAppCheckout);
      }

      $$("[data-cart-remove]", itemsWrap).forEach(function (b) {
        b.addEventListener("click", function () { removeFromCart(b.getAttribute("data-cart-remove")); render(); });
      });
      $$("[data-cart-minus]", itemsWrap).forEach(function (b) {
        b.addEventListener("click", function () {
          var id = b.getAttribute("data-cart-minus");
          var it = getCart().filter(function (i) { return i.id === id; })[0];
          if (it) setQty(id, it.qty - 1);
          render();
        });
      });
      $$("[data-cart-plus]", itemsWrap).forEach(function (b) {
        b.addEventListener("click", function () {
          var id = b.getAttribute("data-cart-plus");
          var it = getCart().filter(function (i) { return i.id === id; })[0];
          if (it) setQty(id, it.qty + 1);
          render();
        });
      });
    }

    function mountCart2() {
      if (itemsWrap) itemsWrap.hidden = true;
      if (summaryWrap) summaryWrap.hidden = true;
      if (emptyWrap) emptyWrap.hidden = false;
    }

    render();
  }

  function openWhatsAppCheckout() {
    var cart = getCart();
    if (!cart.length) return;
    var lines = ["Hola! Quiero hacer este pedido en Culpeo:", ""];
    cart.forEach(function (item) {
      var p = findProduct(item.id);
      if (!p) return;
      lines.push("- " + p.name + " (" + pick(p.colorLabel) + ") x" + item.qty + " — " + formatCLP(p.priceCLP * item.qty));
    });
    lines.push("");
    lines.push("Total: " + formatCLP(cartTotal()));
    lines.push("");
    lines.push("(Pedido generado desde " + (DATA.meta ? DATA.meta.domain : "culpeo.cl") + ")");
    var text = encodeURIComponent(lines.join("\n"));
    var num = DATA.meta && DATA.meta.whatsappNumber ? DATA.meta.whatsappNumber : "";
    window.open("https://wa.me/" + num + "?text=" + text, "_blank", "noopener");
  }

  function mountCredits() {
    var root = $("[data-credits-list]");
    if (!root) return;
    fetch("assets/credits.json").then(function (r) { return r.json(); }).then(function (credits) {
      var entries = Object.keys(credits).map(function (k) { return credits[k]; });
      if (!entries.length) { root.innerHTML = "<li>—</li>"; return; }
      root.innerHTML = entries.map(function (c) {
        var title = String(c.title || "").replace(/\.(jpe?g|png|webp)$/i, "");
        return (
          "<li><strong>" + escHTML(title) + "</strong> — " + escHTML(c.creator || "Wikimedia Commons") +
          " · " + escHTML(c.license || "") +
          (c.foreign_landing_url ? ' · <a href="' + c.foreign_landing_url + '" target="_blank" rel="noopener">↗</a>' : "") +
          "</li>"
        );
      }).join("");
    }).catch(function () { root.innerHTML = "<li>—</li>"; });
  }

  function mountFAQ() {
    var root = $("[data-faq-list]");
    if (!root || root.children.length > 0 || !DATA.faqs) return;
    root.innerHTML = DATA.faqs.map(function (f) {
      return (
        "<details class=\"faq-item\">" +
          "<summary>" + escHTML(pick(f.question)) + "</summary>" +
          "<p>" + escHTML(pick(f.answer)) + "</p>" +
        "</details>"
      );
    }).join("");
  }

  /* ---------------- header/footer WhatsApp link ---------------- */
  function initWhatsAppLinks() {
    var num = DATA.meta && DATA.meta.whatsappNumber ? DATA.meta.whatsappNumber : "";
    $$("[data-whatsapp-link]").forEach(function (a) {
      a.href = "https://wa.me/" + num;
      a.target = "_blank"; a.rel = "noopener";
    });
    $$("[data-instagram-link]").forEach(function (a) {
      var url = DATA.meta && DATA.meta.instagram;
      var li = a.closest("li");
      var hideTarget = li || a;
      if (!url) { hideTarget.hidden = true; return; }
      hideTarget.hidden = false;
      a.href = url;
      a.target = "_blank"; a.rel = "noopener";
    });
  }

  /* ---------------- reveal on scroll ---------------- */
  function initReveals() {
    var els = $$("[data-reveal]");
    if (!els.length) return;
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add("is-revealed"); io.unobserve(e.target); }
      });
    }, { threshold: 0.01, rootMargin: "0px 0px -2% 0px" });
    els.forEach(function (el) { io.observe(el); });
    setTimeout(function () {
      $$("[data-reveal]:not(.is-revealed)").forEach(function (el) {
        if (el.getBoundingClientRect().top < window.innerHeight) el.classList.add("is-revealed");
      });
    }, 6000);
  }

  /* ---------------- tilt + halo (cards) ---------------- */
  function initCardInteractions() {
    if (!fineHover) return;
    $$(".product-card[data-tilt]").forEach(function (card) {
      if (card.dataset.tiltBound) return;
      card.dataset.tiltBound = "1";
      var frame = card.querySelector(".product-card-frame") || card;
      var MAX = 6;
      var tx = 0, ty = 0, cx = 0, cy = 0, raf = null;
      card.addEventListener("mousemove", function (e) {
        var r = card.getBoundingClientRect();
        var px = (e.clientX - r.left) / r.width - 0.5;
        var py = (e.clientY - r.top) / r.height - 0.5;
        tx = -py * MAX; ty = px * MAX;
        frame.style.setProperty("--mx", ((e.clientX - r.left) / r.width * 100) + "%");
        frame.style.setProperty("--my", ((e.clientY - r.top) / r.height * 100) + "%");
        if (!raf) raf = requestAnimationFrame(loop);
      });
      card.addEventListener("mouseleave", function () { tx = 0; ty = 0; if (!raf) raf = requestAnimationFrame(loop); });
      function loop() {
        cx += (tx - cx) * 0.15; cy += (ty - cy) * 0.15;
        card.style.setProperty("--rx", cx.toFixed(2) + "deg");
        card.style.setProperty("--ry", cy.toFixed(2) + "deg");
        raf = (Math.abs(tx - cx) > 0.05 || Math.abs(ty - cy) > 0.05) ? requestAnimationFrame(loop) : null;
      }
    });
  }

  /* ---------------- cursor ---------------- */
  function initCursor() {
    var root = $("[data-cursor-root]");
    if (!root || !fineHover) return;
    document.documentElement.classList.add("has-cursor");
    var ring = root.querySelector(".cursor-ring");
    var dot = root.querySelector(".cursor-dot");
    var tx = 0, ty = 0, rx = 0, ry = 0, firstMove = false;
    window.addEventListener("mousemove", function (e) {
      tx = e.clientX; ty = e.clientY;
      if (dot) dot.style.transform = "translate3d(" + tx + "px," + ty + "px,0)";
      if (!firstMove) {
        firstMove = true; rx = tx; ry = ty;
        if (ring) ring.style.transform = "translate3d(" + rx + "px," + ry + "px,0)";
        root.classList.add("is-ready");
      }
    }, { passive: true });
    function tick() {
      rx += (tx - rx) * 0.18; ry += (ty - ry) * 0.18;
      if (ring) ring.style.transform = "translate3d(" + rx + "px," + ry + "px,0)";
      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
    var HOVERABLES = "a, button, .product-card, input, select";
    document.addEventListener("mouseover", function (e) { if (e.target.closest(HOVERABLES)) root.classList.add("is-interactive"); });
    document.addEventListener("mouseout", function (e) {
      var related = e.relatedTarget;
      if (e.target.closest(HOVERABLES) && !(related && related.closest && related.closest(HOVERABLES))) root.classList.remove("is-interactive");
    });
  }

  /* ---------------- boot ---------------- */
  function boot() {
    safe(function () { applyI18n(document); }, "applyI18n");
    safe(initNav, "initNav");
    safe(initLangSwitch, "initLangSwitch");
    safe(initWhatsAppLinks, "initWhatsAppLinks");
    safe(updateCartBadge, "updateCartBadge");
    safe(mountProducts, "mountProducts");
    safe(mountProductDetail, "mountProductDetail");
    safe(mountCart, "mountCart");
    safe(mountCredits, "mountCredits");
    safe(mountFAQ, "mountFAQ");
    safe(initReveals, "initReveals");
    safe(initCursor, "initCursor");
    document.documentElement.classList.add("is-ready");
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
