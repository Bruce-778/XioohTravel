export type TokyoWardPricingCode =
  | "TOKYO_CHIYODA"
  | "TOKYO_CHUO"
  | "TOKYO_MINATO"
  | "TOKYO_SHINJUKU"
  | "TOKYO_BUNKYO"
  | "TOKYO_TAITO"
  | "TOKYO_SUMIDA"
  | "TOKYO_KOTO"
  | "TOKYO_SHINAGAWA"
  | "TOKYO_MEGURO"
  | "TOKYO_OTA"
  | "TOKYO_SETAGAYA"
  | "TOKYO_SHIBUYA"
  | "TOKYO_NAKANO"
  | "TOKYO_SUGINAMI"
  | "TOKYO_TOSHIMA"
  | "TOKYO_KITA"
  | "TOKYO_ARAKAWA"
  | "TOKYO_ITABASHI"
  | "TOKYO_NERIMA"
  | "TOKYO_ADACHI"
  | "TOKYO_KATSUSHIKA"
  | "TOKYO_EDOGAWA";

export type OtherPricingZoneCode = "YOKOHAMA" | "OSAKA_CITY" | "KYOTO_CITY";
export type PricingZoneCode = TokyoWardPricingCode | OtherPricingZoneCode;

export type PricingZone = {
  code: PricingZoneCode;
  city: "Tokyo" | "Yokohama" | "Osaka" | "Kyoto";
  name: { zh: string; en: string };
  aliases: string[];
};

