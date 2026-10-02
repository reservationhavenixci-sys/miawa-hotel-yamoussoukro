/* =====================================================================
   MIAWA HÔTEL YAMOUSSOUKRO — SCRIPT
   Vanilla JS pur, sans dépendance externe.
   ===================================================================== */
(function () {
  "use strict";

  /* -------------------------------------------------------------------
     0. UTILITAIRES
     ------------------------------------------------------------------- */
  var qs = function (sel, ctx) { return (ctx || document).querySelector(sel); };
  var qsa = function (sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); };

  /* -------------------------------------------------------------------
     1. ANNÉE COURANTE DANS LE FOOTER
     ------------------------------------------------------------------- */
  var yearEl = qs("#year");
  if (yearEl) { yearEl.textContent = new Date().getFullYear(); }

  /* -------------------------------------------------------------------
     2. EN-TÊTE QUI SE SOLIDIFIE AU DÉFILEMENT
     ------------------------------------------------------------------- */
  var header = qs("#site-header");
  if (header) {
    var updateHeader = function () {
      if (window.scrollY > 40) {
        header.classList.add("is-scrolled");
      } else {
        header.classList.remove("is-scrolled");
      }
    };
    updateHeader();
    window.addEventListener("scroll", updateHeader, { passive: true });
  }

  /* -------------------------------------------------------------------
     3. MENU MOBILE (HAMBURGER)
     ------------------------------------------------------------------- */
  var navToggle = qs("#nav-toggle");
  var mainNav = qs("#main-nav");

  if (navToggle && mainNav) {
    var closeMenu = function () {
      mainNav.classList.remove("is-open");
      navToggle.classList.remove("is-active");
      navToggle.setAttribute("aria-expanded", "false");
    };

    var toggleMenu = function () {
      var isOpen = mainNav.classList.toggle("is-open");
      navToggle.classList.toggle("is-active", isOpen);
      navToggle.setAttribute("aria-expanded", String(isOpen));
    };

    navToggle.addEventListener("click", toggleMenu);

    // Ferme le menu dès qu'un lien est choisi
    qsa("a", mainNav).forEach(function (link) {
      link.addEventListener("click", closeMenu);
    });

    // Ferme le menu si on clique en dehors
    document.addEventListener("click", function (e) {
      if (!mainNav.classList.contains("is-open")) return;
      if (mainNav.contains(e.target) || navToggle.contains(e.target)) return;
      closeMenu();
    });

    // Ferme le menu avec Échap
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") closeMenu();
    });
  }

  /* -------------------------------------------------------------------
     4. MICRO-ANIMATIONS AU DÉFILEMENT (FADE-IN)
     ------------------------------------------------------------------- */
  var revealTargets = qsa(
    ".fade-in, .room-card, .space-card, .free-service, .access-text, .day-night-track"
  );

  revealTargets.forEach(function (el) { el.classList.add("fade-in"); });

  if ("IntersectionObserver" in window) {
    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: "0px 0px -60px 0px" }
    );

    revealTargets.forEach(function (el, i) {
      // léger décalage pour les grilles de cartes, sans dépendre de librairie
      el.style.transitionDelay = (i % 3) * 0.08 + "s";
      observer.observe(el);
    });
  } else {
    // Repli si IntersectionObserver n'est pas supporté : tout s'affiche directement
    revealTargets.forEach(function (el) { el.classList.add("is-visible"); });
  }

  /* -------------------------------------------------------------------
     5. PANNEAU DE RÉSERVATION (OUVERTURE / FERMETURE)
     ------------------------------------------------------------------- */
  var bookingPanel = qs("[data-booking-panel]");
  var openTriggers = qsa("[data-open-booking]");
  var closeTriggers = qsa("[data-close-booking]");
  var formuleSelect = qs("#client-formule");
  var lastFocusedEl = null;

  // Correspondance entre le data-room des boutons "Réserver cette chambre"
  // et la valeur exacte à présélectionner dans le menu déroulant du formulaire.
  var ROOM_TO_OPTION_VALUE = {
    standard: "Chambre Standard — 15 000 FCFA / nuit",
    superieure: "Chambre Supérieure (Petit-déjeuner inclus) — 20 000 FCFA / nuit",
    suite: "Suite Premium (Petit-déjeuner inclus) — 30 000 FCFA / nuit",
    seminaire: "Salle de Séminaire"
  };

  var openBooking = function (roomKey) {
    if (!bookingPanel) return;

    lastFocusedEl = document.activeElement;

    bookingPanel.setAttribute("data-open", "true");
    bookingPanel.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";

    if (roomKey && formuleSelect && ROOM_TO_OPTION_VALUE[roomKey]) {
      formuleSelect.value = ROOM_TO_OPTION_VALUE[roomKey];
    }

    // Place le focus sur le premier champ du formulaire pour l'accessibilité
    var firstField = qs("#client-nom");
    if (firstField) { firstField.focus(); }
  };

  var closeBooking = function () {
    if (!bookingPanel) return;
    bookingPanel.removeAttribute("data-open");
    bookingPanel.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
    if (lastFocusedEl) { lastFocusedEl.focus(); }
  };

  openTriggers.forEach(function (trigger) {
    trigger.addEventListener("click", function (e) {
      e.preventDefault();
      openBooking(trigger.getAttribute("data-room"));
    });
  });

  closeTriggers.forEach(function (trigger) {
    trigger.addEventListener("click", closeBooking);
  });

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && bookingPanel && bookingPanel.hasAttribute("data-open")) {
      closeBooking();
    }
  });

  /* -------------------------------------------------------------------
     6. MOTEUR DE RÉSERVATION — GÉNÉRATION DU MESSAGE WHATSAPP
     ------------------------------------------------------------------- */
  var WHATSAPP_NUMBER = "225050151030957"; // 05 04 80 07 33, format international sans le +

  var bookingForm = qs("#booking-form");

  var formatDateFR = function (isoDate) {
    if (!isoDate) return "";
    var parts = isoDate.split("-"); // AAAA-MM-JJ
    if (parts.length !== 3) return isoDate;
    return parts[2] + "/" + parts[1] + "/" + parts[0];
  };

  if (bookingForm) {
    bookingForm.addEventListener("submit", function (e) {
      e.preventDefault();

      var nom = qs("#client-nom").value.trim();
      var telephone = qs("#client-tel").value.trim();
      var formule = qs("#client-formule").value;
      var arrivee = formatDateFR(qs("#date-arrivee").value);
      var depart = formatDateFR(qs("#date-depart").value);

      if (!nom || !telephone || !formule || !arrivee || !depart) {
        bookingForm.reportValidity();
        return;
      }

      var message =
        "Bonjour Miawa Hôtel Yamoussoukro, je souhaite réserver depuis le site web :\n\n" +
        "Nom : " + nom + "\n" +
        "Contact : " + telephone + "\n" +
        "Formule choisie : " + formule + "\n" +
        "Dates du séjour : Du " + arrivee + " au " + depart + "\n\n" +
        "Merci de me confirmer la disponibilité pour finaliser !";

      var whatsappUrl =
        "https://wa.me/" + WHATSAPP_NUMBER + "?text=" + encodeURIComponent(message);

      window.open(whatsappUrl, "_blank", "noopener,noreferrer");

      bookingForm.reset();
      closeBooking();
    });
  }
})();