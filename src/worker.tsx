/** @jsxImportSource hono/jsx */
import { Hono } from "hono";
import { html } from "hono/html";
import type { Child } from "hono/jsx";
import { jsxRenderer } from "hono/jsx-renderer";
import { secureHeaders } from "hono/secure-headers";

export type Bindings = { ASSETS: Fetcher; DB: D1Database };
type Variables = { requestId: string };
type Feature = "allGenders" | "diaper" | "hotWater" | "nursing" | "sink" | "stroller";
type Area = "hibiya" | "kojimachi" | "shinjuku" | "tokyo" | "yurakucho";
type Room = {
  area: Area;
  facility: string;
  features: Feature[];
  floor: string;
  hours: string;
  id: string;
  note: string;
  sourceLabel: string;
  sourceUrl: string;
  station: string;
  verifiedOn: string;
};

const canonicalOrigin = "https://oyako-madori.yhay81.com";
const eventLifetime = 45 * 86400;
const sessionPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const roomIdPattern = /^[a-z0-9-]{4,40}$/;
const areaLabels: Record<Area, string> = {
  hibiya: "日比谷・霞ケ関",
  kojimachi: "麹町・半蔵門",
  shinjuku: "新宿",
  tokyo: "東京駅",
  yurakucho: "有楽町",
};
const featureLabels: Record<Feature, string> = {
  allGenders: "だれでも利用可",
  diaper: "おむつ交換",
  hotWater: "調乳用お湯",
  nursing: "授乳・搾乳",
  sink: "手洗い",
  stroller: "ベビーカー動線",
};
const rooms: Room[] = [
  {
    area: "tokyo",
    facility: "大丸東京店",
    features: ["nursing", "diaper", "hotWater", "sink", "stroller"],
    floor: "9階 ベビー休憩室",
    hours: "月〜水・土日祝 10:00〜20:00／木金 10:00〜21:00",
    id: "daimaru-tokyo-9f",
    note: "ベビーシートは1階を除く各階にもあります。営業時間変更は公式情報を確認してください。",
    sourceLabel: "千代田区 赤ちゃん・ふらっと",
    sourceUrl: "https://www.city.chiyoda.lg.jp/koho/kosodate/kosodate/odekake/akachan-02.html",
    station: "東京駅 八重洲北口",
    verifiedOn: "2026-08-01",
  },
  {
    area: "yurakucho",
    facility: "有楽町マルイ",
    features: ["nursing", "diaper", "hotWater", "sink", "stroller"],
    floor: "5階 授乳室",
    hours: "月〜土 11:00〜21:00／日祝 10:30〜20:30",
    id: "yurakucho-marui-5f",
    note: "ベビーチェア・ベビーベッド付きトイレは2〜8階。営業時間変更は公式情報を確認してください。",
    sourceLabel: "千代田区 赤ちゃん・ふらっと",
    sourceUrl: "https://www.city.chiyoda.lg.jp/koho/kosodate/kosodate/odekake/akachan-02.html",
    station: "有楽町駅 徒歩1分",
    verifiedOn: "2026-08-01",
  },
  {
    area: "hibiya",
    facility: "日比谷図書文化館",
    features: ["nursing", "diaper", "hotWater", "sink"],
    floor: "4階 授乳室",
    hours: "平日 10:00〜22:00／土 10:00〜19:00／日祝 10:00〜17:00",
    id: "hibiya-library-4f",
    note: "第3月曜、年末年始、特別休館日は利用できません。",
    sourceLabel: "千代田区 赤ちゃん・ふらっと",
    sourceUrl: "https://www.city.chiyoda.lg.jp/koho/kosodate/kosodate/odekake/akachan-02.html",
    station: "霞ケ関駅 徒歩5分",
    verifiedOn: "2026-08-01",
  },
  {
    area: "hibiya",
    facility: "富国生命ビル",
    features: ["nursing", "diaper", "hotWater", "sink"],
    floor: "地下1階 授乳室",
    hours: "月〜土 7:30〜23:00",
    id: "fukoku-building-b1f",
    note: "ビル休館日は利用できません。",
    sourceLabel: "千代田区 赤ちゃん・ふらっと",
    sourceUrl: "https://www.city.chiyoda.lg.jp/koho/kosodate/kosodate/odekake/akachan-02.html",
    station: "内幸町駅 直結",
    verifiedOn: "2026-08-01",
  },
  {
    area: "kojimachi",
    facility: "麹町出張所",
    features: ["nursing", "diaper", "sink", "allGenders"],
    floor: "女子更衣室内・窓口へ声かけ",
    hours: "平日 8:30〜17:00",
    id: "kojimachi-branch",
    note: "どなたでも利用できます。調乳用の給湯設備は利用できません。",
    sourceLabel: "千代田区 赤ちゃん・ふらっと",
    sourceUrl: "https://www.city.chiyoda.lg.jp/koho/kosodate/kosodate/odekake/akachan-02.html",
    station: "半蔵門駅・麹町駅 徒歩5分",
    verifiedOn: "2026-08-01",
  },
  {
    area: "shinjuku",
    facility: "新宿区役所 第一分庁舎",
    features: ["nursing", "diaper", "sink", "allGenders"],
    floor: "1階 ベビーケアルーム",
    hours: "開庁日 8:00〜17:30",
    id: "shinjuku-annex-1f",
    note: "男性も利用可。原則1回30分以内です。",
    sourceLabel: "新宿区 第一分庁舎ベビーケアルーム",
    sourceUrl: "https://www.city.shinjuku.lg.jp/kusei/file23_00024.html",
    station: "新宿三丁目駅・新宿駅",
    verifiedOn: "2026-08-01",
  },
  {
    area: "shinjuku",
    facility: "新宿中央公園 ちびっこ広場",
    features: ["nursing", "diaper", "hotWater", "sink", "allGenders"],
    floor: "ちびっこ休憩室",
    hours: "4〜9月 9:00〜17:00／10〜3月 9:00〜16:00",
    id: "shinjuku-central-park",
    note: "授乳、調乳、おむつ交換、着替えに使える休憩室です。",
    sourceLabel: "新宿区 新宿中央公園",
    sourceUrl: "https://www.city.shinjuku.lg.jp/seikatsu/file15_02_00001.html",
    station: "都庁前駅",
    verifiedOn: "2026-08-01",
  },
];
export const eventNames = new Set([
  "visited",
  "directory_searched",
  "room_opened",
  "source_opened",
  "favorite_added",
  "favorite_removed",
  "compare_opened",
  "returned",
]);
const areas = new Set(Object.keys(areaLabels));
const features = new Set(Object.keys(featureLabels));
const app = new Hono<{ Bindings: Bindings; Variables: Variables }>();
const nowSeconds = () => Math.floor(Date.now() / 1000);
const day = () => new Date().toISOString().slice(0, 10);
const isFresh = (room: Room) =>
  Date.parse(`${room.verifiedOn}T00:00:00Z`) >= Date.now() - 120 * 86400000;
