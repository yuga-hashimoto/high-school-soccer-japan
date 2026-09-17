import { fetchBuffer, fetchText } from "@/data-sources/http";
import { extractPdfLayout, extractPdfText } from "@/data-sources/parse/pdf";
import { extractPdfStandings, isPlausibleStandings } from "@/data-sources/parse/pdf-table";
import { parsePdfMatchLine } from "@/data-sources/prefectures/pdf-adapter";

/**
 * Maintenance tool: for each association page, try every linked PDF with both
 * the standings-table reader and the result-list line reader, and report which
 * interpretation yields data. Used to fill in `endpoints` in the regional
 * catalogs.
 */
const PAGES: Array<[string, string, string?]> = [
  ["hokkaido", "https://www.hfa-dream.or.jp/tournament/2syu/"],
  ["aomori", "https://www.aomori-fa.jp/category/committee/all-committee/highschool/"],
  ["ibaraki", "https://www.ibaraki-fa.jp/info/c2-20260213/"],
  ["tochigi", "http://www.tfa.or.jp/wptfa/?cat=12"],
  ["kanagawa", "https://kanagawa-fa.gr.jp/u18_league/"],
  ["gifu", "https://www.gifu-fa.com/type2/"],
  ["shizuoka", "https://www.shizuoka-fa.com/game/under18/14586/"],
  ["aichi", "https://www.aifa.jp/event/id_2690/"],
  ["mie", "https://www.fa-mie.jp/17339/"],
  ["hiroshima", "https://www.hifa.jp/competition/category/cat2/"],
  ["oita", "https://www.ofa.or.jp/news/12521/"],
  ["tokushima", "https://tokushima-fa.jp/post-414/"],
  ["kochi", "https://www.kochi-fa.com/class02/class02sch/entry-305.html"],
  ["kagoshima", "http://www.kagoshima-fa.jp/nisyu/"],
  ["fukushima", "https://fukushima-fa.com/match/2026/"],
  ["akita", "https://fa-akita.net/16943/"],
  ["shimane", "https://www.fa-shimane.or.jp/kinds/category2"],
  ["okayama", "https://okayama-fa.or.jp/2022/2-2"],
  ["toyama", "https://toyfa.jp/?tid=104362"],
  ["ishikawa", "http://soccer-u18.ishikawa.jp/u-18.html"],
  ["kanagawa", "https://kanagawa-fa.gr.jp/u18_league/"],
  ["kyoto", "https://www.kyoto-fa.or.jp/archives.php?id=1631&category=13", "https://www.kyoto-fa.or.jp/"],
  ["osaka", "https://osaka-fa.or.jp/2shu/"],
];

async function main() {
  const only = new Set(process.argv.slice(2));
  for (const [slug, page, referer] of PAGES) {
    if (only.size > 0 && !only.has(slug)) continue;
    const headers = referer ? { Referer: referer } : undefined;
    let links: string[] = [];
    try {
      const doc = await fetchText(page, { sourceId: `probe-${slug}`, cacheTtlMs: 600000, headers });
      links = [...new Set([...doc.body.matchAll(/href=["']([^"']+)["']/gi)]
        .map((m) => { try { return new URL(m[1], page).toString(); } catch { return ""; } })
        .filter((u) => /\.pdf($|\?)/i.test(u) || /media-download/i.test(u)))];
    } catch (e) { console.log(`${slug}: PAGE-FAIL ${(e as Error).message.slice(0,40)}`); continue; }
    links.sort((a, b) => {
      const s = (u: string) => (/順位|星取|結果|hoshi|result|rank|league|リーグ/i.test(decodeURIComponent(u)) ? 1 : 0);
      return s(b) - s(a);
    });
    let wins = 0;
    for (const link of links.slice(0, 14)) {
      try {
        const buf = await fetchBuffer(link, { sourceId: `probe-${slug}`, headers });
        const items = await extractPdfLayout(buf.bytes, slug, link);
        const plain = await extractPdfText(buf.bytes, slug, link);
        const secs = extractPdfStandings(items).filter(isPlausibleStandings);
        let lineMatches = 0;
        const seen = new Set<string>();
        for (const line of plain.split(/\n/)) {
          const m = parsePdfMatchLine(line);
          if (m && !seen.has(`${m.home}|${m.away}`)) { seen.add(`${m.home}|${m.away}`); lineMatches += 1; }
        }
        if (secs.length > 0 || lineMatches >= 8) {
          wins += 1;
          console.log(`  OK [${slug}] table=${secs.length}(${secs.map(s=>s.rows.length).join("/")}) lines=${lineMatches} :: ${decodeURIComponent(link.split("/").pop() ?? "").slice(0, 40)}`);
        }
      } catch { /* ignore */ }
    }
    console.log(`${slug.padEnd(10)} pdfs=${links.length} wins=${wins}`);
  }
}
main();
