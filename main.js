/* Siete Azules · Hotel de Laguna — comportamiento del sitio
   Patrón: IIFE, cada init aislado en safe(). El contenido está en el HTML;
   este archivo solo lo enriquece. */
(function () {
  "use strict";

  var doc = document.documentElement;
  doc.classList.add("js");

  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var esc = function (s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  };
  var fmt = function (n) { return "$" + Math.round(n).toLocaleString("es-MX"); };
  function safe(fn, name) { try { fn(); } catch (e) { if (window.console) console.warn("[" + name + "]", e); } }

  var API = { chat: "api/asistente.php", recommend: "api/recomendador.php", lead: "api/lead.php" };
  var hotel = null;
  var hotelReady = fetch("data/hotel.json", { cache: "no-cache" })
    .then(function (r) { if (!r.ok) throw new Error("hotel.json " + r.status); return r.json(); })
    .then(function (d) { hotel = d; return d; })
    .catch(function () { return null; });

  /* ---------- Fechas ---------- */
  function iso(d) {
    var z = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
    return z.toISOString().slice(0, 10);
  }
  function addDays(d, n) { var x = new Date(d); x.setDate(x.getDate() + n); return x; }
  function parseISO(s) { var p = String(s || "").split("-"); return p.length === 3 ? new Date(+p[0], +p[1] - 1, +p[2]) : null; }
  function nightsBetween(a, b) { return Math.round((parseISO(b) - parseISO(a)) / 86400000); }
  function niceDate(s) {
    var d = parseISO(s); if (!d) return s;
    return d.toLocaleDateString("es-MX", { day: "numeric", month: "short" });
  }

  function initDates() {
    var today = iso(new Date());
    var dIn = iso(addDays(new Date(), 21)), dOut = iso(addDays(new Date(), 24));
    [["#bb-in", "#bb-out"], ["#f-in", "#f-out"], ["#c-in", "#c-out"]].forEach(function (pair, i) {
      var a = $(pair[0]), b = $(pair[1]);
      if (!a || !b) return;
      a.min = today; b.min = iso(addDays(new Date(), 1));
      if (i < 2) { a.value = dIn; b.value = dOut; }
      a.addEventListener("change", function () {
        if (!a.value) return;
        var next = iso(addDays(parseISO(a.value), 1));
        b.min = next;
        if (!b.value || b.value <= a.value) b.value = iso(addDays(parseISO(a.value), 3));
      });
    });
  }

  /* ---------- Navegación ---------- */
  function initNav() {
    var nav = $("[data-nav]"), ribbon = $(".demo-ribbon"), toggle = $("[data-nav-toggle]"), menu = $("#menu-movil");
    if (!nav) return;
    var lastY = window.scrollY, ticking = false;
    function ribbonH() { return ribbon ? ribbon.offsetHeight : 0; }
    function update() {
      var y = window.scrollY, rh = ribbonH();
      doc.style.setProperty("--ribbon-h", Math.max(0, rh - y) + "px");
      nav.classList.toggle("is-solid", y > 40);
      var open = toggle && toggle.getAttribute("aria-expanded") === "true";
      nav.classList.toggle("is-hidden", !open && y > 600 && y > lastY + 4);
      if (y < lastY - 4 || y < 600) nav.classList.remove("is-hidden");
      lastY = y; ticking = false;
    }
    window.addEventListener("scroll", function () { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
    window.addEventListener("resize", update);
    update();

    function setMenu(open) {
      toggle.setAttribute("aria-expanded", String(open));
      toggle.setAttribute("aria-label", open ? "Cerrar menú" : "Abrir menú");
      menu.hidden = !open;
      nav.classList.toggle("menu-open", open);
    }
    if (toggle && menu) {
      toggle.addEventListener("click", function () { setMenu(toggle.getAttribute("aria-expanded") !== "true"); });
      $$("a", menu).forEach(function (a) { a.addEventListener("click", function () { setMenu(false); }); });
      document.addEventListener("keydown", function (e) { if (e.key === "Escape" && !menu.hidden) { setMenu(false); toggle.focus(); } });
    }

    // Enlace activo según la sección visible
    var links = $$(".nav-links a");
    if ("IntersectionObserver" in window && links.length) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (!en.isIntersecting) return;
          links.forEach(function (l) { l.classList.toggle("is-active", l.getAttribute("href") === "#" + en.target.id); });
        });
      }, { rootMargin: "-45% 0px -50% 0px" });
      links.forEach(function (l) { var s = $(l.getAttribute("href")); if (s) io.observe(s); });
    }
  }

  /* ---------- Apariciones al desplazarse ---------- */
  function initReveals() {
    var els = $$(".reveal, .reveal-img");
    // Escalonado sutil dentro de cada grupo
    $$(".room-grid, .story-points, .stats, .amenities, .tst-track, .steps, .loc-list, .faq-list, .contact-list, .hero-content").forEach(function (g) {
      $$(".reveal", g).forEach(function (el, i) { el.style.setProperty("--d", Math.min(i * 0.08, 0.5) + "s"); });
    });
    if (!("IntersectionObserver" in window)) { els.forEach(function (e) { e.classList.add("is-in"); }); return; }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add("is-in"); io.unobserve(en.target); } });
    }, { threshold: 0.05, rootMargin: "0px 0px -6% 0px" });
    els.forEach(function (e) { io.observe(e); });
    // Red de seguridad: nunca dejar contenido oculto
    setTimeout(function () { els.forEach(function (e) { if (e.getBoundingClientRect().top < innerHeight) e.classList.add("is-in"); }); }, 1800);
    window.addEventListener("beforeprint", function () { els.forEach(function (e) { e.classList.add("is-in"); }); });
  }

  /* ---------- Parallax del hero ---------- */
  function initParallax() {
    if (reduced) return;
    var media = $("[data-parallax]");
    if (!media) return;
    var ticking = false;
    window.addEventListener("scroll", function () {
      if (ticking) return; ticking = true;
      requestAnimationFrame(function () {
        var y = window.scrollY;
        if (y < innerHeight * 1.2) media.style.transform = "translate3d(0," + (y * 0.25).toFixed(1) + "px,0)";
        ticking = false;
      });
    }, { passive: true });
  }

  /* ---------- Contadores ---------- */
  function initCounters() {
    if (reduced || !("IntersectionObserver" in window)) return;
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        io.unobserve(en.target);
        var el = en.target, end = +el.getAttribute("data-count"), t0 = performance.now(), dur = 1600;
        (function tick(t) {
          var p = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - p, 4);
          el.textContent = Math.round(end * e);
          if (p < 1) requestAnimationFrame(tick);
        })(t0);
      });
    }, { threshold: 0.4 });
    $$("[data-count]").forEach(function (el) { io.observe(el); });
  }

  /* ---------- Buscador de la portada → buscador inteligente ---------- */
  var preferredRoom = "";
  function initBookingBar() {
    var form = $("[data-booking-bar]");
    if (!form) return;
    var err = $("[data-bb-error]", form);
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var a = form.entrada.value, b = form.salida.value;
      if (!a || !b) { err.textContent = "Elige tus fechas de llegada y salida."; return; }
      if (b <= a) { err.textContent = "La salida debe ser posterior a la llegada."; return; }
      err.textContent = "";
      var g = form.huespedes.value.split("-");
      var f = $("[data-finder]");
      f.entrada.value = a; f.salida.value = b;
      f.adultos.value = g[0]; f.ninos.value = g[1];
      preferredRoom = form.habitacion.value;
      if (+g[1] > 0) { var fam = $('input[name="viaje"][value="familiar"]', f); if (fam) fam.checked = true; }
      $("#buscador").scrollIntoView({ behavior: reduced ? "auto" : "smooth" });
      runFinder();
    });
    $$("[data-room-cta]").forEach(function (a) {
      a.addEventListener("click", function () { preferredRoom = a.getAttribute("data-room-cta"); });
    });
  }

  /* ---------- Buscador inteligente de estancias ---------- */
  // Disponibilidad SIMULADA (demostración): determinista según habitación y fechas.
  function hash(s) { var h = 2166136261; for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return Math.abs(h); }
  function demoAvailability(roomId, entrada, salida) {
    var stock = { jardin: 8, deluxe: 8, palafito: 3, familiar: 5 }[roomId] || 4;
    var left = hash(roomId + entrada + salida) % (stock + 1);
    if (roomId === "palafito" && left > 2) left = 2;
    return left;
  }
  function seasonFactor(entrada) {
    var d = parseISO(entrada); if (!d) return 1;
    var m = d.getMonth() + 1, day = d.getDate();
    var high = (m === 12 && day >= 15) || (m === 1 && day <= 6) || (m === 7 && day >= 15) || (m === 8 && day <= 20);
    return high ? 1.2 : 1;
  }

  function readCriteria(f) {
    var prefs = $$('input[name="pref"]:checked', f).map(function (i) { return i.value; });
    var viaje = ($('input[name="viaje"]:checked', f) || {}).value || "descanso";
    return {
      entrada: f.entrada.value, salida: f.salida.value,
      adultos: Math.max(1, Math.min(4, parseInt(f.adultos.value, 10) || 1)),
      ninos: Math.max(0, Math.min(3, parseInt(f.ninos.value, 10) || 0)),
      presupuesto: parseInt(f.presupuesto.value, 10) || 6000,
      viaje: viaje, preferencias: prefs, habitacionPreferida: preferredRoom
    };
  }

  var tripLabel = { romantico: "romántico", familiar: "familiar", negocios: "de negocios", aventura: "de aventura", descanso: "de descanso" };
  var prefLabel = { vista: "vista a la laguna", king: "cama king size", balcon: "balcón o terraza", desayuno: "desayuno incluido", accesible: "accesibilidad" };

  function scoreRooms(c, rooms) {
    var nights = nightsBetween(c.entrada, c.salida), factor = seasonFactor(c.entrada);
    return rooms.map(function (r) {
      var reasons = [], warn = [];
      var fits = c.adultos <= r.maxAdultos && c.ninos <= r.maxNinos && (c.adultos + c.ninos) <= r.maxHuespedes;
      var price = Math.round(r.precio * factor);
      var s = 50;
      if (!fits) s -= 100;
      if (price <= c.presupuesto) { s += 25; reasons.push("entra en tu presupuesto"); }
      else { var over = (price - c.presupuesto) / c.presupuesto; s -= Math.round(over * 80); warn.push("supera tu presupuesto por " + fmt(price - c.presupuesto) + " por noche"); }
      if (r.idealPara.indexOf(c.viaje) !== -1) { s += 22; reasons.push("encaja con un viaje " + tripLabel[c.viaje]); }
      c.preferencias.forEach(function (p) {
        var ok = (p === "vista" && r.vista === "laguna") || (p === "king" && /king/i.test(r.cama)) || (p === "balcon" && r.balcon) || (p === "desayuno" && r.desayunoIncluido) || (p === "accesible" && r.accesible);
        if (ok) { s += 10; reasons.push(prefLabel[p]); }
        else if (p === "accesible") { s -= 45; warn.push("no está en planta baja accesible"); }
        else { s -= 4; }
      });
      if (c.habitacionPreferida === r.id) { s += 14; reasons.push("es la habitación que elegiste"); }
      var avail = demoAvailability(r.id, c.entrada, c.salida);
      if (avail === 0) s -= 60;
      return { room: r, score: s, fits: fits, price: price, total: price * nights, nights: nights, avail: avail, reasons: reasons, warn: warn, high: factor > 1 };
    }).sort(function (a, b) { return b.score - a.score; });
  }

  function localWhy(o, c) {
    var parts = [];
    if (o.reasons.length) parts.push("Te la sugerimos porque " + o.reasons.slice(0, 3).join(", ") + ".");
    if (o.warn.length) parts.push("Ten en cuenta que " + o.warn.join(" y ") + ".");
    if (!parts.length) parts.push(o.room.resumen);
    return parts.join(" ");
  }

  function localSummary(c, best) {
    var g = c.adultos + " adulto" + (c.adultos > 1 ? "s" : "") + (c.ninos ? " y " + c.ninos + " niño" + (c.ninos > 1 ? "s" : "") : "");
    return "Para un viaje " + tripLabel[c.viaje] + " de " + g + ", la opción que mejor encaja es " + best.room.nombre + ". " + best.room.resumen;
  }

  function relevantServices(c) {
    var map = {
      romantico: ["Cena privada en el muelle", "Spa Sak Ha para dos", "Kayak al amanecer"],
      familiar: ["Alberca infinita", "Kit infantil y cuna", "Excursión a Cenote Azul"],
      negocios: ["Wifi de alta velocidad", "Salón privado para reuniones", "Traslado desde el aeropuerto"],
      aventura: ["Kayak y paddle board", "Excursión a Los Rápidos", "Visita a Chacchoben"],
      descanso: ["Spa con rituales mayas", "Yoga al amanecer", "Alberca infinita"]
    };
    return map[c.viaje] || map.descanso;
  }

  function availHTML(o) {
    if (o.avail === 0) return '<span class="fr-avail none">Sin disponibilidad simulada en esas fechas</span>';
    if (o.avail <= 2) return '<span class="fr-avail low">Quedan ' + o.avail + " (simulado)</span>";
    return '<span class="fr-avail">Disponible (simulado)</span>';
  }

  function renderResults(c, list, ai) {
    var box = $("[data-finder-results]");
    var best = list[0];
    var why = (ai && ai.porQue) || {};
    var summary = (ai && ai.resumen) || localSummary(c, best);
    var services = relevantServices(c);
    var g = c.adultos + " adulto" + (c.adultos > 1 ? "s" : "") + (c.ninos ? " · " + c.ninos + " niño" + (c.ninos > 1 ? "s" : "") : "");
    var html = '<div class="fr-summary">' +
      "<div>" +
      '<p class="fr-ai"><svg class="ico"><use href="#i-spark"/></svg>' + (ai ? "Resumen personalizado con IA" : "Resumen personalizado") + "</p>" +
      "<h3>Tu estancia ideal: " + esc(best.room.nombre) + "</h3>" +
      "<p>" + esc(summary) + "</p>" +
      '<div class="fr-meta"><span>' + niceDate(c.entrada) + " → " + niceDate(c.salida) + " · " + best.nights + " noche" + (best.nights > 1 ? "s" : "") + "</span><span>" + g + "</span><span>Hasta " + fmt(c.presupuesto) + "/noche</span>" + (best.high ? "<span>Temporada alta (+20%)</span>" : "") + "</div>" +
      "</div>" +
      "<div>" +
      "<p class=\"fr-ai\">Servicios para tu viaje</p><p>" + services.map(esc).join(" · ") + "</p>" +
      '<p class="fr-ai" style="margin-top:1rem">Siguientes pasos</p>' +
      '<ol class="fr-steps"><li>Revisa las opciones y el precio orientativo.</li><li>Envía tu solicitud con el formulario de abajo.</li><li>El hotel te confirma disponibilidad real y tarifa final.</li></ol>' +
      "</div></div>";

    if (list.length < 3) html += '<p class="fr-note">' + (list.length === 1 ? "Solo una de nuestras habitaciones admite a tu grupo con esa combinación de adultos y niños." : "Estas son las habitaciones que admiten a tu grupo.") + "</p>";
    html += '<div class="fr-grid">' + list.map(function (o, i) {
      var r = o.room;
      return '<article class="fr-card">' +
        '<div class="room-media"><img src="' + esc(r.imagen) + '" alt="' + esc(r.nombre) + '" loading="lazy" width="1024" height="768"><span class="fr-rank' + (i === 0 ? " best" : "") + '">' + (i === 0 ? "Mejor opción" : "Opción " + (i + 1)) + "</span></div>" +
        '<div class="fr-body">' +
        "<h4>" + esc(r.nombre) + "</h4>" +
        availHTML(o) +
        '<ul class="room-specs"><li>' + esc(r.caracteristicas.join(" · ")) + "</li></ul>" +
        '<p class="fr-why"><b>Por qué te la recomendamos</b>' + esc(why[r.id] || localWhy(o, c)) + "</p>" +
        '<p class="fr-total"><strong>' + fmt(o.price) + "</strong> MXN/noche · total aprox. " + fmt(o.total) + " por " + o.nights + " noche" + (o.nights > 1 ? "s" : "") + " <span class=\"badge-demo\">Ejemplo</span></p>" +
        '<button type="button" class="btn btn-ink btn-sm" data-pick="' + esc(r.id) + '"' + (o.avail === 0 ? " disabled" : "") + ">Solicitar esta habitación</button>" +
        "</div></article>";
    }).join("") + "</div>";

    html += '<div class="fr-lead" id="solicitud">' +
      "<div><h3>Solicita tu estancia</h3><p class=\"muted\">Sin cobro ni reserva automática: el equipo del hotel revisará tu solicitud y te responderá. <span class=\"badge-demo\">Demostración</span></p></div>" +
      '<form data-lead-form="buscador" novalidate>' +
      '<div class="field"><label for="fr-room">Habitación</label><select id="fr-room" name="habitacion">' + list.map(function (o) { return '<option value="' + esc(o.room.id) + '">' + esc(o.room.nombre) + "</option>"; }).join("") + "</select></div>" +
      '<div class="ff-row"><div class="field"><label for="fr-name">Nombre *</label><input id="fr-name" name="nombre" type="text" autocomplete="name" required maxlength="80"></div>' +
      '<div class="field"><label for="fr-email">Correo electrónico *</label><input id="fr-email" name="email" type="email" autocomplete="email" required maxlength="120"></div></div>' +
      '<div class="field"><label for="fr-phone">Teléfono (opcional)</label><input id="fr-phone" name="telefono" type="tel" autocomplete="tel" maxlength="25"></div>' +
      '<div class="hp" aria-hidden="true"><input name="sitio_web" type="text" tabindex="-1" autocomplete="off"></div>' +
      '<label class="check"><input type="checkbox" name="consentimiento" value="1" required><span>Acepto el <a href="privacidad.html" target="_blank">aviso de privacidad</a> y que el hotel guarde mis datos y preferencias de viaje para responder a esta solicitud. *</span></label>' +
      '<label class="check"><input type="checkbox" name="marketing" value="1"><span>Quiero recibir ofertas ocasionales (opcional).</span></label>' +
      '<button class="btn btn-gold" type="submit">Enviar solicitud</button><p class="form-status" role="status" aria-live="polite"></p>' +
      "</form></div>";

    box.innerHTML = html;
    box.hidden = false;
    var leadForm = $('[data-lead-form="buscador"]', box);
    leadForm._extra = function () {
      return { entrada: c.entrada, salida: c.salida, adultos: c.adultos, ninos: c.ninos, presupuesto: c.presupuesto, viaje: c.viaje, preferencias: c.preferencias, motivo: "estancia" };
    };
    bindLeadForm(leadForm);
    $$("[data-pick]", box).forEach(function (b) {
      b.addEventListener("click", function () {
        $("#fr-room").value = b.getAttribute("data-pick");
        $("#solicitud").scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" });
        setTimeout(function () { $("#fr-name").focus({ preventScroll: true }); }, 500);
      });
    });
  }

  function renderNoFit(c) {
    var box = $("[data-finder-results]");
    box.innerHTML = '<div class="fr-empty"><h3>Para ' + (c.adultos + c.ninos) + " huéspedes te conviene combinar habitaciones</h3>" +
      "<p>Ninguna habitación individual admite esa combinación de adultos y niños. Te sugerimos la Suite Familiar Selva junto con una Habitación Jardín o una Deluxe. Escríbenos y armamos la propuesta.</p>" +
      '<p style="margin-top:1.5rem"><a class="btn btn-gold" href="#contacto">Solicitar propuesta</a></p></div>';
    box.hidden = false;
  }

  var finderBusy = false;
  function runFinder() {
    var f = $("[data-finder]"), err = $("[data-finder-error]"), box = $("[data-finder-results]");
    if (!f || finderBusy) return;
    var c = readCriteria(f);
    var today = iso(new Date());
    if (!c.entrada || !c.salida) { err.textContent = "Elige tus fechas de llegada y salida."; f.entrada.focus(); return; }
    if (c.entrada < today) { err.textContent = "La fecha de llegada no puede estar en el pasado."; f.entrada.focus(); return; }
    if (c.salida <= c.entrada) { err.textContent = "La salida debe ser posterior a la llegada."; f.salida.focus(); return; }
    if (nightsBetween(c.entrada, c.salida) > 30) { err.textContent = "Para estancias de más de 30 noches, escríbenos directamente."; return; }
    err.textContent = "";

    finderBusy = true;
    var btn = $("[data-finder-submit]"); btn.disabled = true;
    box.hidden = false;
    box.innerHTML = '<p class="loading-line"><span class="loading-dots"><i></i><i></i><i></i></span>Analizando tus preferencias…</p><div class="skeleton sk-summary"></div><div class="fr-grid"><div class="skeleton sk-card"></div><div class="skeleton sk-card"></div><div class="skeleton sk-card"></div></div>';
    box.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" });

    hotelReady.then(function (h) {
      if (!h) throw new Error("sin datos");
      var scored = scoreRooms(c, h.habitaciones);
      var fitting = scored.filter(function (o) { return o.fits; });
      if (!fitting.length) { renderNoFit(c); return null; }
      var top = fitting.slice(0, 3);
      var payload = {
        criterios: c,
        opciones: top.map(function (o) { return { id: o.room.id, precioNoche: o.price, noches: o.nights, disponibilidadSimulada: o.avail, razones: o.reasons, avisos: o.warn }; })
      };
      var ctrl = "AbortController" in window ? new AbortController() : null;
      var timer = setTimeout(function () { if (ctrl) ctrl.abort(); }, 32000);
      return fetch(API.recommend, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload), signal: ctrl ? ctrl.signal : undefined })
        .then(function (r) { return r.ok ? r.json() : null; })
        .catch(function () { return null; })
        .then(function (ai) {
          clearTimeout(timer);
          var valid = ai && ai.ok && typeof ai.resumen === "string" ? ai : null;
          renderResults(c, top, valid);
        });
    }).catch(function () {
      box.innerHTML = '<div class="fr-empty"><h3>No pudimos cargar las habitaciones</h3><p>Revisa tu conexión e inténtalo de nuevo, o escríbenos por el formulario de contacto.</p></div>';
    }).then(function () { finderBusy = false; btn.disabled = false; });
  }

  function initFinder() {
    var f = $("[data-finder]");
    if (!f) return;
    // Selectores numéricos
    $$(".stepper-ctl", f).forEach(function (ctl) {
      var input = $("input", ctl);
      $$("button", ctl).forEach(function (b) {
        b.addEventListener("click", function () {
          var v = (parseInt(input.value, 10) || 0) + (+b.getAttribute("data-step"));
          input.value = Math.max(+input.min, Math.min(+input.max, v));
        });
      });
    });
    // Presupuesto
    var range = f.presupuesto, out = $("[data-budget-out]", f);
    function paint() {
      var pct = (range.value - range.min) / (range.max - range.min) * 100;
      range.style.setProperty("--pct", pct + "%");
      out.textContent = (+range.value >= +range.max ? "más de " : "hasta ") + fmt(range.value) + " MXN";
    }
    range.addEventListener("input", paint); paint();
    f.addEventListener("submit", function (e) { e.preventDefault(); runFinder(); });
  }

  /* ---------- Formularios de contacto / leads ---------- */
  var formToken = null;
  function getToken() {
    if (formToken) return Promise.resolve(formToken);
    return fetch(API.lead + "?token=1", { cache: "no-store" })
      .then(function (r) { return r.ok ? r.json() : {}; })
      .then(function (d) { formToken = d.token || ""; return formToken; })
      .catch(function () { return ""; });
  }
  var emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  function setInvalid(input, msg) {
    if (!input) return;
    input.setAttribute("aria-invalid", "true");
    var id = input.id ? input.id + "-err" : "";
    var holder = input.closest(".field") || input.parentNode;
    var e = holder.querySelector(".field-error");
    if (!e) { e = document.createElement("span"); e.className = "field-error"; if (id) e.id = id; holder.appendChild(e); }
    e.textContent = msg;
    if (id) input.setAttribute("aria-describedby", id);
  }
  function clearInvalid(form) {
    $$("[aria-invalid]", form).forEach(function (i) { i.removeAttribute("aria-invalid"); });
    $$(".field-error", form).forEach(function (e) { e.remove(); });
  }

  function bindLeadForm(form) {
    if (!form || form._bound) return;
    form._bound = true;
    getToken();
    var status = $(".form-status", form);
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      clearInvalid(form);
      status.className = "form-status"; status.textContent = "";
      var first = null;
      var name = form.nombre, email = form.email, phone = form.telefono, consent = form.consentimiento;
      if (name && name.value.trim().length < 2) { setInvalid(name, "Escribe tu nombre."); first = first || name; }
      if (!email || !emailRe.test(email.value.trim())) { setInvalid(email, "Escribe un correo válido."); first = first || email; }
      if (phone && phone.value.trim() && !/^[+()\d\s.-]{7,25}$/.test(phone.value.trim())) { setInvalid(phone, "Revisa el teléfono."); first = first || phone; }
      if (form.entrada && form.salida && form.entrada.value && form.salida.value && form.salida.value <= form.entrada.value) { setInvalid(form.salida, "Debe ser posterior a la llegada."); first = first || form.salida; }
      if (consent && !consent.checked) { status.className = "form-status err"; status.textContent = "Necesitamos tu consentimiento para responderte."; first = first || consent; }
      if (first) { first.focus(); return; }

      var data = {
        origen: form.getAttribute("data-lead-form"),
        motivo: (form.motivo && (form.motivo.value || (form.querySelector('input[name="motivo"]:checked') || {}).value)) || "informacion",
        nombre: name ? name.value.trim() : "",
        email: email.value.trim(),
        telefono: phone ? phone.value.trim() : "",
        entrada: form.entrada ? form.entrada.value : "",
        salida: form.salida ? form.salida.value : "",
        habitacion: form.habitacion ? form.habitacion.value : "",
        mensaje: form.mensaje ? form.mensaje.value.trim() : "",
        consentimiento: consent ? consent.checked : false,
        marketing: form.marketing ? (form.marketing.type === "hidden" ? true : form.marketing.checked) : false,
        sitio_web: form.sitio_web ? form.sitio_web.value : ""
      };
      if (form._extra) { var x = form._extra(); for (var k in x) data[k] = x[k]; }

      var btn = $('button[type="submit"]', form), label = btn.innerHTML;
      btn.disabled = true; btn.textContent = "Enviando…";
      getToken().then(function (t) {
        data.token = t;
        return fetch(API.lead, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      }).then(function (r) {
        return r.json().catch(function () { return { ok: false }; });
      }).then(function (res) {
        if (res && res.ok) {
          formToken = null;
          showSuccess(form, data);
        } else {
          status.className = "form-status err";
          status.textContent = (res && res.message) || "No pudimos enviar tu solicitud. Inténtalo de nuevo o escríbenos por WhatsApp.";
        }
      }).catch(function () {
        status.className = "form-status err";
        status.textContent = "Sin conexión con el servidor. Inténtalo de nuevo en unos minutos.";
      }).then(function () { btn.disabled = false; btn.innerHTML = label; });
    });
  }

  function showSuccess(form, data) {
    if (form.classList.contains("newsletter")) {
      var st = $(".form-status", form);
      form.reset();
      st.className = "form-status ok";
      st.textContent = "¡Listo! Te escribiremos solo con ofertas que valgan la pena.";
      return;
    }
    var first = (data.nombre || "").split(" ")[0];
    var wrap = document.createElement("div");
    wrap.className = "form-success";
    wrap.setAttribute("tabindex", "-1");
    wrap.innerHTML = '<div class="ok-ico"><svg viewBox="0 0 24 24"><use href="#i-check"/></svg></div>' +
      "<h3>Gracias" + (first ? ", " + esc(first) : "") + "</h3>" +
      "<p>Recibimos tu solicitud. En un hotel real, el equipo te respondería en menos de 24 horas a <strong>" + esc(data.email) + "</strong>.</p>" +
      '<p class="demo-note">Esto es una demostración: no se ha creado ninguna reserva.</p>';
    form.replaceWith(wrap);
    wrap.focus();
  }

  function initLeadForms() { $$("form[data-lead-form]").forEach(bindLeadForm); }

  /* ---------- Galería a pantalla completa ---------- */
  function initGallery() {
    var items = $$("[data-gallery] .g-item"), lb = $("[data-lightbox]");
    if (!items.length || !lb) return;
    var img = $("[data-lb-img]", lb), cap = $("[data-lb-cap]", lb), idx = 0, opener = null;
    function show(i) {
      idx = (i + items.length) % items.length;
      var it = items[idx];
      img.src = it.getAttribute("data-full");
      img.alt = $("img", it).alt;
      cap.textContent = it.getAttribute("data-caption") || "";
      img.style.animation = "none"; void img.offsetWidth; img.style.animation = "";
    }
    function open(i) { opener = document.activeElement; show(i); lb.hidden = false; document.body.style.overflow = "hidden"; $("[data-lb-close]", lb).focus(); }
    function close() { lb.hidden = true; document.body.style.overflow = ""; if (opener) opener.focus(); }
    items.forEach(function (it, i) { it.addEventListener("click", function () { open(i); }); });
    $("[data-lb-close]", lb).addEventListener("click", close);
    $("[data-lb-prev]", lb).addEventListener("click", function () { show(idx - 1); });
    $("[data-lb-next]", lb).addEventListener("click", function () { show(idx + 1); });
    lb.addEventListener("click", function (e) { if (e.target === lb) close(); });
    document.addEventListener("keydown", function (e) {
      if (lb.hidden) return;
      if (e.key === "Escape") close();
      else if (e.key === "ArrowLeft") show(idx - 1);
      else if (e.key === "ArrowRight") show(idx + 1);
      else if (e.key === "Tab") { // mantener el foco dentro
        var f = $$("button", lb), a = f[0], z = f[f.length - 1];
        if (e.shiftKey && document.activeElement === a) { e.preventDefault(); z.focus(); }
        else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus(); }
      }
    });
    var x0 = null;
    lb.addEventListener("touchstart", function (e) { x0 = e.touches[0].clientX; }, { passive: true });
    lb.addEventListener("touchend", function (e) {
      if (x0 === null) return;
      var dx = e.changedTouches[0].clientX - x0;
      if (Math.abs(dx) > 50) show(idx + (dx < 0 ? 1 : -1));
      x0 = null;
    });
  }

  /* ---------- Mapa (Leaflet + OpenStreetMap, sin clave) ---------- */
  function initMap() {
    var el = $("#mapa");
    if (!el) return;
    function build() {
      if (!window.L || el._built) return;
      el._built = true;
      hotelReady.then(function (h) {
        var lat = h ? h.ubicacion.lat : 18.6563, lng = h ? h.ubicacion.lng : -88.4009;
        var map = L.map(el, { scrollWheelZoom: false, zoomControl: true }).setView([lat, lng], 13);
        L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
          maxZoom: 18, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        }).addTo(map);
        var icon = L.divIcon({ className: "", html: '<div class="map-pin"><span>7</span></div>', iconSize: [44, 44], iconAnchor: [22, 44], popupAnchor: [0, -40] });
        L.marker([lat, lng], { icon: icon, title: "Siete Azules (ubicación de demostración)" }).addTo(map)
          .bindPopup("<strong>Siete Azules</strong><br>Ubicación aproximada de demostración<br>Orilla sur de la Laguna de Bacalar");
        var pois = [
          [18.6474, -88.4128, "Cenote Azul"],
          [18.6776, -88.3913, "Fuerte de San Felipe"],
          [18.7062, -88.3779, "Canal de los Piratas"]
        ];
        pois.forEach(function (p) { L.circleMarker([p[0], p[1]], { radius: 6, color: "#b48d4f", weight: 2, fillColor: "#f8f4ed", fillOpacity: 1 }).addTo(map).bindTooltip(p[2]); });
      });
    }
    if ("IntersectionObserver" in window) {
      var io = new IntersectionObserver(function (en) { if (en[0].isIntersecting) { io.disconnect(); build(); } }, { rootMargin: "300px" });
      io.observe(el);
    } else build();
  }

  /* ---------- Asistente virtual (Gemini, a través del servidor) ---------- */
  function initChat() {
    var panel = $("[data-chat]"), fab = $("[data-chat-open]");
    if (!panel || !fab) return;
    var log = $("[data-chat-log]", panel), form = $("[data-chat-form]", panel), input = $("#chat-input"), suggest = $("[data-chat-suggest]", panel);
    var history = [], busy = false;

    function open() {
      panel.hidden = false; fab.classList.add("is-hidden"); fab.setAttribute("aria-expanded", "true");
      setTimeout(function () { input.focus(); }, 60);
    }
    function close() { panel.hidden = true; fab.classList.remove("is-hidden"); fab.setAttribute("aria-expanded", "false"); fab.focus(); }
    fab.addEventListener("click", open);
    $("[data-chat-close]", panel).addEventListener("click", close);
    document.addEventListener("keydown", function (e) { if (e.key === "Escape" && !panel.hidden) close(); });

    // Formato seguro: escapamos todo y solo permitimos **negritas**, listas y saltos de línea.
    function format(text) {
      var lines = esc(text).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>").split(/\n+/);
      var out = "", inList = false;
      lines.forEach(function (l) {
        var m = l.match(/^\s*(?:[-*•]|\d+\.)\s+(.*)/);
        if (m) { if (!inList) { out += "<ul>"; inList = true; } out += "<li>" + m[1] + "</li>"; }
        else { if (inList) { out += "</ul>"; inList = false; } if (l.trim()) out += "<p>" + l + "</p>"; }
      });
      if (inList) out += "</ul>";
      return out;
    }

    function add(role, html, extraClass) {
      var d = document.createElement("div");
      d.className = "msg " + (role === "user" ? "msg-user" : "msg-bot") + (extraClass ? " " + extraClass : "");
      d.innerHTML = html;
      log.appendChild(d);
      log.scrollTop = log.scrollHeight;
      return d;
    }

    function actionsFor(tags, bubble) {
      if (!tags.length) return;
      var a = document.createElement("div"); a.className = "msg-actions";
      if (tags.indexOf("BUSCADOR") !== -1) a.insertAdjacentHTML("beforeend", '<a href="#buscador" data-close-chat>Abrir buscador de estancias</a>');
      if (tags.indexOf("WHATSAPP") !== -1) a.insertAdjacentHTML("beforeend", '<a href="https://wa.me/529830000000" target="_blank" rel="noopener">WhatsApp (demo)</a>');
      if (tags.indexOf("CONTACTO") !== -1) a.insertAdjacentHTML("beforeend", '<button type="button" data-chat-lead>Dejar mis datos</button>');
      bubble.appendChild(a);
      $$("[data-close-chat]", a).forEach(function (l) { l.addEventListener("click", function () { if (innerWidth < 720) close(); }); });
      $$("[data-chat-lead]", a).forEach(function (b) { b.addEventListener("click", function () { b.disabled = true; leadInChat(); }); });
    }

    function leadInChat() {
      var bubble = add("bot", "<p>Con gusto. Déjame tus datos y el equipo del hotel te contactará. Solo los usamos para darte seguimiento.</p>");
      var f = document.createElement("form");
      f.className = "chat-lead"; f.setAttribute("data-lead-form", "chat"); f.noValidate = true;
      f.innerHTML = '<div class="field"><label class="sr-only" for="cl-n">Nombre</label><input id="cl-n" name="nombre" type="text" placeholder="Nombre" autocomplete="name" required maxlength="80"></div>' +
        '<div class="field"><label class="sr-only" for="cl-e">Correo</label><input id="cl-e" name="email" type="email" placeholder="Correo electrónico" autocomplete="email" required maxlength="120"></div>' +
        '<div class="field"><label class="sr-only" for="cl-p">Teléfono</label><input id="cl-p" name="telefono" type="tel" placeholder="Teléfono (opcional)" autocomplete="tel" maxlength="25"></div>' +
        '<div class="hp" aria-hidden="true"><input name="sitio_web" type="text" tabindex="-1" autocomplete="off"></div>' +
        '<label class="check"><input type="checkbox" name="consentimiento" value="1" required><span>Acepto el <a href="privacidad.html" target="_blank">aviso de privacidad</a>.</span></label>' +
        '<button type="submit">Enviar mis datos</button><p class="form-status" role="status" aria-live="polite"></p>';
      f._extra = function () {
        var userMsgs = history.filter(function (h) { return h.role === "user"; }).map(function (h) { return h.text; }).slice(-4).join(" | ");
        return { motivo: "estancia", mensaje: ("Desde el asistente: " + userMsgs).slice(0, 900) };
      };
      bubble.appendChild(f);
      bindLeadForm(f);
      log.scrollTop = log.scrollHeight;
      $("input", f).focus();
    }

    function send(text) {
      text = (text || "").trim();
      if (!text || busy) return;
      if (suggest) suggest.hidden = true;
      busy = true; $("button", form).disabled = true;
      add("user", "<p>" + esc(text) + "</p>");
      var typing = add("bot", "<span class=\"msg-typing\" aria-label=\"Escribiendo\"><i></i><i></i><i></i></span>");
      var ctrl = "AbortController" in window ? new AbortController() : null;
      var timer = setTimeout(function () { if (ctrl) ctrl.abort(); }, 35000);
      fetch(API.chat, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, history: history.slice(-10) }),
        signal: ctrl ? ctrl.signal : undefined
      }).then(function (r) { return r.json(); })
        .then(function (d) {
          var reply = (d && d.reply) || "";
          if (!reply) throw new Error("vacío");
          var tags = [];
          reply = reply.replace(/\[\[(BUSCADOR|CONTACTO|WHATSAPP)\]\]/g, function (_, t) { if (tags.indexOf(t) === -1) tags.push(t); return ""; }).trim();
          typing.innerHTML = format(reply);
          if (d.fallback) { typing.classList.add("msg-error"); if (tags.indexOf("CONTACTO") === -1) tags.push("CONTACTO"); }
          actionsFor(tags, typing);
          history.push({ role: "user", text: text }, { role: "model", text: reply });
        })
        .catch(function () {
          typing.classList.add("msg-error");
          typing.innerHTML = "<p>No pude conectarme ahora mismo. Puedes escribirnos por el formulario de contacto o por WhatsApp y te ayudamos enseguida.</p>";
          actionsFor(["CONTACTO", "WHATSAPP"], typing);
        })
        .then(function () { clearTimeout(timer); busy = false; $("button", form).disabled = false; log.scrollTop = log.scrollHeight; input.focus(); });
    }

    form.addEventListener("submit", function (e) { e.preventDefault(); var t = input.value; input.value = ""; send(t); });
    if (suggest) $$("button", suggest).forEach(function (b) { b.addEventListener("click", function () { send(b.textContent); }); });
  }

  function boot() {
    safe(initNav, "nav");
    safe(initReveals, "reveals");
    safe(initParallax, "parallax");
    safe(initCounters, "counters");
    safe(initDates, "dates");
    safe(initBookingBar, "bookingBar");
    safe(initFinder, "finder");
    safe(initLeadForms, "leads");
    safe(initGallery, "gallery");
    safe(initMap, "map");
    safe(initChat, "chat");
    doc.classList.add("is-ready");
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