const activeRooms = () => rooms.filter(isFresh);
const isExactObject = (value: unknown, keys: string[]) =>
  Boolean(
    value &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    Object.keys(value).sort().join("|") === [...keys].sort().join("|"),
  );
const validBoundary = (request: Request) => {
  const origin = request.headers.get("origin");
  const contentType = request.headers.get("content-type") ?? "";
  const length = Number(request.headers.get("content-length") ?? "0");
  return (
    (!origin || origin === new URL(request.url).origin) &&
    contentType.toLowerCase().startsWith("application/json") &&
    Number.isFinite(length) &&
    length <= 512
  );
};
const parseJson = async (request: Request) => {
  const raw = await request.text();
  if (new TextEncoder().encode(raw).byteLength > 512) throw new Error("body_too_large");
  return JSON.parse(raw);
};

const Layout = (props: {
  children: Child;
  description: string;
  noindex?: boolean;
  path?: string;
  title: string;
}) => {
  const url = `${canonicalOrigin}${props.path ?? "/"}`;
  return (
    <html lang="ja">
      <head>
        <meta charset="utf-8" />
        <meta content="width=device-width, initial-scale=1" name="viewport" />
        <title>{props.title}</title>
        <meta content={props.description} name="description" />
        <meta content={props.noindex ? "noindex, nofollow" : "index, follow"} name="robots" />
        <link href={url} rel="canonical" />
        <meta content="website" property="og:type" />
        <meta content={props.title} property="og:title" />
        <meta content={props.description} property="og:description" />
        <meta content={`${canonicalOrigin}/og.png`} property="og:image" />
        <meta content={url} property="og:url" />
        <meta content="summary_large_image" name="twitter:card" />
        <meta content="#243b5a" name="theme-color" />
        <link href="/favicon.png" rel="icon" type="image/png" />
        <link href="/manifest.webmanifest" rel="manifest" />
        <link href="/styles.css" rel="stylesheet" />
      </head>
      <body>
        <a class="skip-link" href="#main">
          本文へ
        </a>
        <header class="site-header">
          <a class="brand" href="/">
            <span aria-hidden="true">
              <i></i>
              <i></i>
            </span>
            <b>おやこ間取り</b>
          </a>
          <nav aria-label="主なページ">
            <a href="/rooms">設備から探す</a>
            <a href="/compare">比較する</a>
            <a href="/guide">見方</a>
          </nav>
        </header>
        {props.children}
        <footer>
          <a href="/privacy">安全と情報源</a>
          <a href="https://github.com/yhay81/oyako-madori">公開コード</a>
          <span>利用前に施設の公式情報を確認してください。</span>
        </footer>
        <script src="/common.js" type="module"></script>
      </body>
    </html>
  );
};

