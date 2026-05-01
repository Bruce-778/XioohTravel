// 机场、航站楼、热门区域、酒店数据

export type AirportCode = "NRT" | "HND" | "KIX" | "NGO" | "CTS";

export interface AirportTerminal {
  code: AirportCode;
  name: { zh: string; en: string };
  terminals: Array<{ code: string; name: { zh: string; en: string } }>;
}

export interface PopularArea {
  code: string;
  name: { zh: string; en: string };
  city: string;
  lat?: number;
  lng?: number;
}

export interface PopularHotel {
  code: string;
  name: { zh: string; en: string };
  area: string;
  address?: string;
  lat?: number;
  lng?: number;
}

export const AIRPORTS: AirportTerminal[] = [
  {
    code: "NRT",
    name: { zh: "成田国际机场", en: "Narita International Airport" },
    terminals: [
      { code: "T1", name: { zh: "第1航站楼", en: "Terminal 1" } },
      { code: "T2", name: { zh: "第2航站楼", en: "Terminal 2" } },
      { code: "T3", name: { zh: "第3航站楼", en: "Terminal 3" } }
    ]
  },
  {
    code: "HND",
    name: { zh: "羽田机场", en: "Haneda Airport" },
    terminals: [
      { code: "T1", name: { zh: "第1航站楼", en: "Terminal 1" } },
      { code: "T2", name: { zh: "第2航站楼", en: "Terminal 2" } },
      { code: "T3", name: { zh: "第3航站楼", en: "Terminal 3" } }
    ]
  },
  {
    code: "KIX",
    name: { zh: "关西国际机场", en: "Kansai International Airport" },
    terminals: [
      { code: "T1", name: { zh: "第1航站楼", en: "Terminal 1" } },
      { code: "T2", name: { zh: "第2航站楼", en: "Terminal 2" } }
    ]
  },
  {
    code: "NGO",
    name: { zh: "中部国际机场", en: "Chubu Centrair International Airport" },
    terminals: [{ code: "T1", name: { zh: "航站楼", en: "Terminal" } }]
  },
  {
    code: "CTS",
    name: { zh: "新千岁机场", en: "New Chitose Airport" },
    terminals: [{ code: "T1", name: { zh: "航站楼", en: "Terminal" } }]
  }
];

export const POPULAR_AREAS: PopularArea[] = [
  { code: "Shinjuku", name: { zh: "新宿", en: "Shinjuku" }, city: "Tokyo", lat: 35.6938, lng: 139.7034 },
  { code: "Shibuya", name: { zh: "涩谷", en: "Shibuya" }, city: "Tokyo", lat: 35.6598, lng: 139.7006 },
  { code: "Ginza", name: { zh: "银座", en: "Ginza" }, city: "Tokyo", lat: 35.6719, lng: 139.7659 },
  { code: "Asakusa", name: { zh: "浅草", en: "Asakusa" }, city: "Tokyo", lat: 35.7148, lng: 139.7967 },
  { code: "Ueno", name: { zh: "上野", en: "Ueno" }, city: "Tokyo", lat: 35.7138, lng: 139.7773 },
  { code: "Ikebukuro", name: { zh: "池袋", en: "Ikebukuro" }, city: "Tokyo", lat: 35.7295, lng: 139.7169 },
  { code: "Namba", name: { zh: "难波", en: "Namba" }, city: "Osaka", lat: 34.6636, lng: 135.5017 },
  { code: "Umeda", name: { zh: "梅田", en: "Umeda" }, city: "Osaka", lat: 34.7054, lng: 135.4983 },
  { code: "Dotonbori", name: { zh: "道顿堀", en: "Dotonbori" }, city: "Osaka", lat: 34.6698, lng: 135.5019 },
  { code: "Gion", name: { zh: "祇园", en: "Gion" }, city: "Kyoto", lat: 35.0038, lng: 135.7749 },
  { code: "Kyoto Station", name: { zh: "京都站", en: "Kyoto Station" }, city: "Kyoto", lat: 34.9858, lng: 135.7581 }
];

