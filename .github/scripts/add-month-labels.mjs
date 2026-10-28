// github-profile-3d-contrib が出力した SVG に、草の手前の辺に沿って年月ラベルを書き足す。
// 座標計算は同ツールの src/create-3d-contrib.ts（v0.9.3）を写したもの。ツールを上げて配置がずれたらここを合わせる
import { readFileSync, writeFileSync } from "node:fs";

const WIDTH = 1280;
const HEIGHT = 850;
const DX = WIDTH / 64;
const DY = DX * Math.tan(Math.PI / 6);
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DAY = 86400000;

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
    // 左端で画像からはみ出す分は、辺に沿って右下へずらす
    if (x < 8) {
      y += ((8 - x) / DX) * DY;
      x = 8;
    }
    const month = m.getUTCMonth();
    const text = labels.length === 0 || month === 0 ? `${MONTHS[month]} ${m.getUTCFullYear()}` : MONTHS[month];
    // 床面に寝かせて、週の並ぶ向きに文字を流す
    labels.push(
      `<text transform="matrix(0.866 0.5 -0.866 0.5 ${x.toFixed(1)} ${y.toFixed(1)})" class="fill-fg" font-size="15px" font-weight="bold" fill-opacity="0.75">${text}</text>`,
    );
  }
  writeFileSync(file, svg.replace(/<\/svg>\s*$/, `<g>${labels.join("")}</g></svg>`));
}