const FloorPlan = () => (
  <div class="floor-plan" aria-hidden="true">
    <div class="stroller-route">
      <i></i>
      <i></i>
      <i></i>
    </div>
    <div class="room nursing-room">
      <span class="chair"></span>
      <b>授乳</b>
      <em>個室</em>
    </div>
    <div class="room diaper-room">
      <span class="table"></span>
      <b>交換</b>
      <em>台あり</em>
    </div>
    <div class="room wash-room">
      <span class="sink"></span>
      <b>手洗い</b>
      <em>お湯</em>
    </div>
    <div class="shared-door">
      <i></i>
      <b>共用</b>
    </div>
    <div class="verified-card">
      <span>確認日</span>
      <b>2026.08</b>
      <i>✓</i>
    </div>
  </div>
);
const FeatureIcon = (props: { feature: Feature }) => (
  <span class={`feature-icon ${props.feature}`} aria-hidden="true">
    <i></i>
  </span>
);
const FeatureList = (props: { values: Feature[] }) => (
  <ul class="feature-list">
    {Object.entries(featureLabels).map(([feature, label]) => (
      <li class={props.values.includes(feature as Feature) ? "available" : "unknown"}>
        <FeatureIcon feature={feature as Feature} />
        <span>{label}</span>
        <b>{props.values.includes(feature as Feature) ? "あり" : "要確認"}</b>
      </li>
    ))}
  </ul>
);
const RoomCard = (props: { room: Room }) => (
  <article class="room-card" data-room-card={props.room.id}>
    <div class="mini-plan" aria-hidden="true">
      <span class="mini-room"></span>
      <span class="mini-table"></span>
      <i></i>
    </div>
    <div class="card-heading">
      <span>{areaLabels[props.room.area]}</span>
      <time datetime={props.room.verifiedOn}>確認 {props.room.verifiedOn}</time>
    </div>
    <h3>
      <a href={`/rooms/${props.room.id}`}>{props.room.facility}</a>
    </h3>
    <p class="floor">{props.room.floor}</p>
    <p>{props.room.station}</p>
    <div class="compact-features">
      {props.room.features.slice(0, 5).map((feature) => (
        <span title={featureLabels[feature]}>
          <FeatureIcon feature={feature} />
        </span>
      ))}
    </div>
    <a class="card-link" href={`/rooms/${props.room.id}`}>
      間取りを見る <span>→</span>
    </a>
  </article>
);

