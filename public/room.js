const root = document.querySelector("[data-room-root]");
const roomId = root?.dataset.roomId ?? "";
const read = (key) => {
  try {
    const value = JSON.parse(localStorage.getItem(key) ?? "[]");
    return Array.isArray(value) ? value.filter((item) => typeof item === "string") : [];
  } catch {
    return [];
  }
};
const write = (key, values) => localStorage.setItem(key, JSON.stringify(values));
void window.oyakoMadori?.sendEvent("room_opened", roomId);
document.querySelector("[data-source-open]")?.addEventListener("click", () => {
  void window.oyakoMadori?.sendEvent("source_opened", roomId);
});
const favoriteButton = document.querySelector("[data-favorite]");
const renderFavorite = () => {
  favoriteButton.textContent = read("oyako-madori-favorites").includes(roomId)
    ? "お気に入りから外す"
    : "お気に入りに入れる";
};
favoriteButton?.addEventListener("click", () => {
  const values = read("oyako-madori-favorites");
  const removing = values.includes(roomId);
  write(
    "oyako-madori-favorites",
    removing ? values.filter((value) => value !== roomId) : [...values, roomId],
  );
  void window.oyakoMadori?.sendEvent(removing ? "favorite_removed" : "favorite_added", roomId);
  renderFavorite();
});
const compareButton = document.querySelector("[data-compare]");
const renderCompare = () => {
  compareButton.textContent = read("oyako-madori-compare").includes(roomId)
    ? "比較候補から外す"
    : "比較候補に入れる";
};
compareButton?.addEventListener("click", () => {
  const values = read("oyako-madori-compare");
  const removing = values.includes(roomId);
  if (!removing && values.length >= 3) {
    document.querySelector("[data-action-state]").textContent = "比較できるのは3件までです。";
    return;
  }
  write(
    "oyako-madori-compare",
    removing ? values.filter((value) => value !== roomId) : [...values, roomId],
  );
  document.querySelector("[data-action-state]").textContent = removing
    ? "比較候補から外しました。"
    : "比較候補に入れました。";
  renderCompare();
});
renderFavorite();
renderCompare();
