/* =========================================================
   El precio del desarrollo — reproductores de audio y video
   Audio: una "pradera" de pasto que se vuelve verde (y florece)
          a medida que avanza la entrevista.
   Video: una enredadera que crece por la barra de avance.
   Si este archivo no carga, quedan los reproductores normales
   del navegador, así que nada deja de funcionar.
   ========================================================= */
(function () {
  "use strict";

  var contador = 0;

  var ICONOS = {
    play: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13l10.5-6.5z"/></svg>',
    pausa: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z"/></svg>',
    sonido: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z"/><path d="M15 8.5a4.5 4.5 0 0 1 0 7M17.5 6a8 8 0 0 1 0 12" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
    silencio: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z"/><path d="M15.5 9.5l5 5M20.5 9.5l-5 5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
    pantalla: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>'
  };

  function formato(seg) {
    if (!isFinite(seg) || seg < 0) return "--:--";
    seg = Math.floor(seg);
    return Math.floor(seg / 60) + ":" + String(seg % 60).padStart(2, "0");
  }

  /* Generador pseudoaleatorio con semilla: cada audio tiene su propia pradera,
     y siempre la misma cada vez que se carga la página. */
  function semilla(texto) {
    var h = 2166136261;
    for (var i = 0; i < texto.length; i++) { h ^= texto.charCodeAt(i); h = Math.imul(h, 16777619); }
    return function () {
      h ^= h << 13; h ^= h >>> 17; h ^= h << 5;
      return ((h >>> 0) % 10000) / 10000;
    };
  }

  function fuenteDe(medio) {
    var s = medio.querySelector("source");
    return (s && s.getAttribute("src")) || medio.getAttribute("src") || "";
  }

  /* Solo un audio o video sonando a la vez */
  document.addEventListener("play", function (e) {
    document.querySelectorAll("audio, video").forEach(function (m) {
      if (m !== e.target && !m.paused) m.pause();
    });
  }, true);

  /* ---------- Control de avance accesible (mouse, dedo y teclado) ---------- */
  function hacerDeslizable(el, medio, refrescar) {
    var arrastrando = false;
    var pendiente = null;

    medio.addEventListener("loadedmetadata", function () {
      if (pendiente !== null) { medio.currentTime = pendiente * medio.duration; pendiente = null; }
      refrescar();
    });

    function irAFraccion(f) {
      f = Math.max(0, Math.min(1, f));
      if (isFinite(medio.duration) && medio.duration > 0) {
        medio.currentTime = f * medio.duration;
      } else {
        pendiente = f;
        if (medio.readyState === 0) medio.load();
      }
      refrescar(f);
    }
    function desdePuntero(e) {
      var r = el.getBoundingClientRect();
      irAFraccion((e.clientX - r.left) / r.width);
    }
    el.addEventListener("pointerdown", function (e) {
      arrastrando = true;
      el.setPointerCapture(e.pointerId);
      desdePuntero(e);
    });
    el.addEventListener("pointermove", function (e) { if (arrastrando) desdePuntero(e); });
    ["pointerup", "pointercancel", "lostpointercapture"].forEach(function (n) {
      el.addEventListener(n, function () { arrastrando = false; });
    });
    el.addEventListener("keydown", function (e) {
      var d = medio.duration;
      if (!isFinite(d) || d <= 0) return;
      var t = medio.currentTime, nuevo = null;
      if (e.key === "ArrowRight" || e.key === "ArrowUp") nuevo = t + 5;
      if (e.key === "ArrowLeft" || e.key === "ArrowDown") nuevo = t - 5;
      if (e.key === "PageUp") nuevo = t + d * 0.1;
      if (e.key === "PageDown") nuevo = t - d * 0.1;
      if (e.key === "Home") nuevo = 0;
      if (e.key === "End") nuevo = d;
      if (nuevo !== null) {
        e.preventDefault();
        medio.currentTime = Math.max(0, Math.min(d, nuevo));
        refrescar();
      }
    });
  }

  function marcarSlider(el, medio) {
    var d = medio.duration, t = medio.currentTime;
    el.setAttribute("aria-valuemax", isFinite(d) ? Math.round(d) : 0);
    el.setAttribute("aria-valuenow", Math.round(t));
    el.setAttribute("aria-valuetext", formato(t) + " de " + formato(d));
  }

  function mostrarError(caja, contenedorError, src, tipo) {
    caja.classList.add("con-error");
    contenedorError.hidden = false;
    contenedorError.innerHTML = "";
    contenedorError.appendChild(document.createTextNode("Este " + tipo + " no se pudo cargar aquí. "));
    var a = document.createElement("a");
    a.href = src; a.target = "_blank"; a.rel = "noopener";
    a.textContent = "Ábrelo en otra pestaña";
    contenedorError.appendChild(a);
    contenedorError.appendChild(document.createTextNode("."));
  }

  /* =========================================================
     AUDIO: la pradera
     ========================================================= */
  function crearPradera(audio) {
    var fig = audio.closest(".audio");
    var id = "pradera-" + (++contador);
    var src = fuenteDe(audio);
    var quien = fig.querySelector(".audio__quien b");
    var nombre = quien ? quien.textContent.trim() : "audio";

    audio.removeAttribute("controls");
    audio.classList.add("oculto");
    audio.preload = "metadata";

    var caja = document.createElement("div");
    caja.className = "pradera";
    caja.innerHTML =
      '<button type="button" class="hoja-boton pradera__play">' + ICONOS.play + '</button>' +
      '<div class="pradera__campo" role="slider" tabindex="0" aria-valuemin="0" aria-valuemax="0" aria-valuenow="0">' +
        '<svg class="pradera__svg" viewBox="0 0 600 64" preserveAspectRatio="none" aria-hidden="true">' +
          '<defs>' +
            '<clipPath id="' + id + '-recorte"><rect class="pradera__recorte" x="0" y="0" width="0" height="64"/></clipPath>' +
            '<linearGradient id="' + id + '-verde" x1="0" y1="1" x2="0" y2="0">' +
              '<stop offset="0" stop-color="#3F5A2C"/><stop offset="1" stop-color="#A9BD7A"/>' +
            '</linearGradient>' +
          '</defs>' +
          '<g class="pradera__seco"></g>' +
          '<g class="pradera__verde" clip-path="url(#' + id + '-recorte)" fill="url(#' + id + '-verde)"></g>' +
        '</svg>' +
      '</div>' +
      '<span class="pradera__tiempo">0:00 / --:--</span>';
    var error = document.createElement("p");
    error.className = "pradera__error";
    error.hidden = true;

    audio.parentNode.insertBefore(caja, audio.nextSibling);
    caja.parentNode.insertBefore(error, caja.nextSibling);

    var boton = caja.querySelector(".pradera__play");
    var campo = caja.querySelector(".pradera__campo");
    var recorte = caja.querySelector(".pradera__recorte");
    var tiempo = caja.querySelector(".pradera__tiempo");
    boton.setAttribute("aria-label", "Reproducir: " + nombre);
    campo.setAttribute("aria-label", "Avance del audio de " + nombre);

    /* Briznas de pasto: alturas con una envolvente suave, como una onda de sonido */
    var rnd = semilla(src || id);
    var N = 72, seco = "", verde = "";
    for (var i = 0; i < N; i++) {
      var cx = (i + 0.5) * (600 / N) + (rnd() - 0.5) * 3;
      var env = 0.4 + 0.6 * Math.abs(Math.sin(i * 0.19 + rnd() * 0.7));
      var h = 12 + env * 48 * (0.62 + 0.38 * rnd());
      var w = 4.6 + rnd() * 2.6;
      var lean = (rnd() - 0.5) * 11;
      var x0 = cx - w / 2, x1 = cx + w / 2, tx = cx + lean, ty = 64 - h;
      var d = "M" + x0.toFixed(1) + " 64Q" + (x0 + lean * 0.35).toFixed(1) + " " + (64 - h * 0.55).toFixed(1) + " " +
              tx.toFixed(1) + " " + ty.toFixed(1) + "Q" + (x1 + lean * 0.35).toFixed(1) + " " + (64 - h * 0.5).toFixed(1) + " " +
              x1.toFixed(1) + " 64Z";
      seco += '<path d="' + d + '"/>';
      verde += '<path class="brizna" style="animation-delay:-' + (rnd() * 2.4).toFixed(2) + 's" d="' + d + '"/>';
      if (h > 46 && rnd() < 0.32) {
        verde += '<circle class="flor" cx="' + tx.toFixed(1) + '" cy="' + (ty + 1.5).toFixed(1) + '" r="3.8"/>';
      }
    }
    caja.querySelector(".pradera__seco").innerHTML = seco;
    caja.querySelector(".pradera__verde").innerHTML = verde;

    var animando = false;
    function refrescar(fraccion) {
      var dur = audio.duration;
      var f = (typeof fraccion === "number") ? fraccion
            : (isFinite(dur) && dur > 0 ? audio.currentTime / dur : 0);
      recorte.setAttribute("width", (f * 600).toFixed(1));
      tiempo.textContent = formato(audio.currentTime) + " / " + formato(dur);
      marcarSlider(campo, audio);
    }
    function bucle() {
      refrescar();
      if (animando) requestAnimationFrame(bucle);
    }

    boton.addEventListener("click", function () {
      if (audio.paused) {
        var p = audio.play();
        if (p && p.catch) p.catch(function () {});
      } else {
        audio.pause();
      }
    });
    audio.addEventListener("play", function () {
      fig.classList.add("sonando");
      boton.innerHTML = ICONOS.pausa;
      boton.setAttribute("aria-label", "Pausar: " + nombre);
      animando = true; requestAnimationFrame(bucle);
    });
    function detener() {
      fig.classList.remove("sonando");
      boton.innerHTML = ICONOS.play;
      boton.setAttribute("aria-label", "Reproducir: " + nombre);
      animando = false; refrescar();
    }
    audio.addEventListener("pause", detener);
    audio.addEventListener("ended", detener);
    audio.addEventListener("durationchange", function () { refrescar(); });

    function fallo() { detener(); boton.disabled = true; mostrarError(fig, error, src, "audio"); }
    audio.addEventListener("error", fallo);
    var fuente = audio.querySelector("source");
    if (fuente) fuente.addEventListener("error", fallo);

    hacerDeslizable(campo, audio, refrescar);
    refrescar();
  }

  /* =========================================================
     VIDEO: la enredadera
     ========================================================= */
  function crearReproductor(video) {
    var src = fuenteDe(video);
    video.removeAttribute("controls");
    if (video.preload !== "metadata") video.preload = "metadata";

    var caja = document.createElement("div");
    caja.className = "reproductor";
    video.parentNode.insertBefore(caja, video);
    caja.appendChild(video);
    caja.insertAdjacentHTML("beforeend",
      '<button type="button" class="hoja-boton hoja-boton--grande reproductor__grande" aria-label="Reproducir video">' + ICONOS.play + '</button>' +
      '<div class="reproductor__barra">' +
        '<button type="button" class="reproductor__btn reproductor__play" aria-label="Reproducir video">' + ICONOS.play + '</button>' +
        '<div class="tallo" role="slider" tabindex="0" aria-label="Avance del video" aria-valuemin="0" aria-valuemax="0" aria-valuenow="0">' +
          '<span class="tallo__linea"></span><span class="tallo__avance"></span><span class="tallo__hoja"></span>' +
        '</div>' +
        '<span class="reproductor__tiempo">0:00 / --:--</span>' +
        '<button type="button" class="reproductor__btn reproductor__sonido" aria-label="Silenciar">' + ICONOS.sonido + '</button>' +
        '<button type="button" class="reproductor__btn reproductor__pantalla" aria-label="Pantalla completa">' + ICONOS.pantalla + '</button>' +
      '</div>');
    var error = document.createElement("p");
    error.className = "reproductor__error";
    error.hidden = true;
    caja.parentNode.insertBefore(error, caja.nextSibling);

    var grande = caja.querySelector(".reproductor__grande");
    var play = caja.querySelector(".reproductor__play");
    var tallo = caja.querySelector(".tallo");
    var tiempo = caja.querySelector(".reproductor__tiempo");
    var sonido = caja.querySelector(".reproductor__sonido");
    var pantalla = caja.querySelector(".reproductor__pantalla");
    var animando = false, temporizador = null;

    function refrescar(fraccion) {
      var dur = video.duration;
      var f = (typeof fraccion === "number") ? fraccion
            : (isFinite(dur) && dur > 0 ? video.currentTime / dur : 0);
      caja.style.setProperty("--avance", (f * 100).toFixed(2) + "%");
      tiempo.textContent = formato(video.currentTime) + " / " + formato(dur);
      marcarSlider(tallo, video);
    }
    function bucle() { refrescar(); if (animando) requestAnimationFrame(bucle); }

    function alternar() {
      if (video.paused) {
        var p = video.play();
        if (p && p.catch) p.catch(function () {});
      } else {
        video.pause();
      }
    }
    function mostrarControles() {
      caja.classList.remove("oculta");
      clearTimeout(temporizador);
      if (!video.paused) {
        temporizador = setTimeout(function () {
          if (!caja.contains(document.activeElement)) caja.classList.add("oculta");
        }, 2600);
      }
    }

    grande.addEventListener("click", alternar);
    play.addEventListener("click", alternar);
    video.addEventListener("click", alternar);
    caja.addEventListener("pointermove", mostrarControles);
    caja.addEventListener("focusin", mostrarControles);

    video.addEventListener("play", function () {
      caja.classList.add("reproduciendo");
      play.innerHTML = ICONOS.pausa;
      play.setAttribute("aria-label", "Pausar video");
      animando = true; requestAnimationFrame(bucle);
      mostrarControles();
    });
    function detener() {
      caja.classList.remove("reproduciendo", "oculta", "cargando");
      play.innerHTML = ICONOS.play;
      play.setAttribute("aria-label", "Reproducir video");
      animando = false; clearTimeout(temporizador); refrescar();
    }
    video.addEventListener("pause", detener);
    video.addEventListener("ended", detener);
    video.addEventListener("waiting", function () { caja.classList.add("cargando"); });
    video.addEventListener("playing", function () { caja.classList.remove("cargando"); });
    video.addEventListener("durationchange", function () { refrescar(); });

    sonido.addEventListener("click", function () {
      video.muted = !video.muted;
      sonido.innerHTML = video.muted ? ICONOS.silencio : ICONOS.sonido;
      sonido.setAttribute("aria-label", video.muted ? "Activar sonido" : "Silenciar");
    });

    pantalla.addEventListener("click", function () {
      if (document.fullscreenElement) { document.exitFullscreen(); return; }
      if (caja.requestFullscreen) caja.requestFullscreen();
      else if (caja.webkitRequestFullscreen) caja.webkitRequestFullscreen();
      else if (video.webkitEnterFullscreen) video.webkitEnterFullscreen();   /* iPhone */
    });

    function fallo() { detener(); grande.disabled = true; mostrarError(caja, error, src, "video"); }
    video.addEventListener("error", fallo);
    var fuente = video.querySelector("source");
    if (fuente) fuente.addEventListener("error", fallo);

    hacerDeslizable(tallo, video, refrescar);
    refrescar();
  }

  document.querySelectorAll(".audio audio").forEach(crearPradera);
  document.querySelectorAll("figure.video video").forEach(crearReproductor);
})();