const Home = () => (
  <Layout
    description="授乳室とおむつ交換スペースを、設備、利用者、館内位置、公式確認日から探す。現在地も登録も不要。"
    title="おやこ間取り｜授乳も、おむつ替えも、行く前に。"
  >
    <main id="main">
      <section class="hero">
        <div class="hero-copy">
          <p class="eyebrow">BABY CARE FLOOR GUIDE</p>
          <h1>授乳も、おむつ替えも、行く前に。</h1>
          <p>駅と設備から休憩室を選び、館内位置と利用時間を公式情報で確かめます。</p>
          <div class="hero-actions">
            <a class="primary-button" href="/rooms">
              設備から探す
            </a>
            <a class="quiet-button" href="/compare">
              候補を比べる
            </a>
          </div>
          <div class="privacy-strip">
            <i></i>
            <span>現在地なし</span>
            <i></i>
            <span>登録なし</span>
            <i></i>
            <span>広告なし</span>
          </div>
        </div>
        <FloorPlan />
      </section>
      <section class="feature-lane">
        <div>
          <p class="section-kicker">READ THE ROOM</p>
          <h2>必要な設備を、入口で見分ける</h2>
        </div>
        <div class="feature-tiles">
          {(["nursing", "diaper", "hotWater", "sink", "allGenders", "stroller"] as Feature[]).map(
            (feature) => (
              <article>
                <FeatureIcon feature={feature} />
                <b>{featureLabels[feature]}</b>
              </article>
            ),
          )}
        </div>
      </section>
      <section class="nearby-section">
        <header>
          <div>
            <p class="section-kicker">VERIFIED ROOMS</p>
            <h2>公式確認日の新しい休憩室</h2>
          </div>
          <a href="/rooms">すべて見る</a>
        </header>
        <div class="room-grid">
          {activeRooms()
            .slice(0, 3)
            .map((room) => (
              <RoomCard room={room} />
            ))}
        </div>
      </section>
    </main>
    <script src="/home.js" type="module"></script>
  </Layout>
);

