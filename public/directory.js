const query = new URL(location.href).search;
if (query.length > 1) void window.oyakoMadori?.sendEvent("directory_searched");
const favorites = new Set(JSON.parse(localStorage.getItem("oyako-madori-favorites") ?? "[]"));
const button = document.querySelector("[data-show-favorites]");
button?.addEventListener("click", () => {
  const active = button.getAttribute("aria-pressed") === "true";
  button.setAttribute("aria-pressed", String(!active));
  button.textContent = active ? "お気に入りだけ" : "すべて表示";
  for (const card of document.querySelectorAll("[data-room-card]")) {
    card.hidden = !active && !favorites.has(card.dataset.roomCard);
  }
});
