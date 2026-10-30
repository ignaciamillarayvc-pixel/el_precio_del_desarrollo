/* =========================================================
   El precio del desarrollo — interacciones
   1. Barra de navegación y progreso de lectura
   2. Sección activa en el menú
   3. Visor de planos (pestañas)
   4. Visor de imágenes ampliadas (galerías y planos)
   ========================================================= */
(function () {
  "use strict";

  /* ---------- 1. Barra de navegación y progreso ---------- */
  const barra = document.querySelector(".barra");
  const portada = document.querySelector(".portada");
  const progreso = document.querySelector(".progreso span");

  function alDesplazar() {
    const alto = document.documentElement.scrollHeight - window.innerHeight;
    const avance = alto > 0 ? window.scrollY / alto : 0;
    if (progreso) progreso.style.transform = "scaleX(" + avance.toFixed(4) + ")";
    if (barra && portada) {
      barra.classList.toggle("visible", window.scrollY > portada.offsetHeight * 0.8);
    }
  }
  let pendiente = false;
  window.addEventListener("scroll", function () {
    if (pendiente) return;
    pendiente = true;
    requestAnimationFrame(function () { alDesplazar(); pendiente = false; });
  }, { passive: true });
  alDesplazar();

  /* ---------- 2. Sección activa en el menú ---------- */
  const enlaces = Array.from(document.querySelectorAll(".barra ul a"));
  const secciones = enlaces
    .map(function (a) { return document.querySelector(a.getAttribute("href")); })
    .filter(Boolean);

  if ("IntersectionObserver" in window && secciones.length) {
    const observador = new IntersectionObserver(function (entradas) {
      entradas.forEach(function (entrada) {
        if (!entrada.isIntersecting) return;
        enlaces.forEach(function (a) {
          a.setAttribute("aria-current", a.getAttribute("href") === "#" + entrada.target.id ? "true" : "false");
        });
      });
    }, { rootMargin: "-45% 0px -50% 0px" });
    secciones.forEach(function (s) { observador.observe(s); });
  }

  /* ---------- 3. Visor de planos ---------- */
  const pestanas = Array.from(document.querySelectorAll('.planos [role="tab"]'));
  const panel = document.getElementById("plano-panel");
  const planoImg = document.getElementById("plano-img");
  const planoDesc = document.getElementById("plano-desc");
  const planoPdf = document.getElementById("plano-pdf");

  function elegirPestana(tab, enfocar) {
    pestanas.forEach(function (t) {
      const activa = t === tab;
      t.setAttribute("aria-selected", activa ? "true" : "false");
      t.tabIndex = activa ? 0 : -1;
    });
    if (enfocar) tab.focus();
    panel.setAttribute("aria-labelledby", tab.id);

    const nueva = tab.dataset.img;
    if (planoImg.getAttribute("src") !== nueva) {
      planoImg.classList.add("cargando");
      const temp = new Image();
      temp.onload = function () {
        planoImg.src = nueva;
        planoImg.width = temp.naturalWidth;
        planoImg.height = temp.naturalHeight;
        planoImg.classList.remove("cargando");
      };
      temp.onerror = function () { planoImg.classList.remove("cargando"); };
      temp.src = nueva;
    }
    planoImg.alt = "Plano del proyecto de data center: " + tab.textContent.trim().toLowerCase() + ".";
    planoDesc.textContent = tab.dataset.desc;
    planoPdf.href = tab.dataset.pdf;
  }

  pestanas.forEach(function (tab, i) {
    tab.addEventListener("click", function () { elegirPestana(tab, false); });
    tab.addEventListener("keydown", function (e) {
      let destino = null;
      if (e.key === "ArrowRight") destino = pestanas[(i + 1) % pestanas.length];
      if (e.key === "ArrowLeft") destino = pestanas[(i - 1 + pestanas.length) % pestanas.length];
      if (e.key === "Home") destino = pestanas[0];
      if (e.key === "End") destino = pestanas[pestanas.length - 1];
      if (destino) { e.preventDefault(); elegirPestana(destino, true); }
    });
  });

  /* ---------- 4. Visor de imágenes ampliadas ---------- */
  const visor = document.getElementById("visor");
  const lienzo = document.getElementById("visor-lienzo");
  const visorImg = document.getElementById("visor-img");
  const visorPie = document.getElementById("visor-pie");
  const btnAnt = document.getElementById("visor-ant");
  const btnSig = document.getElementById("visor-sig");
  const btnZoom = document.getElementById("visor-zoom");
  const btnCerrar = document.getElementById("visor-cerrar");

  let grupo = [];      // [{src, alt, pie}]
  let indice = 0;
  let origen = null;   // elemento que abrió el visor, para devolverle el foco

  function mostrar(i) {
    indice = (i + grupo.length) % grupo.length;
    const item = grupo[indice];
    quitarZoom();
    visorImg.src = item.src;
    visorImg.alt = item.alt;
    visorPie.textContent = item.pie;
    const varias = grupo.length > 1;
    btnAnt.hidden = !varias;
    btnSig.hidden = !varias;
  }

  function abrir(items, i, desde) {
    grupo = items;
    origen = desde || null;
    mostrar(i);
    if (typeof visor.showModal === "function") {
      visor.showModal();
    } else {
      visor.setAttribute("open", "");
    }
    document.body.style.overflow = "hidden";
    btnCerrar.focus();
  }

  function cerrar() {
    if (typeof visor.close === "function") visor.close();
    else visor.removeAttribute("open");
  }

  visor.addEventListener("close", function () {
    document.body.style.overflow = "";
    quitarZoom();
    if (origen) origen.focus();
  });

  function alternarZoom() {
    const activo = lienzo.classList.toggle("zoom");
    btnZoom.setAttribute("aria-pressed", activo ? "true" : "false");
    btnZoom.textContent = activo ? "Alejar" : "Acercar";
    if (activo) {
      // centra la vista al acercar
      requestAnimationFrame(function () {
        lienzo.scrollLeft = (lienzo.scrollWidth - lienzo.clientWidth) / 2;
        lienzo.scrollTop = (lienzo.scrollHeight - lienzo.clientHeight) / 2;
      });
    }
  }
  function quitarZoom() {
    lienzo.classList.remove("zoom");
    btnZoom.setAttribute("aria-pressed", "false");
    btnZoom.textContent = "Acercar";
  }

  btnAnt.addEventListener("click", function () { mostrar(indice - 1); });
  btnSig.addEventListener("click", function () { mostrar(indice + 1); });
  btnZoom.addEventListener("click", alternarZoom);
  visorImg.addEventListener("click", alternarZoom);
  btnCerrar.addEventListener("click", cerrar);

  // Cerrar al hacer clic fuera de la imagen
  visor.addEventListener("click", function (e) {
    if (e.target === visor || e.target === lienzo) cerrar();
  });

  visor.addEventListener("keydown", function (e) {
    if (e.key === "ArrowRight" && grupo.length > 1) mostrar(indice + 1);
    if (e.key === "ArrowLeft" && grupo.length > 1) mostrar(indice - 1);
  });

  // Gesto de deslizar en pantallas táctiles
  let toqueX = null;
  lienzo.addEventListener("touchstart", function (e) {
    if (lienzo.classList.contains("zoom")) return;
    toqueX = e.touches[0].clientX;
  }, { passive: true });
  lienzo.addEventListener("touchend", function (e) {
    if (toqueX === null || grupo.length < 2) return;
    const dx = e.changedTouches[0].clientX - toqueX;
    if (Math.abs(dx) > 50) mostrar(indice + (dx < 0 ? 1 : -1));
    toqueX = null;
  });

  // Galerías de fotos
  document.querySelectorAll(".galeria").forEach(function (galeria) {
    const figuras = Array.from(galeria.querySelectorAll(".galeria__item"));
    const items = figuras.map(function (fig) {
      const img = fig.querySelector("img");
      const pie = fig.querySelector("figcaption");
      return { src: img.getAttribute("src"), alt: img.alt, pie: pie ? pie.textContent.trim() : "" };
    });
    figuras.forEach(function (fig, i) {
      const boton = fig.querySelector("button");
      boton.setAttribute("aria-label", "Ampliar: " + (items[i].pie || items[i].alt));
      boton.addEventListener("click", function () { abrir(items, i, boton); });
    });
  });

  // Planos
  function abrirPlano(desde) {
    const tab = pestanas.find(function (t) { return t.getAttribute("aria-selected") === "true"; }) || pestanas[0];
    const items = pestanas.map(function (t) {
      return { src: t.dataset.img, alt: "Plano: " + t.textContent.trim(), pie: t.textContent.trim() + ". " + t.dataset.desc };
    });
    abrir(items, pestanas.indexOf(tab), desde);
  }
  const verPlano = document.querySelector(".planos__ver");
  const ampliarPlano = document.getElementById("plano-ampliar");
  if (verPlano) verPlano.addEventListener("click", function () { abrirPlano(verPlano); });
  if (ampliarPlano) ampliarPlano.addEventListener("click", function () { abrirPlano(ampliarPlano); });
})();