export const POPULAR_HOTELS: PopularHotel[] = [
  {
    code: "shinjuku-grand",
    name: { zh: "新宿格兰贝尔酒店", en: "Shinjuku Grand Bell Hotel" },
    area: "Shinjuku",
    address: "Tokyo, Shinjuku"
  },
  {
    code: "shibuya-excel",
    name: { zh: "涩谷Excel酒店东急", en: "Shibuya Excel Hotel Tokyu" },
    area: "Shibuya",
    address: "Tokyo, Shibuya"
  },
  {
    code: "ginza-marriott",
    name: { zh: "银座万豪酒店", en: "Ginza Marriott Hotel" },
    area: "Ginza",
    address: "Tokyo, Ginza"
  },
  {
    code: "osaka-hilton",
    name: { zh: "大阪希尔顿酒店", en: "Osaka Hilton Hotel" },
    area: "Umeda",
    address: "Osaka, Umeda"
  },
  {
    code: "kyoto-hyatt",
    name: { zh: "京都凯悦酒店", en: "Kyoto Hyatt Regency" },
    area: "Kyoto Station",
    address: "Kyoto"
  }
];

export const VEHICLE_NAMES = {
  ECONOMY_5: "5座车（经济型）",
  BUSINESS_7: "7座车（商务型）",
  LARGE_9: "9座车（大空间）",
  LUXURY: "豪华型（VIP）",
  BUS: "大巴车（团体）"
};

const AIRPORT_ALIASES: Record<AirportCode, string[]> = {
  NRT: ["narita", "narita airport", "narita international airport", "成田机场", "成田国际机场"],
  HND: ["haneda", "haneda airport", "tokyo haneda airport", "羽田机场", "东京羽田机场"],
  KIX: ["kansai", "kansai airport", "kansai international airport", "关西机场", "关西国际机场"],
  NGO: ["centrair", "chubu", "chubu airport", "chubu centrair", "chubu centrair international airport", "中部机场", "中部国际机场"],
  CTS: ["new chitose", "new chitose airport", "sapporo airport", "新千岁机场"]
};

function normalizeLocationInput(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[()]/g, " ")
    .replace(/[._/,()-]+/g, " ")
    .replace(/\s+/g, " ");
}

function matchesAlias(normalizedInput: string, alias: string) {
  return normalizedInput === alias || normalizedInput.startsWith(`${alias} `);
}

function getAirportAliases(airport: AirportTerminal) {
  return [
    airport.code.toLowerCase(),
    normalizeLocationInput(airport.name.en),
    normalizeLocationInput(airport.name.zh),
    ...AIRPORT_ALIASES[airport.code].map(normalizeLocationInput),
  ];
}

export function findAirportByCode(code: string): AirportTerminal | undefined {
  return AIRPORTS.find((a) => a.code === code.toUpperCase());
}

export function findAreaByCode(code: string): PopularArea | undefined {
  return POPULAR_AREAS.find((a) => a.code === code);
}

export function findAreaByInput(input: string): PopularArea | undefined {
  const normalized = normalizeLocationInput(input);
  if (!normalized) return undefined;

  return POPULAR_AREAS.find((area) => {
    const aliases = [
      normalizeLocationInput(area.code),
      normalizeLocationInput(area.name.zh),
      normalizeLocationInput(area.name.en),
    ];
    return aliases.some((alias) => normalized === alias);
  });
}

export function findHotelByInput(input: string): PopularHotel | undefined {
  const normalized = normalizeLocationInput(input);
  if (!normalized) return undefined;

  return POPULAR_HOTELS.find((hotel) => {
    const aliases = [
      normalizeLocationInput(hotel.code),
      normalizeLocationInput(hotel.name.zh),
      normalizeLocationInput(hotel.name.en),
    ];
    return aliases.some((alias) => normalized === alias);
  });
}

