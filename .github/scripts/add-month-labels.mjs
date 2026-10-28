// github-profile-3d-contrib が出力した SVG に、草の手前の辺に沿って年月とその月の件数を書き足す。
// 座標計算は同ツールの src/create-3d-contrib.ts（v0.9.3）を写したもの。ツールを上げて配置がずれたらここを合わせる
import { readFileSync, writeFileSync } from "node:fs";

const WIDTH = 1280;
const HEIGHT = 850;
const DX = WIDTH / 64;
const DY = DX * Math.tan(Math.PI / 6);
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DAY = 86400000;

// ツールと同じく期間指定なしで取るので、草と同じ期間の日別件数になる
const res = await fetch("https://api.github.com/graphql", {
  method: "POST",
  headers: { Authorization: `bearer ${process.env.GITHUB_TOKEN}` },
  body: JSON.stringify({
    query: `{ user(login: "${process.env.USERNAME}") { contributionsCollection { contributionCalendar { weeks { contributionDays { date contributionCount } } } } } }`,
  }),
});
const json = await res.json();
if (!json.data) throw new Error(`件数の取得に失敗: ${JSON.stringify(json)}`);
const monthly = {};
for (const week of json.data.user.contributionsCollection.contributionCalendar.weeks) {
  for (const { date, contributionCount } of week.contributionDays) {
    monthly[date.slice(0, 7)] = (monthly[date.slice(0, 7)] ?? 0) + contributionCount;
  }
}

for (const file of process.argv.slice(2)) {
  const svg = readFileSync(file, "utf8");
  const period = svg.match(/(\d{4}-\d{2}-\d{2}) \/ (\d{4}-\d{2}-\d{2})/);
  if (!period) throw new Error(`${file}: 対象期間の表記が見つからない`);
  const first = new Date(`${period[1]}T00:00:00Z`);
  const last = new Date(`${period[2]}T00:00:00Z`);
  const firstSunday = first.getTime() - first.getUTCDay() * DAY;
  const weekcount = Math.ceil(((last - first) / DAY + 1 + first.getUTCDay()) / 7);
  const offsetY = HEIGHT - (weekcount + 7) * DY;

  const labels = [];
  // 期間の途中から始まる最初の月は数日しかないので、翌月からラベルを付ける
  const m = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 1));
  for (; m <= last; m.setUTCMonth(m.getUTCMonth() + 1)) {
    const week = Math.floor((m - firstSunday) / DAY / 7);
    // 土曜の列（手前の辺）から少し外側に置く
    let x = DX * 7 + (week - 7.8) * DX;
    let y = offsetY + (week + 7.8) * DY;
    // 左端で件数の行が画像からはみ出す分は、辺に沿って右下へずらす
    if (x < 28) {
      y += ((28 - x) / DX) * DY;
      x = 28;
    }
    const month = m.getUTCMonth();
    // 年は 1 月にだけ付ける（左端の月に付けると隣の月と重なる）
    const name = month === 0 ? `${MONTHS[month]} ${m.getUTCFullYear()}` : MONTHS[month];
    const count = (monthly[m.toISOString().slice(0, 7)] ?? 0).toLocaleString("en-US");
    // 床面に寝かせて、週の並ぶ向きに文字を流す。件数は月名の 1 行下（草から遠い側）に置く
    labels.push(
      `<g transform="matrix(0.866 0.5 -0.866 0.5 ${x.toFixed(1)} ${y.toFixed(1)})" class="fill-fg">` +
        `<text font-size="19px" font-weight="bold" fill-opacity="0.85">${name}</text>` +
        `<text y="21" font-size="16px" fill-opacity="0.65">${count}</text></g>`,
    );
  }
  writeFileSync(file, svg.replace(/<\/svg>\s*$/, `<g>${labels.join("")}</g></svg>`));
}
