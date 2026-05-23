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
  ["Shinjuku Station", "Shinjuku"],
  ["Shibuya Station", "Shibuya"],
  ["Umeda Station", "Umeda"],
  ["Kyoto Station", "Kyoto Station"],
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