export const TOKYO_WARD_PRICING_ZONES: PricingZone[] = [
  {
    code: "TOKYO_CHIYODA",
    city: "Tokyo",
    name: { zh: "千代田区", en: "Chiyoda City" },
    aliases: ["chiyoda", "chiyoda city", "chiyoda ward", "chiyoda-ku", "千代田区", "千代田", "東京駅", "东京站", "tokyo station", "marunouchi", "丸の内", "丸之内", "akihabara", "秋葉原", "秋叶原"],
  },
  {
    code: "TOKYO_CHUO",
    city: "Tokyo",
    name: { zh: "中央区", en: "Chuo City" },
    aliases: ["chuo", "chuo city", "chuo ward", "chuo-ku", "中央区", "中央", "ginza", "銀座", "银座", "nihonbashi", "日本橋", "日本桥", "tsukiji", "築地", "筑地"],
  },
  {
    code: "TOKYO_MINATO",
    city: "Tokyo",
    name: { zh: "港区", en: "Minato City" },
    aliases: ["minato", "minato city", "minato ward", "minato-ku", "港区", "港", "roppongi", "六本木", "akasaka", "赤坂", "shinagawa station", "品川駅", "品川站", "tokyo tower", "東京タワー", "东京塔"],
  },
  {
    code: "TOKYO_SHINJUKU",
    city: "Tokyo",
    name: { zh: "新宿区", en: "Shinjuku City" },
    aliases: ["shinjuku", "shinjuku city", "shinjuku ward", "shinjuku-ku", "新宿区", "新宿"],
  },
  {
    code: "TOKYO_BUNKYO",
    city: "Tokyo",
    name: { zh: "文京区", en: "Bunkyo City" },
    aliases: ["bunkyo", "bunkyo city", "bunkyo ward", "bunkyo-ku", "文京区", "文京", "tokyo dome", "東京ドーム", "东京巨蛋"],
  },
  {
    code: "TOKYO_TAITO",
    city: "Tokyo",
    name: { zh: "台东区", en: "Taito City" },
    aliases: ["taito", "taito city", "taito ward", "taito-ku", "台東区", "台东区", "台東", "台东", "asakusa", "浅草", "ueno", "上野"],
  },
  {
    code: "TOKYO_SUMIDA",
    city: "Tokyo",
    name: { zh: "墨田区", en: "Sumida City" },
    aliases: ["sumida", "sumida city", "sumida ward", "sumida-ku", "墨田区", "墨田", "tokyo skytree", "東京スカイツリー", "东京晴空塔", "押上"],
  },
  {
    code: "TOKYO_KOTO",
    city: "Tokyo",
    name: { zh: "江东区", en: "Koto City" },
    aliases: ["koto", "koto city", "koto ward", "koto-ku", "江東区", "江东区", "江東", "江东", "odaiba", "お台場", "台场", "toyosu", "豊洲", "丰洲"],
  },
  {
    code: "TOKYO_SHINAGAWA",
    city: "Tokyo",
    name: { zh: "品川区", en: "Shinagawa City" },
    aliases: ["shinagawa", "shinagawa city", "shinagawa ward", "shinagawa-ku", "品川区", "品川"],
  },
  {
    code: "TOKYO_MEGURO",
    city: "Tokyo",
    name: { zh: "目黑区", en: "Meguro City" },
    aliases: ["meguro", "meguro city", "meguro ward", "meguro-ku", "目黒区", "目黑区", "目黒", "目黑"],
  },
  {
    code: "TOKYO_OTA",
    city: "Tokyo",
    name: { zh: "大田区", en: "Ota City" },
    aliases: ["ota", "ota city", "ota ward", "ota-ku", "大田区", "大田", "kamata", "蒲田"],
  },
  {
    code: "TOKYO_SETAGAYA",
    city: "Tokyo",
    name: { zh: "世田谷区", en: "Setagaya City" },
    aliases: ["setagaya", "setagaya city", "setagaya ward", "setagaya-ku", "世田谷区", "世田谷"],
  },
  {
    code: "TOKYO_SHIBUYA",
    city: "Tokyo",
    name: { zh: "涩谷区", en: "Shibuya City" },
    aliases: ["shibuya", "shibuya city", "shibuya ward", "shibuya-ku", "渋谷区", "涩谷区", "渋谷", "涩谷", "harajuku", "原宿", "ebisu", "恵比寿", "惠比寿"],
  },
  {
    code: "TOKYO_NAKANO",
    city: "Tokyo",
    name: { zh: "中野区", en: "Nakano City" },
    aliases: ["nakano", "nakano city", "nakano ward", "nakano-ku", "中野区", "中野"],
  },
  {
    code: "TOKYO_SUGINAMI",
    city: "Tokyo",
    name: { zh: "杉并区", en: "Suginami City" },
    aliases: ["suginami", "suginami city", "suginami ward", "suginami-ku", "杉並区", "杉并区", "杉並", "杉并"],
  },
  {
    code: "TOKYO_TOSHIMA",
    city: "Tokyo",
    name: { zh: "丰岛区", en: "Toshima City" },
    aliases: ["toshima", "toshima city", "toshima ward", "toshima-ku", "豊島区", "丰岛区", "豊島", "丰岛", "ikebukuro", "池袋"],
  },
  {
    code: "TOKYO_KITA",
    city: "Tokyo",
    name: { zh: "北区", en: "Kita City" },
    aliases: ["kita city", "kita ward", "kita-ku", "東京都北区", "东京北区", "東京北区", "北区"],
  },
  {
    code: "TOKYO_ARAKAWA",
    city: "Tokyo",
    name: { zh: "荒川区", en: "Arakawa City" },
    aliases: ["arakawa", "arakawa city", "arakawa ward", "arakawa-ku", "荒川区", "荒川"],
  },
  {
    code: "TOKYO_ITABASHI",
    city: "Tokyo",
    name: { zh: "板桥区", en: "Itabashi City" },
    aliases: ["itabashi", "itabashi city", "itabashi ward", "itabashi-ku", "板橋区", "板桥区", "板橋", "板桥"],
  },
  {
    code: "TOKYO_NERIMA",
    city: "Tokyo",
    name: { zh: "练马区", en: "Nerima City" },
    aliases: ["nerima", "nerima city", "nerima ward", "nerima-ku", "練馬区", "练马区", "練馬", "练马"],
  },
  {
    code: "TOKYO_ADACHI",
    city: "Tokyo",
    name: { zh: "足立区", en: "Adachi City" },
    aliases: ["adachi", "adachi city", "adachi ward", "adachi-ku", "足立区", "足立"],
  },
  {
    code: "TOKYO_KATSUSHIKA",
    city: "Tokyo",
    name: { zh: "葛饰区", en: "Katsushika City" },
    aliases: ["katsushika", "katsushika city", "katsushika ward", "katsushika-ku", "葛飾区", "葛饰区", "葛飾", "葛饰"],
  },
  {
    code: "TOKYO_EDOGAWA",
    city: "Tokyo",
    name: { zh: "江户川区", en: "Edogawa City" },
    aliases: ["edogawa", "edogawa city", "edogawa ward", "edogawa-ku", "江戸川区", "江户川区", "江戸川", "江户川"],
  },
];

