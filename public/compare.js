const root = document.querySelector("[data-compare-root]");
const grid = document.querySelector("[data-compare-grid]");
const empty = document.querySelector("[data-compare-empty]");
let rooms = [];
try {
  rooms = JSON.parse(root?.dataset.rooms ?? "[]");
} catch {
  rooms = [];
}
let ids = [];
try {
  const stored = JSON.parse(localStorage.getItem("oyako-madori-compare") ?? "[]");
  ids = Array.isArray(stored) ? stored.slice(0, 3) : [];
} catch {
  ids = [];
}
const featureLabels = {
  allGenders: "だれでも利用可",
  diaper: "おむつ交換",
  hotWater: "調乳用お湯",
  nursing: "授乳・搾乳",
  sink: "手洗い",
  stroller: "ベビーカー動線",
};
for (const room of rooms.filter((entry) => ids.includes(entry.id))) {
  const article = document.createElement("article");
  const heading = document.createElement("h2");
  const floor = document.createElement("p");
  const list = document.createElement("dl");
  heading.textContent = room.facility;
  floor.textContent = `${room.floor}｜${room.station}`;
  for (const [feature, label] of Object.entries(featureLabels)) {
    const row = document.createElement("div");
    const term = document.createElement("dt");
    const value = document.createElement("dd");
    term.textContent = label;
    value.textContent = room.features.includes(feature) ? "あり" : "要確認";
    row.append(term, value);
    list.append(row);
  }
  const link = document.createElement("a");
  link.href = `/rooms/${room.id}`;
  link.textContent = "間取りを見る";
  article.append(heading, floor, list, link);
  grid?.append(article);
}
const count = grid?.children.length ?? 0;
if (empty) empty.hidden = count > 0;
if (count > 0) void window.oyakoMadori?.sendEvent("compare_opened");
