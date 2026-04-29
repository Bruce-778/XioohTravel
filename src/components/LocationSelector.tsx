"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  AIRPORTS,
  POPULAR_AREAS,
  POPULAR_HOTELS,
  getLocalizedLocation,
  type AirportTerminal,
  type PopularArea,
  type PopularHotel
} from "@/lib/locationData";

type LocationSelectorProps = {
  value: string;
  onChange: (value: string) => void;
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

// 真实 Google Places Autocomplete 搜索逻辑
const searchGooglePlaces = async (query: string): Promise<any[]> => {
  if (query.length < 2) return [];
  
  const g = (window as any).google;
  // 检查 Google Maps 是否已加载
  if (typeof window === 'undefined' || !g || !g.maps || !g.maps.places) {
    console.warn("Google Maps API not loaded");
    // 回退到模拟数据，方便演示
    return [
      { text: `${query} Station`, subtitle: "Railway Station, Japan", type: "google" },
      { text: `Hotel ${query}`, subtitle: "Hotel, Japan", type: "google" },
      { text: `${query} Building`, subtitle: "Building, Japan", type: "google" },
    ];
  }

  return new Promise((resolve) => {
    const service = new g.maps.places.AutocompleteService();
    service.getPlacePredictions(
      {
        input: query,
        componentRestrictions: { country: 'jp' }, // 限制在日本
        types: ['establishment', 'geocode'] // 搜索建筑和地理位置
      },
      (predictions: any[], status: string) => {
        if (status !== g.maps.places.PlacesServiceStatus.OK || !predictions) {
          resolve([]);
          return;
        }

        const results = predictions.map((p: any) => ({
          text: p.structured_formatting.main_text,
          subtitle: p.structured_formatting.secondary_text,
          type: "google",
          placeId: p.place_id
        }));
        resolve(results);
      }
    );
  });
};

export function LocationSelector({
  value,
  onChange,
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
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    
    if (!apiKey || !apiKey.startsWith("AIza")) {
      console.warn("Invalid or missing Google Maps API Key in .env");
      setApiError(true);
      return;
    }

    // 如果已经存在 google 对象，说明已加载成功
    if ((window as any).google?.maps?.places) return;

    // 检查是否已经有正在加载的脚本
    if ((window as any).__googleMapsLoading) return;
    const existingScript = document.getElementById("google-maps-script");
    if (existingScript) return;

    // 标记正在加载，防止多个组件同时触发
    (window as any).__googleMapsLoading = true;

    // 监听认证失败
    (window as any).gm_authFailure = () => {
      console.error("Google Maps authentication failed (InvalidKeyMapError)");
      setApiError(true);
      (window as any).__googleMapsLoading = false;
    };

    const script = document.createElement("script");
    script.id = "google-maps-script";
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      (window as any).__googleMapsLoading = false;
    };
    script.onerror = () => {
      console.error("Failed to load Google Maps script");
      setApiError(true);
      (window as any).__googleMapsLoading = false;
    };
    document.head.appendChild(script);
  }, []);

  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [googleResults, setGoogleResults] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState<boolean>(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const isZh = locale.startsWith("zh");

  // 关闭下拉框
  const closeDropdown = useCallback(() => {
    setIsOpen(false);
    setShowSuggestions(false);
    setSearchQuery("");
  }, []);

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
      const timer = setTimeout(async () => {
        const results = await searchGooglePlaces(searchQuery);
        setGoogleResults(results);
        setIsLoading(false);
      }, 500);
      return () => clearTimeout(timer);
    } else {
      setGoogleResults([]);
    }
  }, [searchQuery, isAirport]);

  const handleSelect = (text: string) => {
    onChange(text);
    closeDropdown();
  };

  const suggestions: Array<{ text: string; subtitle?: string; type: "airport" | "area" | "hotel" | "google" }> = [];

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
  } else {
    // 地点模式：先展示热门，再展示 Google 搜索结果
    // 热门区域
    for (const area of POPULAR_AREAS) {
      const name = isZh ? area.name.zh : area.name.en;
      if (!searchQuery || name.toLowerCase().includes(searchQuery.toLowerCase()) || area.code.toLowerCase().includes(searchQuery.toLowerCase())) {
        suggestions.push({
          text: name,
          subtitle: area.city,
          type: "area"
        });
      }
    }
    // 热门酒店
    for (const hotel of POPULAR_HOTELS) {
      const name = isZh ? hotel.name.zh : hotel.name.en;
      if (!searchQuery || name.toLowerCase().includes(searchQuery.toLowerCase())) {
        suggestions.push({
          text: name,
          subtitle: hotel.area,
          type: "hotel"
        });
      }
    }
  }

  const filteredSuggestions = suggestions.slice(0, 8);
  const allResults = [...filteredSuggestions, ...googleResults];

  const displayValue = isOpen ? searchQuery : getLocalizedLocation(value, locale);

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
          value={displayValue}
          readOnly={isAirport && !isOpen} // 机场模式未打开时只读，点击触发下拉
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setShowSuggestions(true);
            if (!isOpen) setIsOpen(true);
          }}
          onFocus={() => {
            setIsOpen(true);
            setShowSuggestions(true);
            setSearchQuery(""); // 聚焦时清空搜索，展示完整列表
          }}
          placeholder={placeholder}
        />
        
        {/* 下拉箭头图标 */}
        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 group-hover:text-brand-500 transition-colors">
          <svg className={`w-5 h-5 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>

        {isOpen && (
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
                    onClick={() => handleSelect(s.text)}
                  >
                    <div className="mt-0.5">
                      {s.type === "airport" && (
                        <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                        </svg>
                      )}
                      {s.type === "area" && (
                        <svg className="w-4 h-4 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        </svg>
                      )}
                      {s.type === "hotel" && (
                        <svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                      )}
                      {s.type === "google" && (
                        <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        </svg>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm text-slate-900 truncate">{s.text}</div>
                      {s.subtitle && (
                        <div className="text-xs text-slate-500 mt-0.5 truncate">{s.subtitle}</div>
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
