/* CareerPilot — modular GSAP storytelling, accessible educational tabs */
(function () {
  "use strict";
  const $ = (s, root=document) => root.querySelector(s);
  const $$ = (s, root=document) => Array.from(root.querySelectorAll(s));
  const header = $("#site-header");
  const menu = $("#menu-toggle");
  const mobileNav = $("#mobile-nav");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  let animationContext = null;
  let gsapMedia = null;

  function menuState(open) {
    if (!menu || !mobileNav) return;
    mobileNav.hidden = !open;
    menu.setAttribute("aria-expanded", String(open));
    menu.setAttribute("aria-label", open ? "Close navigation" : "Open navigation");
  }

  if (menu && mobileNav) {
    menuState(false);
    menu.addEventListener("click", () => menuState(mobileNav.hidden));
    mobileNav.addEventListener("click", (event) => {
      if (event.target.closest("a")) menuState(false);
    });
    document.addEventListener("keydown", event => {
      if (event.key === "Escape" && !mobileNav.hidden) {
        menuState(false);
        menu.focus();
      }
    });
    document.addEventListener("click", event => {
      if (!mobileNav.hidden && !mobileNav.contains(event.target) && !menu.contains(event.target)) menuState(false);
    });
    window.addEventListener("resize", () => {
      if (window.innerWidth > 960) menuState(false);
    });
  }

  const onScroll = () => header?.classList.toggle("scrolled", window.scrollY > 12);
  onScroll();
  addEventListener("scroll", onScroll, { passive: true });

  const tabs = $$('[role="tab"][data-panel]');
  const panels = $$('.cp-showcase-panel[role="tabpanel"]');
  function selectTab(tab, focus = false) {
    tabs.forEach(item => {
      const active = item === tab;
      item.classList.toggle("active", active);
      item.setAttribute("aria-selected", String(active));
      item.tabIndex = active ? 0 : -1;
    });
    panels.forEach(panel => panel.hidden = panel.id !== "panel-" + tab.dataset.panel);
    if (focus) tab.focus();
    if (!reduceMotion.matches && window.gsap) {
      const panel = $("#panel-" + tab.dataset.panel);
      window.gsap.fromTo(panel, { y: 10, opacity: .55 }, { y: 0, opacity: 1, duration: .42, ease: "power2.out", overwrite: true });
    }
  }
  tabs.forEach((tab, i) => {
    tab.addEventListener("click", () => selectTab(tab));
    tab.addEventListener("keydown", (event) => {
      if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End"].includes(event.key)) return;
      event.preventDefault();
      const next = event.key === "Home" ? 0 : event.key === "End" ? tabs.length - 1 : (i + (["ArrowRight", "ArrowDown"].includes(event.key) ? 1 : -1) + tabs.length) % tabs.length;
      selectTab(tabs[next], true);
    });
  });
  if (tabs[0]) selectTab(tabs[0]);

  function playAnimations() {
    if (!window.gsap || !window.ScrollTrigger || reduceMotion.matches) return;
    const gsap = window.gsap;
    const ST = window.ScrollTrigger;
    gsap.registerPlugin(ST);
    gsap.config({ nullTargetWarn: false });
    const mm = gsap.matchMedia();
    gsapMedia = mm;
    mm.add("(min-width: 701px) and (prefers-reduced-motion: no-preference)", () => {
      const animate = (targets, from, settings) => {
        if (!$$(targets).length) return;
        gsap.from(targets, { ...from, ...settings, immediateRender: false, scrollTrigger: { trigger: settings.trigger || targets, start: settings.start || "top 86%", once: true, ...(settings.scrollTrigger || {}) } });
      };

      // Hero — individual UI elements assemble into a finished report.
      gsap.timeline({ defaults: { ease: "power3.out" } })
        .from(".cp-hero-eyebrow", { y: 14, autoAlpha: 0, duration: .6 })
        .from(".cp-hero h1", { y: 48, autoAlpha: 0, duration: .85 }, "-=.3")
        .from(".cp-hero-sub, .cp-hero-desc", { y: 19, autoAlpha: 0, duration: .55, stagger: .13 }, "-=.53")
        .from(".cp-hero-actions, .cp-hero-note", { y: 15, autoAlpha: 0, duration: .47, stagger: .10 }, "-=.35")
        .from(".cp-hero-stage", { x: 42, rotateY: -5, autoAlpha: 0, duration: 1 }, "-=.93")
        .from(".cp-product-toolbar, .cp-product-sidebar", { autoAlpha: 0, duration: .3, stagger: .07 }, "-=.39")
        .from(".cp-product-header, .cp-report-summary", { y: 14, autoAlpha: 0, duration: .33, stagger: .12 }, "-=.23")
        .from(".cp-analysis-row", { y: 12, autoAlpha: 0, duration: .36, stagger: .085 }, "-=.12");

      // Problem — sweeping underline then three progressively staged ideas.
      animate(".cp-problem .cp-display-heading", { y: 37, opacity: 0 }, { trigger: ".cp-problem", duration: .85 });
      animate(".cp-problem-aside", { x: 28, opacity: 0 }, { trigger: ".cp-problem", duration: .7, delay: .15 });
      gsap.from(".cp-problem-rail article", {
        y: 44, autoAlpha: 0, stagger: .17, duration: .8, ease: "power2.out",
        scrollTrigger: { trigger: ".cp-problem-rail", start: "top 80%", once: true }
      });

      // Product experience — restrained clipping reveal, tab list sliding in from the opposite side.
      gsap.from(".cp-showcase", {
        clipPath: "inset(9% 0 9% 0)", opacity: .65, duration: 1.1, ease: "power3.out",
        scrollTrigger: { trigger: ".cp-showcase", start: "top 87%", once: true }
      });
      // Keep keyboard-focusable tabs visible at all times.
      // Delayed ScrollTrigger visibility changes can otherwise hide controls
      // while their interactive state is already available.

      // Steps — three columns travel in with progressive offsets.
      gsap.from(".cp-process-step", {
        y: (i) => 54 + i * 17, opacity: 0, stagger: .16, duration: .8, ease: "power3.out",
        scrollTrigger: { trigger: ".cp-process-steps", start: "top 82%", once: true }
      });
      // Before / after — opposing horizontal motions reinforce the copy transformation.
      gsap.from(".cp-example-col:first-child", {
        x: -48, autoAlpha: 0, duration: .85, ease: "power2.out",
        scrollTrigger: { trigger: ".cp-example-comparison", start: "top 82%", once: true }
      });
      gsap.from(".cp-example-after", {
        x: 48, autoAlpha: 0, duration: .85, delay: .14, ease: "power2.out",
        scrollTrigger: { trigger: ".cp-example-comparison", start: "top 82%", once: true }
      });

      // Deliverables — each horizontal divider sweeps forward.
      gsap.from(".cp-deliverable", {
        x: 45, opacity: 0, stagger: .11, duration: .68, ease: "power2.out",
        scrollTrigger: { trigger: ".cp-deliverables-list", start: "top 80%", once: true }
      });

      // Technology — visual and copy approach from opposite directions.
      gsap.from(".cp-tech-text", {
        x: -35, opacity: 0, duration: .9,
        scrollTrigger: { trigger: ".cp-technology", start: "top 80%", once: true }
      });
      gsap.from(".cp-tech-visual", {
        scale: .94, rotation: 1, opacity: 0, duration: 1.05, ease: "power3.out",
        scrollTrigger: { trigger: ".cp-tech-visual", start: "top 85%", once: true }
      });
      // Privacy — grounded reveal rather than a heavy graphic.
      gsap.from(".cp-trust-panel li", {
        x: 14, autoAlpha: 0, stagger: .11, duration: .55,
        scrollTrigger: { trigger: ".cp-trust-panel", start: "top 84%", once: true }
      });
      // Pricing — scale is modest to preserve readability.
      gsap.from(".cp-price-card", {
        y: 40, scale: .96, autoAlpha: 0, duration: .9, ease: "power3.out",
        scrollTrigger: { trigger: ".cp-pricing", start: "top 82%", once: true }
      });
      // FAQ — border rhythm.
      gsap.from(".cp-faq-list details", {
        y: 18, autoAlpha: 0, stagger: .08, duration: .42,
        scrollTrigger: { trigger: ".cp-faq-list", start: "top 85%", once: true }
      });
      gsap.from(".cp-final-content", {
        y: 50, autoAlpha: 0, duration: 1.0,
        scrollTrigger: { trigger: ".cp-final", start: "top 80%", once: true }
      });
    });
    mm.add("(max-width: 700px) and (prefers-reduced-motion: no-preference)", () => {
      // Mobile keeps the visual narrative but avoids long timelines and 3D movement.
      gsap.from(".cp-hero-copy > *", { opacity: 0, y: 16, stagger: .075, duration: .43, ease: "power2.out" });
      const sections = $$(".cp-section");
      sections.forEach(section => {
        const label = $(".cp-section-label", section);
        if (!label) return;
        gsap.from(label, {
          opacity: 0, x: -14, duration: .5,
          scrollTrigger: { trigger: section, start: "top 93%", once: true }
        });
      });
    });
    ST.refresh();
  }

  function resetMotion() {
    if (gsapMedia) {
      gsapMedia.revert();
      gsapMedia = null;
    }
  }

  if (document.readyState === "complete") playAnimations();
  else window.addEventListener("load", playAnimations, { once: true });

  if (typeof reduceMotion.addEventListener === "function") {
    reduceMotion.addEventListener("change", () => {
      resetMotion();
      if (!reduceMotion.matches) playAnimations();
    });
  }

  window.addEventListener("pagehide", resetMotion);
})();