export function findAirportByInput(input: string): AirportTerminal | undefined {
  const raw = input.trim();
  if (!raw) return undefined;

  const directCode = raw.toUpperCase().match(/^([A-Z]{3})(?:\b|\s|[-_/])/);
  if (directCode) {
    const airport = findAirportByCode(directCode[1]);
    if (airport) return airport;
  }

  const byBareCode = findAirportByCode(raw);
  if (byBareCode) return byBareCode;

  const normalized = normalizeLocationInput(raw);

  for (const airport of AIRPORTS) {
    const aliases = getAirportAliases(airport);
    if (aliases.some((alias) => matchesAlias(normalized, alias))) {
      return airport;
    }
  }

  return undefined;
}

export function isKnownPricingLocationInput(input: string) {
  return Boolean(findAirportByInput(input) || findAreaByInput(input) || findHotelByInput(input));
}

export function searchLocations(query: string, locale: string = "zh"): Array<PopularArea | PopularHotel> {
  const q = query.toLowerCase().trim();
  if (!q) return [];
  const isZh = locale.startsWith("zh");
  const results: Array<PopularArea | PopularHotel> = [];

  for (const area of POPULAR_AREAS) {
    const name = isZh ? area.name.zh : area.name.en;
    if (name.toLowerCase().includes(q) || area.code.toLowerCase().includes(q)) {
      results.push(area);
    }
  }

  for (const hotel of POPULAR_HOTELS) {
    const name = isZh ? hotel.name.zh : hotel.name.en;
    if (name.toLowerCase().includes(q) || hotel.code.toLowerCase().includes(q)) {
      results.push(hotel);
    }
  }

  return results.slice(0, 10);
}

/**
 * 从选中的地点字符串中提取用于匹配报价规则的代码
 * 1. 机场相关输入统一归一化为机场代码，例如 NRT / Narita airport -> NRT
 * 2. 热门酒店返回其所属区域代码
 * 3. 热门区域统一归一化为区域代码
 * 4. 未知区域按原始文本（trim 后）保留，支持自定义价格区域
 */
export function getPricingAreaCode(location: string): string {
  const trimmed = location.trim();
  if (!trimmed) return "";

  const airport = findAirportByInput(trimmed);
  if (airport) {
    return airport.code;
  }

  const area = findAreaByInput(trimmed);
  if (area) return area.code;

  const hotel = findHotelByInput(trimmed);
  if (hotel) return hotel.area;

  return trimmed;
}

/**
 * 将存储在 URL 或数据库中的原始位置名称本地化
 */
export function getLocalizedLocation(location: string, locale: string = "zh"): string {
  const trimmed = location.trim();
  if (!trimmed) return "";

  const isZh = locale.startsWith("zh");

  const airportMatch = trimmed.match(/^([A-Z]{3})\s+([A-Z0-9]+)(\s+-\s+(.+))?$/);
  if (airportMatch) {
    const [, code, terminalCode] = airportMatch;
    const airport = findAirportByCode(code);
    if (airport) {
      const terminal = airport.terminals.find((item) => item.code === terminalCode);
      const airportName = isZh ? airport.name.zh : airport.name.en;
      const terminalName = terminal
        ? (isZh ? terminal.name.zh : terminal.name.en)
        : terminalCode;
      return `${code} ${terminalCode} - ${airportName} ${terminalName}`;
    }
  }

  const airport = findAirportByInput(trimmed);
  if (airport) {
    const airportName = isZh ? airport.name.zh : airport.name.en;
    return `${airportName} (${airport.code})`;
  }

  const area = findAreaByInput(trimmed);
  if (area) {
    return isZh ? area.name.zh : area.name.en;
  }

  const hotel = findHotelByInput(trimmed);
  if (hotel) {
    return isZh ? hotel.name.zh : hotel.name.en;
  }

  return trimmed;
}
