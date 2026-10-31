
/* CareerPilot planner library: client-side search and category filtering */
(() => {
  const init = () => {
    const grid = document.getElementById("digital-planner-grid");
    if (!grid) return;
    const cards = Array.from(grid.querySelectorAll(".digital-planner-card"));
    const search = document.getElementById("planner-search");
    const count = document.getElementById("planner-result-count");
    const empty = document.getElementById("planner-no-results");
    const filters = Array.from(document.querySelectorAll("[data-planner-filter]"));
    let active = "all";
    const update = () => {
      const query = (search?.value || "").trim().toLowerCase();
      let visible = 0;
      cards.forEach(card => {
        const categoryMatch = active === "all" || card.dataset.category === active;
        const searchMatch = !query || (card.dataset.search || "").includes(query);
        const show = categoryMatch && searchMatch;
        card.hidden = !show;
        if (show) visible++;
      });
      if (count) count.textContent = visible === 1 ? "Showing 1 planner" : "Showing " + visible + " planners";
      if (empty) empty.hidden = visible !== 0;
    };
    filters.forEach(button => button.addEventListener("click", () => {
      active = button.dataset.plannerFilter || "all";
      filters.forEach(item => {
        const selected = item === button;
        item.classList.toggle("is-active", selected);
        item.setAttribute("aria-pressed", selected ? "true" : "false");
      });
      update();
    }));
    if (search) search.addEventListener("input", update);
    update();
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once:true });
  else init();
})();
