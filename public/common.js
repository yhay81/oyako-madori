const sessionKey = "oyako-madori-session";
const firstSeenKey = "oyako-madori-first-seen";
const lastSeenKey = "oyako-madori-last-seen";
const today = new Date().toISOString().slice(0, 10);
let sessionId = localStorage.getItem(sessionKey);
if (!sessionId || !/^[0-9a-f-]{36}$/i.test(sessionId)) {
  sessionId = crypto.randomUUID();
  localStorage.setItem(sessionKey, sessionId);
}
const sendEvent = async (name, roomId = "") => {
  try {
    await fetch("/api/events", {
      body: JSON.stringify({ name, roomId }),
      headers: {
        "content-type": "application/json",
        "x-oyako-madori-qa": new URL(location.href).searchParams.get("qa") === "1" ? "1" : "0",
        "x-oyako-madori-session": sessionId,
      },
      method: "POST",
    });
  } catch {
    // Measurement must never block the directory.
  }
};
const firstSeen = localStorage.getItem(firstSeenKey);
const lastSeen = localStorage.getItem(lastSeenKey);
if (!firstSeen) {
  localStorage.setItem(firstSeenKey, today);
  void sendEvent("visited");
} else if (lastSeen && lastSeen !== today) {
  void sendEvent("returned");
}
localStorage.setItem(lastSeenKey, today);
window.oyakoMadori = { sendEvent };
