"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  AIRPORTS,
  getLocalizedLocation,
} from "@/lib/locationData";
import { loadGoogleMaps, logGoogleMapsDiagnostic } from "@/lib/googleMapsClient";

export type LocationSuggestionType = "airport" | "google";

export type LocationSelection = {
  value: string;
  displayAddress?: string;
  placeId?: string;
  type: LocationSuggestionType;
};

type LocationSuggestion = {
  text: string;
  subtitle?: string;
  displayAddress?: string;
  placeId?: string;
  type: LocationSuggestionType;
};

type LocationSelectorProps = {
  value: string;
  onChange: (value: string, selection?: LocationSelection) => void;
  displayValue?: string;
  placeholder?: string;
  label?: string;
  isAirport?: boolean;
  locale?: string;
  className?: string;
  tip?: string;
  labels?: {
    searching: string;
    noResults: string;
    googleConfigError: string;
    googlePowered: string;
  };
};

function getGoogleDisplayAddress({
  mainText,
  secondaryText,
  description,
}: {
  mainText?: string;
  secondaryText?: string;
  description?: string;
}) {
  const fullDescription = description?.trim();
  if (fullDescription) {
    return fullDescription;
  }

  return [mainText, secondaryText].map((item) => item?.trim()).filter(Boolean).join(", ");
}

// 真实 Google Places Autocomplete 搜索逻辑
function getGoogleMapsLocale(locale: string) {
  return locale.startsWith("zh") ? "zh-CN" : "en";
}

const searchGooglePlaces = async (query: string, locale: string): Promise<LocationSuggestion[]> => {
  if (query.length < 2) return [];

  const googleLocale = getGoogleMapsLocale(locale);
  let g: any;
  try {
    g = await loadGoogleMaps(["places"], locale);
  } catch (error) {
    logGoogleMapsDiagnostic("Places Autocomplete is unavailable", {
      message: error instanceof Error ? error.message : String(error),
      query,
    });
    return [];
  }

  return new Promise((resolve) => {
    const service = new g.maps.places.AutocompleteService();
    service.getPlacePredictions(
      {
        input: query,
        componentRestrictions: { country: "jp" },
        language: googleLocale,
        region: "JP",
        types: ["establishment", "geocode"],
      },
      (predictions: any[], status: string) => {
        if (status !== g.maps.places.PlacesServiceStatus.OK || !predictions) {
          resolve([]);
          return;
        }

        const results: LocationSuggestion[] = predictions.map((p: any) => {
          const mainText = String(p.structured_formatting?.main_text ?? "").trim();
          const secondaryText = String(p.structured_formatting?.secondary_text ?? "").trim();
          const description = String(p.description ?? "").trim();
          const displayAddress = getGoogleDisplayAddress({
            mainText,
            secondaryText,
            description,
          });
          const fallbackText = displayAddress.split(",")[0]?.trim() || query;

          return {
            text: mainText || fallbackText,
            subtitle: displayAddress,
            displayAddress,
            type: "google",
            placeId: p.place_id,
          };
        });
        resolve(results);
      }
    );
  });
};

