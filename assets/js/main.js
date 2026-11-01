/* ==========================================================================
   Tema Coast Clearing & Forwarding — demo build
   main.js — mobile nav + container-number validation
   No dependencies.
   ========================================================================== */
(function () {
  "use strict";

  /* ---------------- Mobile navigation ---------------- */
  function initNav() {
    var toggle = document.querySelector(".nav-toggle");
    var nav = document.getElementById("primary-nav");
    if (!toggle || !nav) return;

    toggle.addEventListener("click", function () {
      var open = nav.classList.toggle("open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    });

    // Close the menu when a link is chosen (small screens)
    nav.addEventListener("click", function (e) {
      if (e.target.tagName === "A" && window.innerWidth <= 780) {
        nav.classList.remove("open");
        toggle.setAttribute("aria-expanded", "false");
      }
    });
  }

  /* ---------------- ISO 6346 container number validation ----------------
     Format: 4 letters (3-letter owner code + equipment category) + 6 digits
             + 1 check digit  →  e.g. MSCU 123456 7

     Letter values skip multiples of 11:
       A=10 B=12 C=13 D=14 E=15 F=16 G=17 H=18 I=19 J=20 K=21
       L=23 M=24 N=25 O=26 P=27 Q=28 R=29 S=30 T=31 U=32 V=34 W=35 X=36 Y=37 Z=38
     Weights: 2^0 … 2^9
     Check digit = (sum of value × weight) mod 11, with 10 → 0
  ---------------------------------------------------------------------- */

  function letterValue(ch) {
    // Walk the value sequence 10,12,13,…38 counting letters, skipping every
    // multiple of 11 (11, 22, 33). Explicit and easy to verify:
    //   A=10  B=12 … K=21  L=23 … U=32  V=34 … Z=38
    var code = ch.charCodeAt(0) - 64;      // A=1 … Z=26
    var count = 0;
    var value = 10;
    for (;;) {
      if (value % 11 !== 0) {
        count++;
        if (count === code) return value;
      }
      value++;
    }
  }

  function normalise(raw) {
    return (raw || "").toUpperCase().replace(/[\s-]/g, "");
  }

  function validateContainer(raw) {
    var s = normalise(raw);
    var result = { input: s, format: false, checkDigit: false, valid: false };

    if (!s) {
      result.message = "Please enter a container number.";
      return result;
    }
    if (!/^[A-Z]{4}[0-9]{7}$/.test(s)) {
      result.message =
        "That does not look like a container number. The format is 4 letters " +
        "followed by 7 digits — for example CSQU3054383.";
      return result;
    }
    result.format = true;

    var sum = 0;
    for (var i = 0; i < 10; i++) {
      var ch = s.charAt(i);
      var value = i < 4 ? letterValue(ch) : parseInt(ch, 10);
      sum += value * Math.pow(2, i);
    }
    var expected = sum % 11;
    if (expected === 10) expected = 0;

    var actual = parseInt(s.charAt(10), 10);
    result.expected = expected;
    result.actual = actual;
    result.checkDigit = expected === actual;
    result.valid = result.format && result.checkDigit;
    result.owner = s.slice(0, 3);
    result.category = s.charAt(3);

    result.message = result.valid
      ? "Valid container number — check digit verified."
      : "The check digit does not match. Expected " + expected +
        " but the number ends in " + actual + ". Please re-check it.";

    return result;
  }

  var CATEGORY = {
    U: "Freight container",
    J: "Detachable equipment",
    Z: "Trailer / chassis"
  };

  /* Carrier routing by 3-letter owner prefix — mirrors the agency's tracking
     engine rule (the ISO 6346 prefix identifies the operator).
     DEMO table only: a small sample to show the mechanism. The production
     engine keeps the full prefix list in one place for every client. */
  var OWNER_ROUTES = {
    MAE: "Maersk Line",
    MSC: "MSC",
    CMA: "CMA CGM",
    CMD: "CMA CGM",
    HLX: "Hapag-Lloyd",
    HLC: "Hapag-Lloyd",
    GRI: "Grimaldi Lines",
    GRM: "Grimaldi Lines"
  };

  function routeFor(owner) {
    return OWNER_ROUTES[owner] || null;
  }

  /* ---------------- Tracking widget ---------------- */
  function initTracking() {
    var form = document.getElementById("track-form");
    if (!form) return;

    var input = document.getElementById("container-number");
    var out = document.getElementById("track-result");

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var res = validateContainer(input.value);

      if (!res.valid) {
        out.innerHTML =
          '<div class="msg err"><strong>Cannot look this up.</strong><br>' +
          escapeHtml(res.message) + "</div>";
        return;
      }

      var carrier = routeFor(res.owner);
      out.innerHTML =
        '<div class="msg ok"><strong>Container number accepted.</strong> ' +
        escapeHtml(res.message) + "</div>" +
        '<dl>' +
        "<dt>Container</dt><dd>" + escapeHtml(res.input) + "</dd>" +
        "<dt>Owner prefix</dt><dd>" + escapeHtml(res.owner) + "</dd>" +
        "<dt>Type</dt><dd>" + escapeHtml(CATEGORY[res.category] || "Unknown") + "</dd>" +
        "<dt>Likely carrier</dt><dd>" +
          (carrier ? escapeHtml(carrier) : "Not in the demo routing table") + "</dd>" +
        "</dl>" +
        '<p class="track-demo-note" style="margin:14px 0 0;font-size:.85rem;color:#5a6b7b">' +
        "<strong>Demo:</strong> live vessel and port status is not connected in this " +
        "demonstration build. In production this panel shows the container's current " +
        "location, vessel and estimated arrival, pulled from the carrier." +
        "</p>";
    });

    // Re-validate as the user types, quietly
    input.addEventListener("input", function () {
      if (input.value.length >= 11) {
        var res = validateContainer(input.value);
        input.setAttribute("aria-invalid", res.valid ? "false" : "true");
      } else {
        input.removeAttribute("aria-invalid");
      }
    });
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  /* ---------------- Quote form (demo only) ---------------- */
  function initQuoteForm() {
    var form = document.getElementById("quote-form");
    if (!form) return;

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var status = document.getElementById("quote-status");
      var name = form.querySelector('[name="name"]');
      status.innerHTML =
        '<div class="msg ok"><strong>Thanks' +
        (name && name.value ? ", " + escapeHtml(name.value.split(" ")[0]) : "") +
        ".</strong><br>This is a demonstration build, so the enquiry was not actually " +
        "sent. On a live site it would arrive by email and WhatsApp immediately.</div>";
      status.style.display = "block";
      form.reset();
    });
  }

  /* ---------------- Year stamp ---------------- */
  function initYear() {
    var els = document.querySelectorAll("[data-year]");
    var y = new Date().getFullYear();
    for (var i = 0; i < els.length; i++) els[i].textContent = y;
  }

  document.addEventListener("DOMContentLoaded", function () {
    initNav();
    initTracking();
    initQuoteForm();
    initYear();
  });

  // Expose for the built-in self-test
  window.__containerCheck = validateContainer;
})();
