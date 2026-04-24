import { dicts, type Locale } from "../src/lib/i18n/dicts";

const locales: Locale[] = ["zh", "en"];
const localeKeySets = Object.fromEntries(
  locales.map((locale) => [locale, new Set(Object.keys(dicts[locale]))])
) as Record<Locale, Set<string>>;

let hasMismatch = false;

for (const locale of locales) {
  const otherLocales = locales.filter((candidate) => candidate !== locale);
  for (const otherLocale of otherLocales) {
    const missing = [...localeKeySets[otherLocale]].filter((key) => !localeKeySets[locale].has(key)).sort();
    if (missing.length === 0) continue;

    hasMismatch = true;
    console.error(`Missing ${missing.length} keys in "${locale}" compared with "${otherLocale}":`);
    for (const key of missing) {
      console.error(`  - ${key}`);
    }
  }
}

if (hasMismatch) {
  process.exit(1);
}

console.log("i18n dictionaries are in parity.");