export function LocationSelector({
  value,
  onChange,
  displayValue,
  placeholder,
  label,
  isAirport = false,
  locale = "zh",
  className = "",
  tip,
  labels
}: LocationSelectorProps) {
  // 加载 Google Maps 脚本
  useEffect(() => {
    let isActive = true;

    if (isAirport) {
      setApiError(false);
      return () => {
        isActive = false;
      };
    }

    loadGoogleMaps(["places"], locale)
      .then(() => {
        if (isActive) {
          setApiError(false);
        }
      })
      .catch((error) => {
        logGoogleMapsDiagnostic("Places Autocomplete failed to initialize", {
          message: error instanceof Error ? error.message : String(error),
        });
        if (isActive) {
          setApiError(true);
        }
      });

    return () => {
      isActive = false;
    };
  }, [isAirport, locale]);

  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [googleResults, setGoogleResults] = useState<LocationSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState<boolean>(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const isZh = locale.startsWith("zh");

  const searchQueryRef = useRef("");

  const updateSearchQuery = useCallback((next: string) => {
    searchQueryRef.current = next;
    setSearchQuery(next);
  }, []);

  // 关闭下拉框。非机场模式下，如果用户输入了地址但没有点选任何建议项，
  // 把输入的文本保留为自由地址，避免静默回退到上一次的值导致按错地址下单。
  const closeDropdown = useCallback(
    (options?: { commitTyped?: boolean }) => {
      setIsOpen(false);
      const typed = searchQueryRef.current.trim();
      if ((options?.commitTyped ?? true) && !isAirport && typed.length >= 2 && typed !== value) {
        onChange(typed, { value: typed, type: "google" });
      }
      updateSearchQuery("");
    },
    [isAirport, onChange, updateSearchQuery, value]
  );

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        closeDropdown();
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [closeDropdown]);

  // 处理 Google Maps 搜索逻辑
  useEffect(() => {
    if (!isAirport && searchQuery.length >= 2) {
      setIsLoading(true);
      let isActive = true;
      const timer = setTimeout(async () => {
        const results = await searchGooglePlaces(searchQuery, locale);
        if (isActive) {
          setGoogleResults(results);
          setIsLoading(false);
        }
      }, 500);
      return () => {
        isActive = false;
        clearTimeout(timer);
      };
    } else {
      setGoogleResults([]);
      setIsLoading(false);
    }
  }, [searchQuery, isAirport, locale]);

  const handleSelect = (suggestion: LocationSuggestion) => {
    onChange(suggestion.text, {
      value: suggestion.text,
      displayAddress: suggestion.type === "google" ? suggestion.displayAddress : undefined,
      placeId: suggestion.placeId,
      type: suggestion.type,
    });
    closeDropdown({ commitTyped: false });
  };

  const suggestions: LocationSuggestion[] = [];

  if (isAirport) {
    // 机场模式：展示所有机场和航站楼
    for (const airport of AIRPORTS) {
      const airportName = isZh ? airport.name.zh : airport.name.en;
      for (const terminal of airport.terminals) {
        const terminalName = isZh ? terminal.name.zh : terminal.name.en;
        const fullText = `${airport.code} ${terminal.code} - ${airportName} ${terminalName}`;
        if (!searchQuery || fullText.toLowerCase().includes(searchQuery.toLowerCase())) {
          suggestions.push({
            text: fullText,
            subtitle: `${airport.code} ${terminal.code}`,
            type: "airport"
          });
        }
      }
    }
  }

  const filteredSuggestions = suggestions.slice(0, 8);
  const allResults = [...filteredSuggestions, ...googleResults];

  const selectedDisplayValue = displayValue?.trim() || getLocalizedLocation(value, locale);
  const inputDisplayValue = isOpen ? searchQuery : selectedDisplayValue;
  const shouldShowDropdown = isOpen && (isAirport || searchQuery.length >= 2);

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {label ? (
        <div className="mb-1.5 flex items-center gap-1.5 text-sm font-semibold text-slate-900">
          {isAirport ? (
            <svg className="w-4 h-4 text-brand-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          ) : (
            <svg className="w-4 h-4 text-brand-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          )}
          {label}
        </div>
      ) : null}
      
      <div className="relative group">
        <input
          type="text"
          className="w-full pl-3 pr-10 py-2.5 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all cursor-pointer"
          value={inputDisplayValue}
          title={inputDisplayValue}
          readOnly={isAirport && !isOpen} // 机场模式未打开时只读，点击触发下拉
          onChange={(e) => {
            updateSearchQuery(e.target.value);
            if (!isOpen) setIsOpen(true);
          }}
          onFocus={() => {
            setIsOpen(true);
            updateSearchQuery(""); // 聚焦时清空搜索，展示完整列表
          }}
          placeholder={placeholder}
        />
        
        {/* 下拉箭头图标 */}
        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 group-hover:text-brand-500 transition-colors">
          <svg className={`w-5 h-5 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>

        {shouldShowDropdown && (
          <div className="absolute z-[100] w-full mt-1.5 bg-white border border-slate-200 rounded-2xl shadow-xl max-h-80 overflow-y-auto animate-in fade-in slide-in-from-top-2 duration-200">
            {isLoading && (
              <div className="px-4 py-3 text-sm text-slate-500 flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
                {labels?.searching}
              </div>
            )}
            
            {allResults.length > 0 ? (
              <div className="py-2">
                {allResults.map((s, i) => (
                  <button
                    key={i}
                    type="button"
                    className="w-full text-left px-4 py-3 hover:bg-brand-50 transition-colors flex items-start gap-3 border-b border-slate-50 last:border-0"
                    onClick={() => handleSelect(s)}
                  >
                    <div className="mt-0.5">
                      {s.type === "airport" && (
                        <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                        </svg>
                      )}
                      {s.type === "google" && (
                        <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        </svg>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div
                        className={`font-semibold text-sm text-slate-900 ${
                          s.type === "google" ? "whitespace-normal break-words" : "truncate"
                        }`}
                      >
                        {s.text}
                      </div>
                      {s.subtitle && (
                        <div
                          className={`text-xs text-slate-500 mt-0.5 ${
                            s.type === "google" ? "whitespace-normal break-words leading-snug" : "truncate"
                          }`}
                        >
                          {s.subtitle}
                        </div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            ) : !isLoading && (
              <div className="px-4 py-8 text-center">
                <div className="text-slate-400 mb-1">
                  <svg className="w-8 h-8 mx-auto mb-2 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  {labels?.noResults}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      
      {!isAirport && (
        <div className="mt-2 text-[11px] flex items-center gap-1 px-1">
          {apiError ? (
            <span className="text-rose-500 flex items-center gap-1">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {labels?.googleConfigError}
            </span>
          ) : (
            <span className="text-slate-400 flex items-center gap-1">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {tip || labels?.googlePowered}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
