(() => {
  const cfg = window.WHALEAI_CONFIG || {};
  const hasConfig = !!window.WHALEAI_CONFIG;
  let loggedApi = false;
  const defaults = {
    SITE_BASE_URL: window.location.origin,
    WORKER_API_BASE_URL: "",
    TELEGRAM_COMMUNITY_URL: "",
    DONATE_SOL_ADDRESS: "",
    SUPPORT_EMAIL: "",
    GITHUB_URL: "",
    QR_IMAGE_BASE_URL: "https://api.qrserver.com/v1/create-qr-code/"
  };

  const aliases = {
    SITE_BASE_URL: ["WEBSITE_BASE_URL"],
    TELEGRAM_COMMUNITY_URL: ["TELEGRAM_URL"]
  };

  function getCfg(key) {
    let value = cfg[key];
    if (value === undefined || value === null || value === "") {
      const alt = aliases[key] || [];
      for (const altKey of alt) {
        if (cfg[altKey]) {
          value = cfg[altKey];
          break;
        }
      }
    }
    return (value === undefined || value === null || value === "") ? defaults[key] : value;
  }

  function isPlaceholder(value) {
    if (!value) return true;
    const str = String(value);
    return str.includes("YOUR_") || str.includes("REPLACE_") || str.includes("FILL_ME");
  }

  function normalizeUrl(value) {
    if (!value) return "";
    return String(value).replace(/\/$/, "");
  }

  function getApiOverride() {
    const qs = new URLSearchParams(window.location.search);
    const api = qs.get("api") || "";
    return normalizeUrl(api);
  }

  function getApiBase() {
    const override = getApiOverride();
    if (override) {
      if (!loggedApi) {
        console.info("WHALEAI_CONFIG loaded:", hasConfig);
        console.info("WORKER_API_BASE_URL override:", override);
        loggedApi = true;
      }
      return { base: override, hasOverride: true };
    }
    const base = normalizeUrl(getCfg("WORKER_API_BASE_URL"));
    if (!loggedApi) {
      console.info("WHALEAI_CONFIG loaded:", hasConfig);
      console.info("WORKER_API_BASE_URL:", base || "(empty)");
      loggedApi = true;
    }
    return { base, hasOverride: false };
  }

  function resolveConfigKey(key) {
    return key.toUpperCase();
  }

  function applyConfig() {
    const support = getCfg("SUPPORT_EMAIL");
    const supportHref = support && support.includes("@");

    document.querySelectorAll("[data-config-href]").forEach((el) => {
      const key = resolveConfigKey(el.getAttribute("data-config-href"));
      let value = getCfg(key);
      if (key === "SUPPORT_EMAIL") {
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
      const key = resolveConfigKey(el.getAttribute("data-config-text"));
      const value = getCfg(key);
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
    const { base: apiBase, hasOverride } = getApiBase();
    if (!apiBase || (!hasOverride && isPlaceholder(apiBase))) {
      document.querySelectorAll("[data-waitlist-count]").forEach((el) => (el.textContent = "—"));
      document.querySelectorAll("[data-waitlist-today]").forEach((el) => (el.textContent = "—"));
      document.querySelectorAll("[data-waitlist-week]").forEach((el) => (el.textContent = "—"));
      console.warn("WORKER_API_BASE_URL not set for waitlist counts");
      return;
    }
    try {
      const res = await fetch(`${apiBase}/api/waitlist/count`);
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Count error");
      const total = data.total_count || 0;
      const today = data.today_count || 0;
      const byDay = Array.isArray(data.counts_by_day_last_7) ? data.counts_by_day_last_7 : [];
      const week = byDay.reduce((sum, d) => sum + (d.count || 0), 0);

      document.querySelectorAll("[data-waitlist-count]").forEach((el) => (el.textContent = total));
      document.querySelectorAll("[data-waitlist-today]").forEach((el) => (el.textContent = today));
      document.querySelectorAll("[data-waitlist-week]").forEach((el) => (el.textContent = week));
    } catch (e) {
      console.warn("Failed to fetch waitlist counts", e);
    }
  }

  function validateTelegram(username) {
    const cleaned = String(username || "").replace(/^@/, "").trim();
    if (!cleaned) return null;
    if (!/^[a-zA-Z0-9_]{3,32}$/.test(cleaned)) return null;
    return cleaned;
  }

  function getReferralLink(refCode) {
    let base = normalizeUrl(getCfg("SITE_BASE_URL")) || window.location.origin;
    if (isPlaceholder(base)) {
      base = window.location.origin;
    }
    return `${base}/waitlist.html?ref=${encodeURIComponent(refCode)}`;
  }

  function setupWaitlistForm() {
    const form = document.getElementById("waitlist-form");
    if (!form) return;
    const msg = document.getElementById("waitlist-message");
    const success = document.getElementById("waitlist-success");
    const refField = document.getElementById("ref");
    const submitBtn = form.querySelector("button[type='submit']");

    const qs = new URLSearchParams(window.location.search);
    const ref = qs.get("ref");
    if (refField) refField.value = ref || "";

    const { base: apiBase, hasOverride } = getApiBase();
    const apiMissing = !apiBase || (!hasOverride && isPlaceholder(apiBase));
    if (apiMissing && submitBtn) {
      submitBtn.disabled = true;
      msg.textContent = "Backend not configured. Set WORKER_API_BASE_URL or use ?api=...";
    }

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (apiMissing) {
        msg.textContent = "Waitlist backend is not configured.";
        return;
      }

      const telegram = validateTelegram(form.telegram.value || "");
      if (!telegram) {
        msg.textContent = "Please enter a valid Telegram username.";
        return;
      }
      const honeypot = form.honeypot ? form.honeypot.value : "";
      if (honeypot) {
        msg.textContent = "Submission blocked.";
        return;
      }

      msg.textContent = "Submitting...";
      const payload = {
        telegram_username: telegram,
        email: form.email.value || "",
        ref: form.ref.value || "",
        heard_about: form.source.value || "",
        honeypot: honeypot
      };

      try {
        const res = await fetch(`${apiBase}/api/waitlist/submit`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (!res.ok || !data.ok) {
          msg.textContent = data.error || "Unable to submit. Try again later.";
          return;
        }

        form.style.display = "none";
        if (success) success.style.display = "block";

        const refCode = data.assigned_ref || "";
        const link = data.referral_link || (refCode ? getReferralLink(refCode) : "");
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
        msg.textContent = data.already_joined ? "You are already on the waitlist." : "You are in.";

        document.querySelectorAll("[data-waitlist-count]").forEach((el) => (el.textContent = data.total_count || 0));
        document.querySelectorAll("[data-waitlist-today]").forEach((el) => (el.textContent = data.today_count || 0));
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
    const copyLinkBtn = document.querySelector("[data-copy-paylink]");
    const helpEl = document.querySelector("[data-donate-help]");
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

    function buildUrls(amount) {
      const label = encodeURIComponent("Whale AI");
      const message = encodeURIComponent("Support Whale AI development");
      const amt = amount ? `amount=${amount}` : "";
      const qs = [amt, `label=${label}`, `message=${message}`].filter(Boolean).join("&");
      const deepLink = `solana:${address}?${qs}`;
      const webLink = `https://solana.com/pay/${address}${qs ? `?${qs}` : ""}`;
      return { deepLink, webLink };
    }

    function update(amount) {
      const value = amount || (customInput ? customInput.value : "");
      const clean = value ? Number(value) : "";
      const amountStr = clean && !Number.isNaN(clean) ? clean.toString() : "";
      const { deepLink, webLink } = buildUrls(amountStr);
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent || "");
      linkEl.setAttribute("href", isMobile ? deepLink : webLink);
      linkEl.setAttribute("target", isMobile ? "_self" : "_blank");
      if (urlEl) urlEl.textContent = webLink;
      if (helpEl) {
        helpEl.textContent = isMobile
          ? "Opens directly in wallet on mobile."
          : "On desktop, scan the QR or copy the payment link.";
      }
      if (copyLinkBtn) {
        copyLinkBtn.onclick = async () => {
          await navigator.clipboard.writeText(webLink);
          copyLinkBtn.textContent = "Copied";
          setTimeout(() => (copyLinkBtn.textContent = "Copy payment link"), 1200);
        };
      }

      if (qrEl) {
        const qrBase = normalizeUrl(getCfg("QR_IMAGE_BASE_URL"));
        if (!qrBase || isPlaceholder(qrBase)) {
          qrEl.style.display = "none";
          return;
        }
        const qrUrl = `${qrBase}?size=220x220&data=${encodeURIComponent(webLink)}`;
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
