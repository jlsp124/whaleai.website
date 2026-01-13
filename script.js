(() => {
  const cfg = window.WHALEAI_CONFIG || {};
  const defaults = {
    WEBSITE_BASE_URL: window.location.origin,
    WORKER_API_BASE_URL: "",
    TELEGRAM_URL: "",
    DONATE_SOL_ADDRESS: "",
    SUPPORT_EMAIL: "",
    GITHUB_URL: "",
    QR_IMAGE_BASE_URL: "https://api.qrserver.com/v1/create-qr-code/"
  };

  function getCfg(key) {
    const v = cfg[key];
    return (v === undefined || v === null || v === "") ? defaults[key] : v;
  }

  function isPlaceholder(value) {
    if (!value) return true;
    return String(value).includes("YOUR_") || String(value).includes("REPLACE_");
  }

  function normalizeUrl(value) {
    if (!value) return "";
    return String(value).replace(/\/$/, "");
  }

  function applyConfig() {
    const support = getCfg("SUPPORT_EMAIL");
    const supportHref = support && support.includes("@");

    document.querySelectorAll("[data-config-href]").forEach((el) => {
      const key = el.getAttribute("data-config-href");
      let value = getCfg(key.toUpperCase());
      if (key === "support_email") {
        value = supportHref ? `mailto:${support}` : "";
      }
      if (!value || isPlaceholder(value)) {
        el.classList.add("muted");
        el.setAttribute("href", "#");
        el.setAttribute("title", `Missing ${key}`);
        console.warn(`Missing config for ${key}`);
      } else {
        el.setAttribute("href", value);
      }
    });

    document.querySelectorAll("[data-config-text]").forEach((el) => {
      const key = el.getAttribute("data-config-text");
      const value = getCfg(key.toUpperCase());
      if (!value || isPlaceholder(value)) {
        el.textContent = "--";
        console.warn(`Missing config for ${key}`);
      } else {
        el.textContent = value;
      }
    });
  }

  function setupNav() {
    const nav = document.querySelector("[data-nav]");
    const toggle = document.querySelector("[data-nav-toggle]");
    if (!nav || !toggle) return;
    toggle.addEventListener("click", () => nav.classList.toggle("open"));
  }

  function setupReveal() {
    const items = document.querySelectorAll(".reveal");
    if (!items.length) return;
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("visible");
            obs.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.2 }
    );
    items.forEach((item) => obs.observe(item));
  }

  async function fetchCounts() {
    const apiBase = normalizeUrl(getCfg("WORKER_API_BASE_URL"));
    if (!apiBase || isPlaceholder(apiBase)) {
      console.warn("WORKER_API_BASE_URL not set for waitlist counts");
      return;
    }
    try {
      const res = await fetch(`${apiBase}/api/waitlist/count`);
      const data = await res.json();
      const total = data.total_count || 0;
      const today = data.today_count || 0;
      const byDay = Array.isArray(data.counts_by_day) ? data.counts_by_day : [];
      const week = byDay.reduce((sum, d) => sum + (d.count || 0), 0);

      document.querySelectorAll("[data-waitlist-count]").forEach((el) => (el.textContent = total));
      document.querySelectorAll("[data-waitlist-today]").forEach((el) => (el.textContent = today));
      document.querySelectorAll("[data-waitlist-week]").forEach((el) => (el.textContent = week));
    } catch (e) {
      console.warn("Failed to fetch waitlist counts", e);
    }
  }

  function validateTelegram(username) {
    const cleaned = username.replace(/^@/, "").trim();
    if (!cleaned) return null;
    if (!/^[a-zA-Z0-9_]{5,32}$/.test(cleaned)) return null;
    return cleaned;
  }

  function getReferralLink(refCode) {
    let base = normalizeUrl(getCfg("WEBSITE_BASE_URL")) || window.location.origin;
    if (isPlaceholder(base)) {
      base = window.location.origin;
    }
    return `${base}/waitlist.html?ref=${encodeURIComponent(refCode)}`;
  }

  function setupWaitlistForm() {
    const form = document.getElementById("waitlist-form");
    if (!form) return;
    const apiBase = normalizeUrl(getCfg("WORKER_API_BASE_URL"));
    const msg = document.getElementById("waitlist-message");
    const success = document.getElementById("waitlist-success");
    const refField = document.getElementById("ref");

    const qs = new URLSearchParams(window.location.search);
    const ref = qs.get("ref");
    if (refField) refField.value = ref || "";

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (!apiBase || isPlaceholder(apiBase)) {
        msg.textContent = "Waitlist backend is not configured.";
        return;
      }

      const telegram = validateTelegram(form.telegram.value || "");
      if (!telegram) {
        msg.textContent = "Please enter a valid Telegram username.";
        return;
      }
      const honeypot = form.hp ? form.hp.value : "";
      if (honeypot) {
        msg.textContent = "Submission blocked.";
        return;
      }

      msg.textContent = "Submitting...";
      const payload = {
        telegram_username: telegram,
        email: form.email.value || "",
        ref: form.ref.value || "",
        hear_about: form.source.value || ""
      };

      try {
        const res = await fetch(`${apiBase}/api/waitlist/submit`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (!res.ok || !data.ok) {
          msg.textContent = data.message || "Unable to submit. Try again later.";
          return;
        }

        form.style.display = "none";
        if (success) success.style.display = "block";

        const refCode = data.ref_code_assigned || data.ref_code || "";
        const link = refCode ? getReferralLink(refCode) : "";
        const linkEl = document.querySelector("[data-ref-link]");
        if (linkEl) linkEl.textContent = link || "Your referral link will appear here.";
        const copyBtn = document.querySelector("[data-copy-ref]");
        if (copyBtn && link) {
          copyBtn.addEventListener("click", async () => {
            await navigator.clipboard.writeText(link);
            copyBtn.textContent = "Copied";
            setTimeout(() => (copyBtn.textContent = "Copy referral link"), 1200);
          });
        }
        msg.textContent = data.duplicate ? "You are already on the waitlist." : "You are in.";
        fetchCounts();
      } catch (e) {
        msg.textContent = "Submission failed. Please try again.";
      }
    });
  }

  function setupDonate() {
    const addressEl = document.querySelector("[data-donate-address]");
    const linkEl = document.querySelector("[data-donate-link]");
    const urlEl = document.querySelector("[data-donate-url]");
    const qrEl = document.getElementById("donate-qr");
    if (!addressEl || !linkEl) return;

    const address = getCfg("DONATE_SOL_ADDRESS");
    if (!address || isPlaceholder(address)) {
      addressEl.textContent = "Donation address not set.";
      linkEl.setAttribute("href", "#");
      console.warn("DONATE_SOL_ADDRESS not set");
      return;
    }
    addressEl.textContent = address;

    const amountButtons = document.querySelectorAll("[data-donate-amount]");
    const customInput = document.getElementById("donate-custom");

    function buildUrl(amount) {
      const label = encodeURIComponent("Whale AI");
      const message = encodeURIComponent("Support Whale AI development");
      const amt = amount ? `amount=${amount}` : "";
      const qs = [amt, `label=${label}`, `message=${message}`].filter(Boolean).join("&");
      return `solana:${address}?${qs}`;
    }

    function update(amount) {
      const value = amount || (customInput ? customInput.value : "");
      const clean = value ? Number(value) : "";
      const amountStr = clean && !Number.isNaN(clean) ? clean.toString() : "";
      const url = buildUrl(amountStr);
      linkEl.setAttribute("href", url);
      if (urlEl) urlEl.textContent = url;

      if (qrEl) {
        const qrBase = normalizeUrl(getCfg("QR_IMAGE_BASE_URL"));
        if (!qrBase || isPlaceholder(qrBase)) {
          qrEl.style.display = "none";
          return;
        }
        const qrUrl = `${qrBase}?size=220x220&data=${encodeURIComponent(url)}`;
        qrEl.setAttribute("src", qrUrl);
      }
    }

    amountButtons.forEach((btn) => {
      btn.addEventListener("click", () => {
        if (customInput) customInput.value = "";
        update(btn.getAttribute("data-donate-amount"));
      });
    });

    if (customInput) {
      customInput.addEventListener("input", () => update(customInput.value));
    }

    update("0.01");

    const copyBtn = document.querySelector("[data-copy-address]");
    if (copyBtn) {
      copyBtn.addEventListener("click", async () => {
        await navigator.clipboard.writeText(address);
        copyBtn.textContent = "Copied";
        setTimeout(() => (copyBtn.textContent = "Copy address"), 1200);
      });
    }
  }

  function setupCopies() {
    document.querySelectorAll("[data-copy-text]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const text = btn.getAttribute("data-copy-text");
        if (!text) return;
        await navigator.clipboard.writeText(text);
        btn.textContent = "Copied";
        setTimeout(() => (btn.textContent = "Copy"), 1200);
      });
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    applyConfig();
    setupNav();
    setupReveal();
    fetchCounts();
    setupWaitlistForm();
    setupDonate();
    setupCopies();
  });
})();
