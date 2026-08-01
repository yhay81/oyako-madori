import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { Miniflare } from "miniflare";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { app, eventNames, rooms, scheduled, type Bindings } from "../src/worker";

const pathOf = (relative: string) => fileURLToPath(new URL(relative, import.meta.url));
const origin = "https://oyako-madori.yhay81.com";
const session = "a2d0e2f2-66fd-4fd4-8e87-b0ef67ad194a";
let miniflare: Miniflare;
let bindings: Bindings;

const eventRequest = (
  body: unknown,
  options: { length?: number; origin?: string; qa?: boolean; session?: string; type?: string } = {},
) => {
  const raw = typeof body === "string" ? body : JSON.stringify(body);
  return {
    body: raw,
    headers: {
      "content-length": String(options.length ?? new TextEncoder().encode(raw).byteLength),
      "content-type": options.type ?? "application/json",
      origin: options.origin ?? "http://localhost",
      "x-oyako-madori-qa": options.qa ? "1" : "0",
      "x-oyako-madori-session": options.session ?? session,
    },
    method: "POST",
  } satisfies RequestInit;
};

beforeAll(async () => {
  miniflare = new Miniflare({
    d1Databases: { DB: "oyako-madori-test" },
    modules: true,
    script: "export default { fetch() { return new Response('test') } }",
  });
  const database = await miniflare.getD1Database("DB");
  const migration = await readFile(pathOf("../migrations/0001_product_events.sql"), "utf8");
  for (const statement of migration
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean))
    await database.prepare(statement).run();
  bindings = {
    ASSETS: { fetch: async () => new Response("asset") } as unknown as Fetcher,
    DB: database as unknown as D1Database,
  };
});

beforeEach(async () => bindings.DB.prepare("DELETE FROM product_events").run());
afterAll(async () => miniflare.dispose());

describe("curated room data", () => {
  it("contains seven fresh official entries", () => {
    expect(rooms).toHaveLength(7);
    for (const room of rooms) {
      expect(room.sourceUrl).toMatch(
        /^https:\/\/(www\.)?(city\.chiyoda\.lg\.jp|city\.shinjuku\.lg\.jp)\//,
      );
      expect(room.features).toContain("nursing");
      expect(room.features).toContain("diaper");
      expect(room.verifiedOn).toBe("2026-08-01");
    }
  });
});

describe("pages", () => {
  it.each([
    ["/", 'class="floor-plan"', `${origin}/`],
    ["/rooms", "7件の休憩室", `${origin}/rooms`],
    ["/guide", "間取りを見て、正本で決める", `${origin}/guide`],
    ["/privacy", "現在地も、家族情報も預からない", `${origin}/privacy`],
  ])("renders %s", async (path, marker, canonical) => {
    const response = await app.request(path, undefined, bindings);
    const body = await response.text();
    expect(response.status).toBe(200);
    expect(body).toContain(marker);
    expect(body).toContain(`href="${canonical}" rel="canonical"`);
    expect(response.headers.get("content-security-policy")).toContain("style-src 'self'");
    expect(response.headers.get("content-security-policy")).not.toContain("unsafe-inline");
    expect(body).not.toMatch(/成功条件|市場スコア|公開実験|収益性/);
  });

  it("communicates the service through a floor plan", async () => {
    const body = await (await app.request("/", undefined, bindings)).text();
    for (const marker of [
      'class="room nursing-room"',
      'class="room diaper-room"',
      'class="stroller-route"',
      'class="verified-card"',
    ])
      expect(body).toContain(marker);
  });

  it("filters by area, feature, and text", async () => {
    const response = await app.request(
      "/rooms?area=shinjuku&feature=allGenders&q=%E5%8C%BA%E5%BD%B9%E6%89%80",
      undefined,
      bindings,
    );
    const body = await response.text();
    expect(body).toContain("新宿区役所 第一分庁舎");
    expect(body).not.toContain("新宿中央公園 ちびっこ広場");
    for (const value of ["shinjuku", "allGenders"])
      expect(body).toContain(`selected="" value="${value}"`);
  });

  it("renders an empty filtered state", async () => {
    const body = await (
      await app.request(
        "/rooms?q=%E5%AD%98%E5%9C%A8%E3%81%97%E3%81%AA%E3%81%84",
        undefined,
        bindings,
      )
    ).text();
    expect(body).toContain("条件に合う休憩室はありません");
  });

  it("renders a room detail and rejects unknown ids", async () => {
    const response = await app.request("/rooms/shinjuku-annex-1f", undefined, bindings);
    const body = await response.text();
    expect(response.status).toBe(200);
    expect(body).toContain('class="detail-plan"');
    expect(body).toContain("男性も利用可");
    expect(body).toContain("https://www.city.shinjuku.lg.jp/kusei/file23_00024.html");
    expect((await app.request("/rooms/not-here", undefined, bindings)).status).toBe(404);
  });

  it("marks compare as noindex", async () => {
    const response = await app.request("/compare", undefined, bindings);
    expect(response.headers.get("x-robots-tag")).toBe("noindex, nofollow");
    expect(await response.text()).toContain("data-rooms=");
  });

  it("publishes all room details in the sitemap", async () => {
    const body = await (await app.request("/sitemap.xml", undefined, bindings)).text();
    expect(body.match(/<url>/g)).toHaveLength(11);
    expect(body).toContain(`${origin}/rooms/daimaru-tokyo-9f`);
    expect(body).not.toContain("/compare");
  });

  it("reports health", async () => {
    expect(await (await app.request("/health", undefined, bindings)).json()).toEqual({
      ok: true,
      rooms: 7,
    });
  });
});

