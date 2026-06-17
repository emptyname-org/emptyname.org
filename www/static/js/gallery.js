/* emptyname gallery: stage + thumbnails + lightbox, plus standalone artwork
   lightbox triggers. No dependencies. */
(function () {
  "use strict";

  function initGallery(g) {
    var fulls = [].slice.call(g.querySelectorAll(".gallery-full"));
    var thumbs = [].slice.call(g.querySelectorAll(".gallery-thumb"));
    var cap = g.querySelector(".gallery-caption");
    var stage = g.querySelector(".gallery-stage");
    var current = 0;

    function items() {
      return fulls.map(function (f) {
        return { src: f.getAttribute("src"), cap: f.getAttribute("data-caption") || "", desc: "" };
      });
    }

    function show(i) {
      current = i;
      fulls.forEach(function (f, j) { f.classList.toggle("is-active", j === i); });
      thumbs.forEach(function (t, j) { t.classList.toggle("is-active", j === i); });
      if (cap) cap.textContent = fulls[i] ? (fulls[i].getAttribute("data-caption") || "") : "";
    }

    thumbs.forEach(function (t, i) {
      t.addEventListener("click", function () { show(i); });
    });
    if (stage) stage.addEventListener("click", function () { openLightbox(items(), current); });

    show(0);
  }

  /* A single <a data-lightbox> (a standalone artwork or an embedded illustration). */
  function initTrigger(a) {
    a.addEventListener("click", function (e) {
      e.preventDefault();
      openLightbox([{
        src: a.getAttribute("data-full") || a.getAttribute("href"),
        cap: a.getAttribute("data-caption") || "",
        desc: a.getAttribute("data-desc") || ""
      }], 0);
    });
  }

  function openLightbox(items, start) {
    var i = start;
    var single = items.length < 2;
    var ov = document.createElement("div");
    ov.className = "lightbox";
    ov.innerHTML =
      '<button class="lb-close" aria-label="Close">&times;</button>' +
      (single ? "" : '<button class="lb-prev" aria-label="Previous">&#8249;</button>') +
      '<figure class="lb-figure"><img class="lb-img" alt="">' +
      '<figcaption class="lb-cap"><span class="lb-title"></span><span class="lb-desc"></span></figcaption></figure>' +
      (single ? "" : '<button class="lb-next" aria-label="Next">&#8250;</button>');
    document.body.appendChild(ov);
    document.body.style.overflow = "hidden";
    var img = ov.querySelector(".lb-img");
    var titleEl = ov.querySelector(".lb-title");
    var descEl = ov.querySelector(".lb-desc");

    function render() {
      var it = items[i];
      img.src = it.src;
      img.alt = it.desc || it.cap;
      titleEl.textContent = it.cap || "";
      descEl.textContent = it.desc || "";
    }
    function nav(d) { i = (i + d + items.length) % items.length; render(); }
    function close() {
      ov.remove();
      document.body.style.overflow = "";
      document.removeEventListener("keydown", onKey);
    }
    function onKey(e) {
      if (e.key === "Escape") close();
      else if (!single && e.key === "ArrowRight") nav(1);
      else if (!single && e.key === "ArrowLeft") nav(-1);
    }

    ov.querySelector(".lb-close").addEventListener("click", close);
    var prev = ov.querySelector(".lb-prev");
    var next = ov.querySelector(".lb-next");
    if (prev) prev.addEventListener("click", function (e) { e.stopPropagation(); nav(-1); });
    if (next) next.addEventListener("click", function (e) { e.stopPropagation(); nav(1); });
    ov.addEventListener("click", function (e) { if (e.target === ov) close(); });
    document.addEventListener("keydown", onKey);
    render();
  }

  document.addEventListener("DOMContentLoaded", function () {
    [].slice.call(document.querySelectorAll("[data-gallery]")).forEach(initGallery);
    [].slice.call(document.querySelectorAll("[data-lightbox]")).forEach(initTrigger);
  });
})();
