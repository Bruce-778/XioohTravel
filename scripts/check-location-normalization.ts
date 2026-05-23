import { getPricingAreaCode } from "../src/lib/locationData";

const cases: Array<[input: string, expected: string]> = [
  ["HND T1 - 羽田机场 第1航站楼", "HND"],
  ["Ginza", "Ginza"],
  ["银座", "Ginza"],
  ["銀座", "Ginza"],
  ["Ginza Station", "Ginza"],
  ["银座站", "Ginza"],
  ["銀座駅", "Ginza"],
  ["Ginza SIX", "Ginza"],
  ["Tokyo, Chuo City, Ginza, 7 Chome", "Ginza"],
  [
    "日本〒104-0061 Tokyo, Chuo City, Ginza, 7 Chome−9−19 銀座セブンビル，On Flagship Store Tokyo Ginza",
    "Ginza",
  ],
  ["東京都中央区銀座7丁目9-19", "Ginza"],
  ["Shinjuku Station", "Shinjuku"],
  ["Shibuya Station", "Shibuya"],
  ["Umeda Station", "Umeda"],
  ["Kyoto Station", "Kyoto Station"],
  ["Chuo City", "Chuo City"],
  ["Tokyo", "Tokyo"],
  ["Some Random Address", "Some Random Address"],
];

const failures = cases
  .map(([input, expected]) => ({ input, expected, actual: getPricingAreaCode(input) }))
  .filter(({ actual, expected }) => actual !== expected);

if (failures.length > 0) {
  console.error("Location normalization check failed:");
  for (const failure of failures) {
    console.error(`- ${failure.input}: expected ${failure.expected}, got ${failure.actual}`);
  }
  process.exit(1);
}

console.log(`Location normalization check passed (${cases.length} cases).`);