describe("events and retention", () => {
  it.each([...eventNames])("accepts event %s", async (name) => {
    const needsRoom = [
      "room_opened",
      "source_opened",
      "favorite_added",
      "favorite_removed",
    ].includes(name);
    const response = await app.request(
      "/api/events",
      eventRequest({ name, roomId: needsRoom ? "daimaru-tokyo-9f" : "" }, { qa: true }),
      bindings,
    );
    expect(response.status).toBe(202);
  });

  it.each([
    [eventRequest({ name: "unknown", roomId: "" }), 400],
    [eventRequest({ name: "visited", roomId: "", extra: true }), 400],
    [eventRequest({ name: "room_opened", roomId: "unknown-room" }), 400],
    [eventRequest({ name: "visited", roomId: "" }, { session: "bad" }), 400],
    [eventRequest({ name: "visited", roomId: "" }, { origin: "https://evil.example" }), 400],
    [eventRequest({ name: "visited", roomId: "" }, { type: "text/plain" }), 400],
    [eventRequest({ name: "visited", roomId: "" }, { length: 600 }), 400],
  ])("rejects invalid event request", async (request, status) => {
    expect((await app.request("/api/events", request, bindings)).status).toBe(status);
  });

  it("stores only the strict event schema and QA marker", async () => {
    await app.request(
      "/api/events",
      eventRequest({ name: "room_opened", roomId: "daimaru-tokyo-9f" }, { qa: true }),
      bindings,
    );
    const row = await bindings.DB.prepare("SELECT * FROM product_events").first<
      Record<string, unknown>
    >();
    expect(row).toMatchObject({
      is_qa: 1,
      name: "room_opened",
      room_id: "daimaru-tokyo-9f",
      session_id: session,
    });
    expect(Object.keys(row ?? {}).sort()).toEqual([
      "created_at",
      "day",
      "id",
      "is_qa",
      "name",
      "room_id",
      "session_id",
    ]);
  });

  it("removes events after forty-five days", async () => {
    await app.request("/api/events", eventRequest({ name: "visited", roomId: "" }), bindings);
    await bindings.DB.prepare("UPDATE product_events SET created_at = ?")
      .bind(Math.floor(Date.now() / 1000) - 46 * 86400)
      .run();
    await scheduled({} as ScheduledController, bindings, {} as ExecutionContext);
    expect(
      await bindings.DB.prepare("SELECT COUNT(*) AS count FROM product_events").first(),
    ).toEqual({ count: 0 });
  });
});

describe("release assets", () => {
  it("keeps privacy and presentation contracts aligned", async () => {
    const [worker, scripts, styles, sw, manifest, og, metrics] = await Promise.all([
      readFile(pathOf("../src/worker.tsx"), "utf8"),
      Promise.all(
        ["common.js", "compare.js", "directory.js", "home.js", "room.js", "sw.js"].map((name) =>
          readFile(pathOf(`../public/${name}`), "utf8"),
        ),
      ).then((files) => files.join("\n")),
      readFile(pathOf("../public/styles.css"), "utf8"),
      readFile(pathOf("../public/sw.js"), "utf8"),
      readFile(pathOf("../public/manifest.webmanifest"), "utf8"),
      readFile(pathOf("../public/og.png")),
      readFile(pathOf("../ops/product-metrics.sql"), "utf8"),
    ]);
    expect(`${worker}\n${scripts}`).not.toMatch(/\son[a-z]+\s*=/i);
    expect(`${worker}\n${scripts}`).not.toMatch(/navigator\.geolocation|innerHTML/);
    expect(styles).toContain("clamp(1.75rem, 3.2vw, 2rem)");
    expect(styles).not.toMatch(/gradient/i);
    expect(styles).toContain("@media print");
    const shell = sw.slice(sw.indexOf("const shell"), sw.indexOf("];", sw.indexOf("const shell")));
    expect(shell).not.toContain('"/rooms"');
    expect(JSON.parse(manifest).name).toBe("おやこ間取り");
    expect(og.byteLength).toBeGreaterThan(50000);
    expect(metrics).toContain("WHERE is_qa = 0");
    expect([...eventNames]).toHaveLength(8);
  });
});