export const OTHER_PRICING_ZONES: PricingZone[] = [
  {
    code: "YOKOHAMA",
    city: "Yokohama",
    name: { zh: "横滨", en: "Yokohama" },
    aliases: ["yokohama", "yokohama city", "横浜", "横浜市", "横滨", "横滨市", "minatomirai", "みなとみらい"],
  },
  {
    code: "OSAKA_CITY",
    city: "Osaka",
    name: { zh: "大阪市区", en: "Osaka City" },
    aliases: ["osaka", "osaka city", "大阪", "大阪市", "umeda", "梅田", "namba", "難波", "难波", "dotonbori", "道頓堀", "道顿堀", "shinsaibashi", "心斎橋", "心斋桥"],
  },
  {
    code: "KYOTO_CITY",
    city: "Kyoto",
    name: { zh: "京都市区", en: "Kyoto City" },
    aliases: ["kyoto", "kyoto city", "京都市", "kyoto station", "京都駅", "京都站", "gion", "祇園", "祗园", "清水寺", "kiyomizu"],
  },
];

export const PRICING_ZONES = [...TOKYO_WARD_PRICING_ZONES, ...OTHER_PRICING_ZONES] as const;

export const TOKYO_WARD_PRICING_CODES = TOKYO_WARD_PRICING_ZONES.map((zone) => zone.code);

export function normalizePricingZoneInput(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[()（）]/g, " ")
    .replace(/[〒]/g, " ")
    .replace(/[._/,，、・:：;；\-−–—ー]+/g, " ")
    .replace(/\s+/g, " ");
}

function hasCjkText(value: string) {
  return /[\u3040-\u30ff\u3400-\u9fff]/.test(value);
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function matchesAlias(normalizedInput: string, alias: string) {
  const normalizedAlias = normalizePricingZoneInput(alias);
  if (!normalizedInput || !normalizedAlias) return false;
  if (normalizedInput === normalizedAlias) return true;

  if (hasCjkText(normalizedAlias)) {
    return normalizedInput.includes(normalizedAlias);
  }

  const pattern = new RegExp(`(^|\\s)${escapeRegExp(normalizedAlias)}(\\s|$)`);
  return pattern.test(normalizedInput);
}

function findByCode(input: string) {
  const upper = input.trim().toUpperCase();
  return PRICING_ZONES.find((zone) => zone.code === upper);
}

export function findPricingZoneByInput(input: string): PricingZone | undefined {
  const trimmed = input.trim();
  if (!trimmed) return undefined;

  const byCode = findByCode(trimmed);
  if (byCode) return byCode;

  const normalized = normalizePricingZoneInput(trimmed);
  if (!normalized) return undefined;

  for (const zone of OTHER_PRICING_ZONES) {
    if (zone.aliases.some((alias) => matchesAlias(normalized, alias))) {
      return zone;
    }
  }

  const tokyoAliasMatches = TOKYO_WARD_PRICING_ZONES.flatMap((zone) =>
    zone.aliases.map((alias) => ({
      zone,
      alias,
      normalizedAlias: normalizePricingZoneInput(alias),
    }))
  ).sort((left, right) => right.normalizedAlias.length - left.normalizedAlias.length);

  for (const { zone, alias } of tokyoAliasMatches) {
    if (matchesAlias(normalized, alias)) {
      return zone;
    }
  }

  return undefined;
}

export function getPricingZoneByCode(code: string): PricingZone | undefined {
  return findByCode(code);
}
