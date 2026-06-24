import { getPricingAreaCodeFromCandidates } from "../src/lib/locationData";

const cases: Array<[input: string, expected: string, address?: string]> = [
  ["HND T1 - 羽田机场 第1航站楼", "HND"],
  ["ITM", "ITM"],
  ["Itami Airport", "ITM"],
  ["大阪国際空港", "ITM"],
  ["Chiyoda City", "TOKYO_CHIYODA"],
  ["千代田区", "TOKYO_CHIYODA"],
  ["Tokyo Station", "TOKYO_CHIYODA"],
  ["Chuo City", "TOKYO_CHUO"],
  ["中央区", "TOKYO_CHUO"],
  ["Ginza", "TOKYO_CHUO"],
  ["銀座", "TOKYO_CHUO"],
  ["银座", "TOKYO_CHUO"],
  ["Minato City", "TOKYO_MINATO"],
  ["港区", "TOKYO_MINATO"],
  ["Roppongi", "TOKYO_MINATO"],
  ["Shinjuku", "TOKYO_SHINJUKU"],
  ["新宿区", "TOKYO_SHINJUKU"],
  ["Bunkyo City", "TOKYO_BUNKYO"],
  ["文京区", "TOKYO_BUNKYO"],
  ["Asakusa", "TOKYO_TAITO"],
  ["Ueno", "TOKYO_TAITO"],
  ["台東区", "TOKYO_TAITO"],
  ["Sumida City", "TOKYO_SUMIDA"],
  ["墨田区", "TOKYO_SUMIDA"],
  ["Koto City", "TOKYO_KOTO"],
  ["江東区", "TOKYO_KOTO"],
  ["Shinagawa City", "TOKYO_SHINAGAWA"],
  ["品川区", "TOKYO_SHINAGAWA"],
  ["Meguro City", "TOKYO_MEGURO"],
  ["目黒区", "TOKYO_MEGURO"],
  ["Ota City", "TOKYO_OTA"],
  ["大田区", "TOKYO_OTA"],
  ["Setagaya City", "TOKYO_SETAGAYA"],
  ["世田谷区", "TOKYO_SETAGAYA"],
  ["Shibuya", "TOKYO_SHIBUYA"],
  ["渋谷区", "TOKYO_SHIBUYA"],
  ["涩谷区", "TOKYO_SHIBUYA"],
  ["Nakano City", "TOKYO_NAKANO"],
  ["中野区", "TOKYO_NAKANO"],
  ["Suginami City", "TOKYO_SUGINAMI"],
  ["杉並区", "TOKYO_SUGINAMI"],
  ["Ikebukuro", "TOKYO_TOSHIMA"],
  ["豊島区", "TOKYO_TOSHIMA"],
  ["Kita City", "TOKYO_KITA"],
  ["東京都北区", "TOKYO_KITA"],
  ["Arakawa City", "TOKYO_ARAKAWA"],
  ["荒川区", "TOKYO_ARAKAWA"],
  ["Itabashi City", "TOKYO_ITABASHI"],
  ["板橋区", "TOKYO_ITABASHI"],
  ["Nerima City", "TOKYO_NERIMA"],
  ["練馬区", "TOKYO_NERIMA"],
  ["Adachi City", "TOKYO_ADACHI"],
  ["足立区", "TOKYO_ADACHI"],
  ["Katsushika City", "TOKYO_KATSUSHIKA"],
  ["葛飾区", "TOKYO_KATSUSHIKA"],
  ["Edogawa City", "TOKYO_EDOGAWA"],
  ["江戸川区", "TOKYO_EDOGAWA"],
  ["Some Hotel", "TOKYO_CHUO", "Tokyo, Chuo City, Ginza, 7 Chome"],
  ["On Flagship Store", "TOKYO_CHUO", "日本〒104-0061 Tokyo, Chuo City, Ginza, 7 Chome−9−19 銀座セブンビル"],
  ["Yokohama", "YOKOHAMA"],
  ["横浜市", "YOKOHAMA"],
  ["Some Yokohama Hotel", "YOKOHAMA", "Nishi Ward, Yokohama, Kanagawa, Japan"],
  ["Osaka", "OSAKA_CITY"],
  ["大阪市", "OSAKA_CITY"],
  ["Namba", "OSAKA_CITY"],
  ["Umeda", "OSAKA_CITY"],
  ["Dotonbori", "OSAKA_CITY"],
  ["Osaka Hotel", "OSAKA_CITY", "1 Chome Umeda, Kita Ward, Osaka, Japan"],
  ["Kyoto", "KYOTO_CITY"],
  ["京都市", "KYOTO_CITY"],
  ["Kyoto Station", "KYOTO_CITY"],
  ["Gion", "KYOTO_CITY"],
  ["Kyoto Hotel", "KYOTO_CITY", "Higashishiokoji Kamadonocho, Shimogyo Ward, Kyoto, Japan"],
  ["Some Random Address", "Some Random Address"],
];

const failures = cases
  .map(([input, expected, address]) => ({
    input,
    address,
    expected,
    actual: getPricingAreaCodeFromCandidates(input, address),
  }))
  .filter(({ actual, expected }) => actual !== expected);

if (failures.length > 0) {
  console.error("Location normalization check failed:");
  for (const failure of failures) {
    const addressText = failure.address ? ` / ${failure.address}` : "";
    console.error(`- ${failure.input}${addressText}: expected ${failure.expected}, got ${failure.actual}`);
  }
  process.exit(1);
}

console.log(`Location normalization check passed (${cases.length} cases).`);