const Directory = (props: { area: string; feature: string; query: string; values: Room[] }) => (
  <Layout
    description="東京都心の授乳室・おむつ交換スペースを、駅、エリア、設備から絞り込む。"
    path="/rooms"
    title="設備から探す｜おやこ間取り"
  >
    <main class="directory-page" data-directory-root id="main">
      <header class="page-intro">
        <div class="page-symbol" aria-hidden="true">
          <i></i>
          <i></i>
          <i></i>
        </div>
        <div>
          <p class="eyebrow">ROOM DIRECTORY</p>
          <h1>設備から休憩室を選ぶ</h1>
          <p>公式確認日が120日以内の情報だけを表示します。</p>
        </div>
      </header>
      <form action="/rooms" class="filter-bar" method="get">
        <label class="search-field">
          <span>施設・駅・館内位置</span>
          <input maxlength={60} name="q" placeholder="東京駅、図書館、4階" value={props.query} />
        </label>
        <label>
          <span>エリア</span>
          <select name="area">
            <option value="">すべて</option>
            {Object.entries(areaLabels).map(([value, label]) => (
              <option selected={props.area === value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>必要な設備</span>
          <select name="feature">
            <option value="">すべて</option>
            {Object.entries(featureLabels).map(([value, label]) => (
              <option selected={props.feature === value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <button class="primary-button" type="submit">
          絞り込む
        </button>
      </form>
      <div class="directory-heading">
        <div>
          <p class="section-kicker">FRESH ENTRIES</p>
          <h2>
            {props.values.length
              ? `${props.values.length}件の休憩室`
              : "条件に合う休憩室はありません"}
          </h2>
        </div>
        <button class="quiet-button" data-show-favorites type="button">
          お気に入りだけ
        </button>
      </div>
      {props.values.length ? (
        <section class="room-grid" aria-label="休憩室一覧">
          {props.values.map((room) => (
            <RoomCard room={room} />
          ))}
        </section>
      ) : (
        <section class="empty-floor">
          <i></i>
          <i></i>
          <p>設備条件を減らして、もう一度探してください。</p>
        </section>
      )}
    </main>
    <script src="/directory.js" type="module"></script>
  </Layout>
);

const Detail = (props: { room: Room }) => (
  <Layout
    description={`${props.room.facility}の授乳・おむつ交換設備。${props.room.floor}、公式確認日${props.room.verifiedOn}。`}
    path={`/rooms/${props.room.id}`}
    title={`${props.room.facility}｜おやこ間取り`}
  >
    <main class="detail-page" data-room-id={props.room.id} data-room-root id="main">
      <header class="detail-hero">
        <div class="detail-plan" aria-hidden="true">
          <div class="plan-route"></div>
          {props.room.features.map((feature) => (
            <FeatureIcon feature={feature} />
          ))}
        </div>
        <div>
          <p class="eyebrow">{areaLabels[props.room.area]}</p>
          <h1>{props.room.facility}</h1>
          <p class="floor">{props.room.floor}</p>
          <p>{props.room.station}</p>
        </div>
      </header>
      <div class="detail-grid">
        <section class="room-facts">
          <h2>設備の間取り</h2>
          <FeatureList values={props.room.features} />
          <dl>
            <div>
              <dt>利用時間</dt>
              <dd>{props.room.hours}</dd>
            </div>
            <div>
              <dt>確認日</dt>
              <dd>
                <time datetime={props.room.verifiedOn}>{props.room.verifiedOn}</time>
              </dd>
            </div>
            <div>
              <dt>案内</dt>
              <dd>{props.room.note}</dd>
            </div>
          </dl>
        </section>
        <aside class="source-panel">
          <div class="source-door" aria-hidden="true">
            <i></i>
            <span>OFFICIAL</span>
          </div>
          <h2>公式情報で最終確認</h2>
          <p>休館、改装、混雑、利用条件は変わることがあります。</p>
          <a
            class="primary-button"
            data-source-open
            href={props.room.sourceUrl}
            rel="noopener noreferrer"
          >
            {props.room.sourceLabel}を開く
          </a>
          <button class="favorite-button" data-favorite type="button">
            お気に入りに入れる
          </button>
          <button class="compare-button" data-compare type="button">
            比較候補に入れる
          </button>
          <p data-action-state aria-live="polite"></p>
        </aside>
      </div>
    </main>
    <script src="/room.js" type="module"></script>
  </Layout>
);

const Compare = () => (
  <Layout
    description="端末内に保存した最大3件の授乳室・おむつ交換スペースを設備ごとに比較する。"
    noindex
    path="/compare"
    title="候補を比べる｜おやこ間取り"
  >
    <main
      class="compare-page"
      data-compare-root
      data-rooms={JSON.stringify(activeRooms())}
      id="main"
    >
      <header class="page-intro">
        <div class="page-symbol compare" aria-hidden="true">
          <i></i>
          <i></i>
          <i></i>
        </div>
        <div>
          <p class="eyebrow">COMPARE ROOMS</p>
          <h1>三つの間取りを横に並べる</h1>
          <p>比較候補はこの端末だけに保存されます。</p>
        </div>
      </header>
      <section data-compare-grid class="compare-grid"></section>
      <p data-compare-empty>各休憩室の「比較候補に入れる」から最大3件を選んでください。</p>
    </main>
    <script src="/compare.js" type="module"></script>
  </Layout>
);
const Guide = () => (
  <Layout
    description="おやこ間取りの設備記号、公式確認日、端末内保存の見方。"
    path="/guide"
    title="見方｜おやこ間取り"
  >
    <main class="prose-page" id="main">
      <header class="page-intro">
        <div class="page-symbol guide" aria-hidden="true">
          <i></i>
          <i></i>
          <i></i>
        </div>
        <div>
          <p class="eyebrow">HOW TO READ</p>
          <h1>間取りを見て、正本で決める</h1>
          <p>必要設備を比べ、出発前に施設の公式情報を開きます。</p>
        </div>
      </header>
      <div class="guide-grid">
        <section>
          <b>1</b>
          <h2>駅と設備で探す</h2>
          <p>授乳、おむつ交換、お湯、手洗い、共用可否から絞ります。</p>
        </section>
        <section>
          <b>2</b>
          <h2>確認日を見る</h2>
          <p>120日を超えた情報は一覧から外れます。</p>
        </section>
        <section>
          <b>3</b>
          <h2>公式情報を開く</h2>
          <p>当日の開館、改装、利用条件を施設・自治体ページで確かめます。</p>
        </section>
      </div>
    </main>
  </Layout>
);
const Privacy = () => (
  <Layout
    description="おやこ間取りが取得しない現在地・住所・家族情報と、匿名イベントの保存範囲。"
    path="/privacy"
    title="安全と情報源｜おやこ間取り"
  >
    <main class="prose-page" id="main">
      <header class="page-intro">
        <div class="page-symbol privacy" aria-hidden="true">
          <i></i>
          <i></i>
          <i></i>
        </div>
        <div>
          <p class="eyebrow">SAFETY & SOURCES</p>
          <h1>現在地も、家族情報も預からない</h1>
          <p>公開設備の比較と、公式情報への案内だけを扱います。</p>
        </div>
      </header>
      <div class="privacy-grid">
        <section>
          <h2>掲載するもの</h2>
          <p>
            施設、エリア、駅、館内位置、設備、利用時間、確認日、公式URLをコードとして管理します。
          </p>
        </section>
        <section>
          <h2>取得しないもの</h2>
          <p>
            現在地、住所、経路、氏名、連絡先、子どもの情報、写真、口コミ、自由記述を取得しません。
          </p>
        </section>
        <section>
          <h2>端末と計測</h2>
          <p>お気に入りと比較候補は端末内だけ。匿名イベントはQAを分け、45日後に削除します。</p>
        </section>
      </div>
    </main>
  </Layout>
);

app.use(
  "*",
  secureHeaders({
    contentSecurityPolicy: {
      defaultSrc: ["'self'"],
      baseUri: ["'none'"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      formAction: ["'self'"],
      frameAncestors: ["'none'"],
      imgSrc: ["'self'", "data:"],
      objectSrc: ["'none'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'"],
      upgradeInsecureRequests: [],
    },
    crossOriginEmbedderPolicy: false,
    permissionsPolicy: { camera: [], geolocation: [], microphone: [], payment: [] },
    referrerPolicy: "no-referrer",
  }),
);
app.use("*", async (c, next) => {
  c.set("requestId", crypto.randomUUID());
  c.header("X-Request-Id", c.get("requestId"));
  c.header("Permissions-Policy", "camera=(), geolocation=(), microphone=(), payment=()");
  await next();
});
app.use("/api/*", async (c, next) => {
  await next();
  c.header("Cache-Control", "no-store");
});
app.use(
  "*",
  jsxRenderer(({ children }) => html`${children}`),
);
app.get("/", (c) => c.render(<Home />));
app.get("/rooms", (c) => {
  const url = new URL(c.req.url);
  const area = areas.has(url.searchParams.get("area") ?? "")
    ? (url.searchParams.get("area") ?? "")
    : "";
  const feature = features.has(url.searchParams.get("feature") ?? "")
    ? (url.searchParams.get("feature") ?? "")
    : "";
  const query = (url.searchParams.get("q") ?? "").trim().slice(0, 60);
  const needle = query.toLocaleLowerCase("ja");
  const values = activeRooms().filter(
    (room) =>
      (!area || room.area === area) &&
      (!feature || room.features.includes(feature as Feature)) &&
      (!needle ||
        `${room.facility} ${room.station} ${room.floor}`.toLocaleLowerCase("ja").includes(needle)),
  );
  c.header("Cache-Control", "no-store");
  return c.render(<Directory area={area} feature={feature} query={query} values={values} />);
});
app.get("/rooms/:id", (c) => {
  const id = c.req.param("id");
  const room = roomIdPattern.test(id) ? activeRooms().find((entry) => entry.id === id) : undefined;
  if (!room) return c.notFound();
  c.header("Cache-Control", "no-store");
  return c.render(<Detail room={room} />);
});
app.get("/compare", (c) => {
  c.header("Cache-Control", "no-store");
  c.header("X-Robots-Tag", "noindex, nofollow");
  return c.render(<Compare />);
});
app.get("/guide", (c) => c.render(<Guide />));
app.get("/privacy", (c) => c.render(<Privacy />));
app.get("/health", (c) => {
  c.header("Cache-Control", "no-store");
  return c.json({ ok: true, rooms: activeRooms().length });
});
app.get("/sitemap.xml", (c) => {
  const paths = [
    "/",
    "/rooms",
    "/guide",
    "/privacy",
    ...activeRooms().map((room) => `/rooms/${room.id}`),
  ];
  const body = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${paths.map((path) => `  <url><loc>${canonicalOrigin}${path}</loc></url>`).join("\n")}\n</urlset>`;
  c.header("Cache-Control", "public, max-age=300");
  c.header("Content-Type", "application/xml; charset=UTF-8");
  return c.body(body);
});
app.post("/api/events", async (c) => {
  if (!validBoundary(c.req.raw)) return c.json({ error: "invalid_request" }, 400);
  const sessionId = c.req.header("x-oyako-madori-session") ?? "";
  if (!sessionPattern.test(sessionId)) return c.json({ error: "invalid_request" }, 400);
  try {
    const input = await parseJson(c.req.raw);
    if (!isExactObject(input, ["name", "roomId"])) return c.json({ error: "invalid_event" }, 400);
    const { name, roomId } = input as { name: unknown; roomId: unknown };
    if (
      typeof name !== "string" ||
      !eventNames.has(name) ||
      typeof roomId !== "string" ||
      (roomId !== "" && !activeRooms().some((room) => room.id === roomId))
    )
      return c.json({ error: "invalid_event" }, 400);
    await c.env.DB.prepare(
      "INSERT INTO product_events (name,session_id,room_id,day,created_at,is_qa) VALUES (?,?,?,?,?,?)",
    )
      .bind(
        name,
        sessionId,
        roomId || null,
        day(),
        nowSeconds(),
        c.req.header("x-oyako-madori-qa") === "1" ? 1 : 0,
      )
      .run();
    return c.json({ ok: true }, 202);
  } catch {
    return c.json({ error: "invalid_request" }, 400);
  }
});
app.notFound((c) => {
  if (c.req.path.startsWith("/api/")) return c.json({ error: "not_found" }, 404);
  c.status(404);
  return c.render(
    <Layout
      description="指定された休憩室は見つかりません。"
      noindex
      title="見つかりません｜おやこ間取り"
    >
      <main class="not-found" id="main">
        <div class="empty-room" aria-hidden="true">
          <i></i>
          <span>404</span>
        </div>
        <p class="eyebrow">ROOM NOT FOUND</p>
        <h1>その間取りは、確認期間を過ぎています</h1>
        <p>公式情報を更新中か、掲載対象から外れた可能性があります。</p>
        <a class="primary-button" href="/rooms">
          ほかの休憩室を探す
        </a>
      </main>
    </Layout>,
  );
});
export const scheduled = async (
  _controller: ScheduledController,
  env: Bindings,
  _context: ExecutionContext,
) => {
  await env.DB.prepare("DELETE FROM product_events WHERE created_at < ?")
    .bind(nowSeconds() - eventLifetime)
    .run();
};
export default { fetch: app.fetch, scheduled };
export { app, rooms };
