/* Salvia & Durazno — comportamiento de la landing (demo).
   Clásico + IIFE: funciona en file:// y en cualquier hosting.
   El número de WhatsApp vive SOLO en config.js. */
(function () {
  "use strict";

  var cfg = window.__BRAND__ || {};
  var root = document.documentElement;
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  var fineHover = matchMedia("(hover: hover) and (pointer: fine)").matches;

  function safe(fn, name) { try { fn(); } catch (e) { console.warn("[" + name + "]", e); } }

  root.classList.add("js");

  /* ---------- WhatsApp: todos los botones desde un solo número ---------- */
  function waUrl(text) {
    var num = String(cfg.whatsapp || "").replace(/\D/g, "");
    return "https://wa.me/" + num + "?text=" + encodeURIComponent(text);
  }
  function fill(tpl, data) {
    return String(tpl || "").replace(/\{(\w+)\}/g, function (_, k) { return data[k] != null ? data[k] : ""; });
  }
  function initWhatsApp() {
    if (!cfg.whatsapp) return;
    $$("[data-wa]").forEach(function (a) { a.href = waUrl(cfg.mensajeGeneral); });
    $$("[data-wa-text]").forEach(function (a) { a.href = waUrl(a.getAttribute("data-wa-text")); });
    $$("[data-wa-product]").forEach(function (a) {
      a.href = waUrl(fill(cfg.mensajeProducto, { nombre: a.getAttribute("data-wa-product"), precio: a.getAttribute("data-price") || "" }));
    });
    $$("a[href^='https://wa.me/']").forEach(function (a) { a.target = "_blank"; a.rel = "noopener"; });
    // muestra el número de config.js en contacto: +52 55 1234 5678
    var n = String(cfg.whatsapp).replace(/\D/g, "");
    var m = n.match(/^52(?:1)?(\d{10})$/), shown = "+" + n;
    if (m) {
      var d = m[1], two = /^(55|33|81)/.test(d); // CDMX, GDL y MTY usan lada de 2 dígitos
      shown = two ? "+52 " + d.slice(0, 2) + " " + d.slice(2, 6) + " " + d.slice(6) : "+52 " + d.slice(0, 3) + " " + d.slice(3, 6) + " " + d.slice(6);
    }
    $$("[data-wa-number]").forEach(function (el) { el.textContent = shown; });
  }


  /* ---------- Formulario de pedido personalizado ----------
     No guarda nada: solo arma el texto y abre WhatsApp. */
  function initOrderForm() {
    var form = $("[data-order-form]"); if (!form) return;
    var preview = $("[data-preview]"), counter = $("[data-count-ded]");
    var fecha = form.elements.fecha;
    var today = new Date(); today.setMinutes(today.getMinutes() - today.getTimezoneOffset());
    fecha.min = today.toISOString().slice(0, 10);

    function niceDate(v) {
      if (!v) return "";
      var p = v.split("-"), d = new Date(+p[0], +p[1] - 1, +p[2]);
      try { return d.toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long" }); } catch (_) { return v; }
    }
    function list(arr) {
      if (arr.length < 2) return arr.join("");
      return arr.slice(0, -1).join(", ") + " y " + arr[arr.length - 1];
    }
    function data() {
      var el = form.elements, checked = $$("input[name='colores']:checked", form).map(function (i) { return i.value; });
      var oc = $("input[name='ocasion']:checked", form);
      return {
        ocasion: oc ? oc.value : "", presupuesto: el.presupuesto.value, arreglo: el.arreglo.value,
        fecha: niceDate(el.fecha.value), horario: el.horario.value, colores: list(checked),
        zona: el.zona.value.trim(), dedicatoria: el.dedicatoria.value.trim()
      };
    }
    function message(d) {
      var lines = [cfg.mensajePersonalizado || "Hola, me gustaría hacer un pedido personalizado:", ""];
      if (d.ocasion) lines.push("• Ocasión: " + d.ocasion);
      if (d.presupuesto) lines.push("• Presupuesto: " + d.presupuesto);
      if (d.arreglo) lines.push("• Arreglo de referencia: " + d.arreglo);
      if (d.fecha) lines.push("• Fecha de entrega: " + d.fecha + (d.horario ? " · " + d.horario : ""));
      else if (d.horario) lines.push("• Horario: " + d.horario);
      if (d.colores) lines.push("• Colores: " + d.colores);
      if (d.zona) lines.push("• Zona de entrega: " + d.zona);
      if (d.dedicatoria) lines.push("• Dedicatoria: \u201C" + d.dedicatoria + "\u201D");
      lines.push("", "¿Me ayudan con opciones y disponibilidad? Gracias.");
      return lines.join("\n");
    }
    function update() {
      if (counter) counter.textContent = form.elements.dedicatoria.value.length;
      if (!preview) return;
      preview.textContent = message(data());
      preview.classList.remove("bump"); void preview.offsetWidth; preview.classList.add("bump");
    }
    function setError(name, on) {
      var box = $("[data-error='" + name + "']", form);
      if (box) box.closest(".field").classList.toggle("has-error", on);
    }
    form.addEventListener("input", function (e) {
      if (e.target.name === "ocasion") setError("ocasion", false);
      if (e.target.name === "fecha") setError("fecha", false);
      update();
    });
    form.addEventListener("change", update);
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var d = data(), bad = null;
      setError("ocasion", !d.ocasion); if (!d.ocasion) bad = bad || $("input[name='ocasion']", form);
      setError("fecha", !d.fecha); if (!d.fecha) bad = bad || fecha;
      if (bad) { bad.focus({ preventScroll: true }); bad.closest(".field").scrollIntoView({ behavior: "smooth", block: "center" }); return; }
      var url = waUrl(message(d));
      // con "noopener" window.open devuelve null siempre, por eso se corta el vínculo a mano
      var w = window.open(url, "_blank");
      if (w) { try { w.opener = null; } catch (_) {} } else { window.location.href = url; }
    });
    update();
  }

  /* ---------- Intro con doble red de seguridad ---------- */
  function initSplash() {
    var done = false;
    function finish() { if (done) return; done = true; root.classList.add("is-ready"); heroOn(); }
    if (sessionStorageGet("sd-seen")) { root.classList.add("no-splash"); finish(); return; }
    sessionStorageSet("sd-seen", "1");
    if (document.readyState === "complete") setTimeout(finish, 900);
    else window.addEventListener("load", function () { setTimeout(finish, 700); });
    setTimeout(finish, 2200); // red de seguridad
  }
  function sessionStorageGet(k) { try { return sessionStorage.getItem(k); } catch (_) { return null; } }
  function sessionStorageSet(k, v) { try { sessionStorage.setItem(k, v); } catch (_) {} }

  function heroOn() {
    var hero = $(".hero");
    if (hero) hero.classList.add("is-on");
    $$(".hero [data-split]").forEach(function (el) { el.classList.add("split-done"); });
    $$(".hero .reveal").forEach(function (el, i) {
      setTimeout(function () { el.classList.add("is-in"); }, 250 + i * 110);
    });
  }

  /* ---------- Titulares palabra por palabra ---------- */
  function initSplit() {
    $$("[data-split]").forEach(function (el) {
      var i = 0;
      (function walk(node) {
        Array.prototype.slice.call(node.childNodes).forEach(function (child) {
          if (child.nodeType === 3) {
            var frag = document.createDocumentFragment();
            child.textContent.split(/(\s+)/).forEach(function (part) {
              if (!part) return;
              if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(" ")); return; }
              var w = document.createElement("span"); w.className = "split-word";
              var s = document.createElement("span"); s.textContent = part; s.style.setProperty("--i", i++);
              w.appendChild(s); frag.appendChild(w);
            });
            node.replaceChild(frag, child);
          } else if (child.nodeType === 1) { walk(child); }
        });
      })(el);
      el.setAttribute("aria-label", el.textContent.replace(/\s+/g, " ").trim());
    });
  }

  /* ---------- Apariciones al hacer scroll ---------- */
  function initReveals() {
    var targets = $$(".reveal, [data-split], .clip-reveal").filter(function (el) { return !el.closest(".hero"); });
    if (!("IntersectionObserver" in window)) { targets.forEach(function (el) { el.classList.add("is-in"); }); return; }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        var el = e.target;
        // escalonado entre hermanos
        var sibs = el.parentElement ? $$(":scope > .reveal", el.parentElement) : [];
        var idx = Math.max(0, sibs.indexOf(el));
        setTimeout(function () { el.classList.add("is-in"); }, Math.min(idx, 6) * 90);
        io.unobserve(el);
      });
    }, { threshold: 0.05, rootMargin: "0px 0px -6% 0px" });
    targets.forEach(function (el) { io.observe(el); });
    // red de seguridad: nada se queda oculto
    setTimeout(function () { targets.forEach(function (el) { el.classList.add("is-in"); }); }, 9000);
  }

  /* ---------- Navegación ---------- */
  function initNav() {
    var nav = $("[data-nav]"), burger = $("[data-burger]"), menu = $("[data-menu]");
    var lastY = window.scrollY, ticking = false, bar = $(".progress span");
    function onScroll() {
      var y = window.scrollY;
      nav.classList.toggle("is-scrolled", y > 40);
      if (!nav.classList.contains("menu-open")) nav.classList.toggle("is-hidden", y > 400 && y > lastY + 4);
      if (y < lastY - 4) nav.classList.remove("is-hidden");
      lastY = y;
      if (bar) {
        var h = document.documentElement.scrollHeight - window.innerHeight;
        bar.style.transform = "scaleX(" + (h > 0 ? Math.min(1, y / h) : 0) + ")";
      }
      ticking = false;
    }
    window.addEventListener("scroll", function () { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
    onScroll();

    function setMenu(open) {
      burger.setAttribute("aria-expanded", String(open));
      burger.setAttribute("aria-label", open ? "Cerrar menú" : "Abrir menú");
      menu.classList.toggle("is-open", open);
      nav.classList.toggle("menu-open", open);
      root.classList.toggle("menu-lock", open);
    }
    burger.addEventListener("click", function () { setMenu(burger.getAttribute("aria-expanded") !== "true"); });
    $$("a", menu).forEach(function (a) { a.addEventListener("click", function () { setMenu(false); }); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") setMenu(false); });
    matchMedia("(min-width: 960px)").addEventListener("change", function () { setMenu(false); });
  }

  /* ---------- Filtro del catálogo ---------- */
  function initFilter() {
    var chips = $$("[data-chips] .chip"), cards = $$("[data-products] .product"), list = $("[data-products]");
    chips.forEach(function (chip) {
      chip.addEventListener("click", function () {
        var f = chip.getAttribute("data-filter");
        chips.forEach(function (c) { var on = c === chip; c.classList.toggle("is-active", on); c.setAttribute("aria-selected", String(on)); });
        var n = 0;
        cards.forEach(function (card) {
          var show = f === "todos" || card.getAttribute("data-cat") === f;
          card.classList.toggle("is-hidden", !show);
          card.classList.remove("is-entering");
          if (show) { void card.offsetWidth; card.style.animationDelay = (n++ * 60) + "ms"; card.classList.add("is-entering"); }
        });
        if (list) list.scrollTo({ left: 0, behavior: "smooth" });
      });
    });
  }

  /* ---------- Inclinación 3D de tarjetas (solo ratón) ---------- */
  function initTilt() {
    if (!fineHover) return;
    $$("[data-tilt]").forEach(function (el) {
      var card = el.closest(".product");
      card.addEventListener("pointermove", function (e) {
        var r = card.getBoundingClientRect();
        var x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5;
        card.style.transform = "perspective(900px) rotateY(" + (x * 6) + "deg) rotateX(" + (-y * 6) + "deg) translateY(-4px)";
      });
      card.addEventListener("pointerleave", function () { card.style.transform = ""; });
    });
  }

  /* ---------- Botones magnéticos (solo ratón) ---------- */
  function initMagnetic() {
    if (!fineHover) return;
    $$(".magnetic").forEach(function (b) {
      b.addEventListener("pointermove", function (e) {
        var r = b.getBoundingClientRect();
        b.style.transform = "translate(" + ((e.clientX - r.left - r.width / 2) * .18) + "px," + ((e.clientY - r.top - r.height / 2) * .28) + "px)";
      });
      b.addEventListener("pointerleave", function () { b.style.transform = ""; });
    });
  }

  /* ---------- Contadores ---------- */
  function initCount() {
    $$("[data-count]").forEach(function (el) {
      var end = +el.getAttribute("data-count");
      var io = new IntersectionObserver(function (en) {
        if (!en[0].isIntersecting) return; io.disconnect();
        var t0 = performance.now();
        (function tick(t) {
          var p = Math.min(1, (t - t0) / 1400), e = 1 - Math.pow(1 - p, 3);
          el.textContent = Math.round(end * e);
          if (p < 1) requestAnimationFrame(tick);
        })(t0);
      }, { threshold: 0.05 });
      io.observe(el);
    });
  }

  /* ---------- Chat de ejemplo que se escribe solo ---------- */
  function initChat() {
    var chat = $("[data-chat]"); if (!chat) return;
    var msgs = $$(".msg", chat);
    var io = new IntersectionObserver(function (en) {
      if (!en[0].isIntersecting) return; io.disconnect();
      msgs.forEach(function (m, i) { setTimeout(function () { m.classList.add("is-in"); }, 300 + i * 750); });
    }, { threshold: 0.05 });
    io.observe(chat);
    setTimeout(function () { msgs.forEach(function (m) { m.classList.add("is-in"); }); }, 15000);
  }

  /* ---------- Testimonios: flechas + avance automático suave ---------- */
  function initReviews() {
    var track = $("[data-reviews]"); if (!track) return;
    function step(dir) {
      var card = $(".review", track); if (!card) return;
      var w = card.getBoundingClientRect().width + 16;
      var max = track.scrollWidth - track.clientWidth - 4;
      if (dir > 0 && track.scrollLeft >= max) track.scrollTo({ left: 0, behavior: "smooth" });
      else track.scrollBy({ left: dir * w, behavior: "smooth" });
    }
    $("[data-rev-prev]").addEventListener("click", function () { step(-1); });
    $("[data-rev-next]").addEventListener("click", function () { step(1); });
    if (reduced) return;
    var paused = false, timer;
    ["pointerenter", "touchstart", "focusin"].forEach(function (ev) { track.addEventListener(ev, function () { paused = true; }, { passive: true }); });
    track.addEventListener("pointerleave", function () { paused = false; });
    var vis = false;
    new IntersectionObserver(function (en) { vis = en[0].isIntersecting; }, { threshold: 0.05 }).observe(track);
    timer = setInterval(function () { if (vis && !paused && !document.hidden) step(1); }, 5200);
  }

  /* ---------- Etiqueta del botón flotante ---------- */
  function initFloat() {
    var f = $(".wa-float"); if (!f) return;
    setTimeout(function () { f.classList.add("show-label"); setTimeout(function () { f.classList.remove("show-label"); }, 5000); }, 7000);
  }

  /* ---------- Pétalos cayendo en el hero (ligero, se pausa fuera de vista) ---------- */
  function initPetals() {
    if (reduced) return;
    var canvas = $(".petals"); if (!canvas || !canvas.getContext) return;
    var ctx = canvas.getContext("2d"), hero = $(".hero");
    var dpr = Math.min(2, window.devicePixelRatio || 1), W = 0, H = 0, petals = [], running = false, raf;
    var colors = ["#f2c6b8", "#e7a98f", "#f6dcd2", "#c3cdb6"];
    function size() { W = hero.clientWidth; H = hero.clientHeight; canvas.width = W * dpr; canvas.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); }
    function make(initial) {
      return { x: Math.random() * W, y: initial ? Math.random() * H : -20, r: 5 + Math.random() * 7, vy: .35 + Math.random() * .6,
        vx: -.2 + Math.random() * .4, a: Math.random() * 6.28, va: -.02 + Math.random() * .04, sw: Math.random() * 6.28,
        c: colors[(Math.random() * colors.length) | 0], o: .45 + Math.random() * .4 };
    }
    function draw() {
      ctx.clearRect(0, 0, W, H);
      petals.forEach(function (p, i) {
        p.sw += .015; p.x += p.vx + Math.sin(p.sw) * .45; p.y += p.vy; p.a += p.va;
        if (p.y > H + 20) petals[i] = make(false);
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.a); ctx.globalAlpha = p.o; ctx.fillStyle = p.c;
        ctx.beginPath(); ctx.moveTo(0, -p.r); ctx.bezierCurveTo(p.r, -p.r * .6, p.r * .7, p.r * .8, 0, p.r);
        ctx.bezierCurveTo(-p.r * .7, p.r * .8, -p.r, -p.r * .6, 0, -p.r); ctx.fill(); ctx.restore();
      });
      if (running) raf = requestAnimationFrame(draw);
    }
    size();
    var count = W < 720 ? 10 : 18;
    for (var i = 0; i < count; i++) petals.push(make(true));
    window.addEventListener("resize", size, { passive: true });
    new IntersectionObserver(function (en) {
      var vis = en[0].isIntersecting;
      if (vis && !running) { running = true; raf = requestAnimationFrame(draw); }
      if (!vis) { running = false; cancelAnimationFrame(raf); }
    }, { threshold: 0 }).observe(hero);
  }

  /* ---------- Parallax suave con GSAP ---------- */
  function initParallax() {
    if (!window.gsap || !window.ScrollTrigger) return;
    gsap.registerPlugin(ScrollTrigger);
    var heroImg = $("[data-parallax]");
    if (heroImg) gsap.fromTo(heroImg, { yPercent: -4 }, { yPercent: 6, ease: "none", scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: true } });
    $$("[data-parallax-soft]").forEach(function (img) {
      gsap.fromTo(img, { yPercent: -6 }, { yPercent: 2, ease: "none", scrollTrigger: { trigger: img.parentElement, start: "top bottom", end: "bottom top", scrub: true } });
    });
    var steps = $(".steps");
    if (steps) gsap.fromTo(steps, { "--line-p": 0 }, { "--line-p": 1, ease: "none", scrollTrigger: { trigger: steps, start: "top 80%", end: "bottom 60%", scrub: true } });
  }

  function boot() {
    safe(initWhatsApp, "whatsapp");
    safe(initSplit, "split");
    safe(initSplash, "splash");
    safe(initNav, "nav");
    safe(initReveals, "reveals");
    safe(initFilter, "filter");
    safe(initOrderForm, "orderForm");
    safe(initTilt, "tilt");
    safe(initMagnetic, "magnetic");
    safe(initCount, "count");
    safe(initChat, "chat");
    safe(initReviews, "reviews");
    safe(initFloat, "float");
    safe(initPetals, "petals");
    safe(initParallax, "parallax");
    safe(function () { $$("[data-year]").forEach(function (el) { el.textContent = new Date().getFullYear(); }); }, "year");
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
