"use client";

import { useState, useEffect } from "react";
import { format, addMonths, subMinutes, subHours, parse, addDays, differenceInDays, isToday } from "date-fns";
import { tr, enUS, es, fr, de, zhCN, ar, ru, pt, ja } from "date-fns/locale";
import { translations, Language } from "@/lib/i18n";
import { CalendarIcon, Loader2, MapPin, ArrowRight, ArrowLeft, Share2, Check, Download, HelpCircle, Coffee, Globe, Sun, ChevronDown, Image as ImageIcon, RefreshCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";
import jsPDF from "jspdf";
import { toPng } from "html-to-image";

interface ScheduleRow {
  date: Date;
  sunrise: string;
  wakeTime: string;
  sleepTime: string;
  bedTime: string;
}

type LocationData = {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  country: string;
  admin1?: string;
};

const StepperInput = ({ t,  value, setValue, step, min, max, unit }: { t: any, value: string, setValue: (v: string) => void, step: number, min: number, max: number, unit: string }) => {
  return (
    <div className="flex items-center h-14 bg-zinc-50 border border-zinc-200 rounded-xl overflow-hidden shadow-sm transition-all">
      <button
        type="button"
        onClick={() => setValue(Math.max(min, Number(value) - step).toString())}
        className="w-16 h-full bg-white hover:bg-zinc-100 border-r border-zinc-200 text-zinc-600 font-bold text-2xl transition-colors active:bg-zinc-200"
      >
        -
      </button>
      <div className="flex-1 h-full flex items-center justify-center font-bold text-xl text-zinc-900 bg-white">
        {value} <span className="text-zinc-400 font-medium text-sm ml-1">{unit}</span>
      </div>
      <button
        type="button"
        onClick={() => setValue(Math.min(max, Number(value) + step).toString())}
        className="w-16 h-full bg-white hover:bg-zinc-100 border-l border-zinc-200 text-zinc-600 font-bold text-2xl transition-colors active:bg-zinc-200"
      >
        +
      </button>
    </div>
  );
};

const SunriseOffsetInput = ({ t,  value, setValue, step, min, max }: { t: any, value: string, setValue: (v: string) => void, step: number, min: number, max: number }) => {
  const num = Number(value);
  
  let content = <span className="font-medium text-zinc-700">{t.exactSunrise}</span>;
  if (num < 0) {
    content = (
      <>
        <span className="font-bold text-zinc-900">{Math.abs(num)} dk</span>
        <span className="font-normal text-zinc-500 ml-1.5">{t.before}</span>
      </>
    );
  } else if (num > 0) {
    content = (
      <>
        <span className="font-bold text-zinc-900">{num} dk</span>
        <span className="font-normal text-zinc-500 ml-1.5">{t.after}</span>
      </>
    );
  }

  return (
    <div className="flex items-center h-14 bg-zinc-50 border border-zinc-200 rounded-xl overflow-hidden shadow-sm transition-all">
      <button
        type="button"
        onClick={() => setValue(Math.max(min, num - step).toString())}
        className="w-16 h-full bg-white hover:bg-zinc-100 border-r border-zinc-200 text-zinc-600 font-bold text-2xl transition-colors active:bg-zinc-200"
      >
        -
      </button>
      <div className="flex-1 h-full flex items-center justify-center text-lg sm:text-xl bg-white px-2 text-center">
        {content}
      </div>
      <button
        type="button"
        onClick={() => setValue(Math.min(max, num + step).toString())}
        className="w-16 h-full bg-white hover:bg-zinc-100 border-l border-zinc-200 text-zinc-600 font-bold text-2xl transition-colors active:bg-zinc-200"
      >
        +
      </button>
    </div>
  );
};

export default function Home() {
  const [lang, setLang] = useState<Language>("en");
  const [langOpen, setLangOpen] = useState(false);
  const t = translations[lang];

  const getLocaleObj = () => {
    switch(lang) {
      case "tr": return tr;
      case "es": return es;
      case "fr": return fr;
      case "de": return de;
      case "zh": return zhCN;
      case "ar": return ar;
      case "ru": return ru;
      case "pt": return pt;
      case "ja": return ja;
      default: return enUS;
    }
  };

  const [mounted, setMounted] = useState(false);
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [sleepHours, setSleepHours] = useState<string>("8");
  const [bufferMins, setBufferMins] = useState<string>("10");
  
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<LocationData[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<LocationData | null>(null);
  const [locationOpen, setLocationOpen] = useState(false);
  
  const [sunriseOffset, setSunriseOffset] = useState<string>("-15");

  const [startDate, setStartDate] = useState<Date>(new Date());
  const [dateMode, setDateMode] = useState<"today" | "custom">("today");
  const [dateOpen, setDateOpen] = useState(false);
  const [months, setMonths] = useState<string>("1");
  
  const [schedule, setSchedule] = useState<ScheduleRow[]>([]);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setMounted(true);
    
    if (typeof window !== "undefined") {
      const browserLang = navigator.language.slice(0, 2) as Language;
      if (translations[browserLang]) setLang(browserLang);
      else setLang("en");

      const params = new URLSearchParams(window.location.search);
      if (params.has("lat") && params.has("lon") && params.has("sh")) {
        let lat = parseFloat(params.get("lat")!);
        let lon = parseFloat(params.get("lon")!);
        if (isNaN(lat) || lat < -90 || lat > 90) lat = 41.0082; // Fallback to Istanbul
        if (isNaN(lon) || lon < -180 || lon > 180) lon = 28.9784;
        fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=${lang}`)
          .then(r => r.json())
          .then(data => {
            const locName = data.city || data.locality || data.principalSubdivision || t.selectedLoc;
            setSelectedLocation({ id: 0, latitude: lat, longitude: lon, name: locName, country: data.countryName || "" });
          })
          .catch(() => {
            setSelectedLocation({ id: 0, latitude: lat, longitude: lon, name: t.selectedLoc, country: "" });
          });
          
        let sh = params.get("sh") || "8";
        let bm = params.get("bm") || "10";
        let so = params.get("so") || "-15";
        let mnths = params.get("m") || "1";
        
        // Strict Validation (Tamamen manipülasyona kapalı)
        const numSh = parseFloat(sh);
        if (isNaN(numSh) || numSh < 4 || numSh > 12) sh = "8";
        
        const numBm = parseInt(bm);
        if (isNaN(numBm) || numBm < 0 || numBm > 60) bm = "10";
        
        const numSo = parseInt(so);
        if (isNaN(numSo) || numSo < -120 || numSo > 120) so = "-15";
        
        const validMonths = ["1", "3", "6", "12"];
        if (!validMonths.includes(mnths)) mnths = "1";
        
        let startD = new Date();
        if (params.has("sd")) {
          const parsed = parse(params.get("sd")!, "yyyy-MM-dd", new Date());
          if (!isNaN(parsed.getTime())) {
            startD = parsed;
            setDateMode("custom");
          }
        }
        
        setSleepHours(sh);
        setBufferMins(bm);
        setSunriseOffset(so);
        setStartDate(startD);
        setMonths(mnths);
        
        generateSchedule(lat, lon, t.selectedLoc, sh, bm, so, startD, mnths);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchPrayerTimes = async (year: number, month: number, lat: number, lon: number) => {
    const res = await fetch(`https://api.aladhan.com/v1/calendar/${year}/${month}?latitude=${lat}&longitude=${lon}&method=13`);
    if (!res.ok) throw new Error("API Hatası");
    const json = await res.json();
    return json.data as Array<Record<string, unknown>>;
  };

  const generateSchedule = async (
    lat: number,
    lon: number,
    locName: string,
    sh: string,
    bm: string,
    so: string,
    startD: Date,
    mnths: string
  ) => {
    setLoading(true);
    setError(null);
    setSchedule([]);

    try {
      const results: ScheduleRow[] = [];
      const endDate = addMonths(startD, parseInt(mnths));
      const totalDays = differenceInDays(endDate, startD);

      let currentIterDate = new Date(startD);
      let apiData: Array<Record<string, unknown>> = [];
      
      while (currentIterDate <= endDate) {
        const y = currentIterDate.getFullYear();
        const m = currentIterDate.getMonth() + 1;
        const monthData = await fetchPrayerTimes(y, m, lat, lon);
        apiData = [...apiData, ...monthData];
        currentIterDate = addMonths(currentIterDate, 1);
      }

      for (let i = 0; i <= totalDays; i++) {
        const d = addDays(startD, i);
        const dStr = format(d, "dd-MM-yyyy");
        const dayData = apiData.find((a) => {
          const dateObj = a.date as { gregorian: { date: string } };
          return dateObj.gregorian.date === dStr;
        });
        
        if (!dayData) continue;

        const timings = dayData.timings as { Sunrise: string };
        const sunriseStr = timings.Sunrise.split(" ")[0];
        const dtSunrise = parse(sunriseStr, "HH:mm", d);

        let dtWake = dtSunrise;
        if (so) {
          dtWake = subMinutes(dtSunrise, parseInt(so) * -1);
        }

        const dtSleep = subHours(dtWake, parseFloat(sh));
        const dtBed = subMinutes(dtSleep, parseInt(bm));

        results.push({
          date: d,
          sunrise: format(dtSunrise, "HH:mm"),
          wakeTime: format(dtWake, "HH:mm"),
          sleepTime: format(dtSleep, "HH:mm"),
          bedTime: format(dtBed, "HH:mm"),
        });
      }

      setSchedule(results);
      setStep(5);
      
      const params = new URLSearchParams();
      params.set("lat", lat.toString());
      params.set("lon", lon.toString());
            params.set("sh", sh);
      params.set("bm", bm);
      params.set("so", so);
      params.set("sd", format(startD, "yyyy-MM-dd"));
      params.set("m", mnths);
      window.history.pushState(null, '', '?' + params.toString());
      
    } catch {
      setError(t.error);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = () => {
    if (!selectedLocation) return;
    generateSchedule(
      selectedLocation.latitude,
      selectedLocation.longitude,
      selectedLocation.name,
      sleepHours,
      bufferMins,
      sunriseOffset,
      startDate,
      months
    );
  };

  
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [isDownloadingImg, setIsDownloadingImg] = useState(false);

  const downloadPDF = async () => {
    const el = document.getElementById("printable-schedule");
    if (!el) return;
    const scrollContainer = el.querySelector(".overflow-auto") as HTMLElement | null;
    const originalMaxHeight = scrollContainer?.style.maxHeight || "";
    const originalOverflow = scrollContainer?.style.overflow || "";
    const originalWidth = el.style.width || "";
    const originalMinWidth = el.style.minWidth || "";

    setIsDownloadingPdf(true);
    try {
      el.classList.add("is-exporting");
      el.style.width = "850px";
      el.style.minWidth = "850px";

      if (scrollContainer) {
        scrollContainer.style.maxHeight = "none";
        scrollContainer.style.overflow = "visible";
      }

      const imgData = await toPng(el, {
        quality: 0.98,
        backgroundColor: "#ffffff",
        filter: (node) => !(node instanceof HTMLElement && node.classList.contains("no-print")),
      });

      const img = new Image();
      img.src = imgData;
      await new Promise((resolve) => {
        img.onload = resolve;
      });

      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "pt",
        format: "a4",
      });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 24;
      const printWidth = pageWidth - margin * 2;
      const printHeight = (img.height * printWidth) / img.width;
      const usableHeight = pageHeight - margin * 2;

      let heightLeft = printHeight;
      let page = 0;

      while (heightLeft > 0) {
        if (page > 0) {
          pdf.addPage();
        }
        const position = margin - (page * usableHeight);
        pdf.addImage(imgData, "PNG", margin, position, printWidth, printHeight);
        heightLeft -= usableHeight;
        page++;
      }

      pdf.save("sunrise-sleep-planner.pdf");
    } catch (err) {
      console.error("PDF generation failed:", err);
    } finally {
      el.style.width = originalWidth;
      el.style.minWidth = originalMinWidth;
      if (scrollContainer) {
        scrollContainer.style.maxHeight = originalMaxHeight;
        scrollContainer.style.overflow = originalOverflow;
      }
      el.classList.remove("is-exporting");
      setIsDownloadingPdf(false);
    }
  };

  const downloadImage = async () => {
    const el = document.getElementById("printable-schedule");
    if (!el) return;
    const scrollContainer = el.querySelector(".overflow-auto") as HTMLElement | null;
    const originalMaxHeight = scrollContainer?.style.maxHeight || "";
    const originalOverflow = scrollContainer?.style.overflow || "";
    const originalWidth = el.style.width || "";
    const originalMinWidth = el.style.minWidth || "";

    setIsDownloadingImg(true);
    try {
      el.classList.add("is-exporting");
      el.style.width = "850px";
      el.style.minWidth = "850px";

      if (scrollContainer) {
        scrollContainer.style.maxHeight = "none";
        scrollContainer.style.overflow = "visible";
      }

      const imgData = await toPng(el, {
        quality: 0.98,
        backgroundColor: "#ffffff",
        filter: (node) => !(node instanceof HTMLElement && node.classList.contains("no-print")),
      });

      const link = document.createElement("a");
      link.download = "sunrise-sleep-planner.png";
      link.href = imgData;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error("Image generation failed:", err);
    } finally {
      el.style.width = originalWidth;
      el.style.minWidth = originalMinWidth;
      if (scrollContainer) {
        scrollContainer.style.maxHeight = originalMaxHeight;
        scrollContainer.style.overflow = originalOverflow;
      }
      el.classList.remove("is-exporting");
      setIsDownloadingImg(false);
    }
  };

  if (!mounted) return null;

  const getOffsetString = (val: string) => {
    const num = Number(val);
    if (num < 0) return t.calcBefore.replace('{val}', Math.abs(num).toString());
    if (num > 0) return t.calcAfter.replace('{val}', num.toString());
    return t.calcExact;
  };

  return (
    <div className="min-h-screen bg-zinc-50 flex items-start justify-center p-4 md:p-8 font-sans">
      <div className={cn("w-full space-y-8 transition-all duration-700", step === 5 ? "max-w-4xl" : "max-w-xl")}>


        <div className="text-center space-y-4 no-print">
          <div className="flex justify-center mb-2 animate-in fade-in zoom-in duration-700">
            <Sun className="h-16 w-16 text-amber-400 drop-shadow-md" />
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight text-zinc-900">{t.title}</h1>
          <p className="text-zinc-500 font-medium">{t.subtitle}</p>
        </div>

        {step < 5 && (
          <Card className="border-0 shadow-xl bg-white/70 backdrop-blur-xl rounded-2xl relative z-10 overflow-visible no-print">
            <CardHeader className="pt-8 pb-4">
              <div className="flex justify-center items-center px-2">
                {[1, 2, 3, 4].map((s) => (
                  <div key={s} className="flex items-center">
                    <div className={cn("flex h-10 w-10 items-center justify-center rounded-full text-base font-bold transition-all duration-300", step >= s ? "bg-zinc-900 text-white shadow-md scale-110" : "bg-zinc-100 text-zinc-400")}>
                      {s}
                    </div>
                    {s < 4 && <div className={cn("h-1 w-8 sm:w-16 mx-2 sm:mx-4 rounded-full transition-all duration-300", step > s ? "bg-zinc-900" : "bg-zinc-100")} />}
                  </div>
                ))}
              </div>
            </CardHeader>
            
            <CardContent className="p-6 sm:p-10 pt-4">
              
              {/* STEP 1 */}
              {step === 1 && (
                <div className="space-y-8 animate-in fade-in slide-in-from-right-8 duration-500">
                  <div className="space-y-3">
                    <div>
                      <Label className="text-lg font-semibold text-zinc-800 inline mr-2">{t.q1}</Label>
                      <Popover>
                      <PopoverTrigger className="inline-flex align-middle text-zinc-400 hover:text-zinc-600 transition-colors focus:outline-none relative -top-[2px]"><HelpCircle className="h-5 w-5" /></PopoverTrigger>
                        <PopoverContent className="w-80 p-4 text-sm text-zinc-600 leading-relaxed shadow-xl rounded-xl border-zinc-200 bg-white" side="top">
                          <strong className="text-zinc-900 block mb-1 font-bold">{t.q1PopoverTitle}</strong> 
                          {t.q1PopoverText}
                        </PopoverContent>
                      </Popover>
                    </div>
                    <StepperInput t={t} value={sleepHours} setValue={setSleepHours} step={0.5} min={4} max={12} unit={t.unitHour} />
                  </div>
                  <div className="space-y-3">
                    <div>
                      <Label className="text-lg font-semibold text-zinc-800 inline mr-2">{t.q2}</Label>
                      <Popover>
                      <PopoverTrigger className="inline-flex align-middle text-zinc-400 hover:text-zinc-600 transition-colors focus:outline-none relative -top-[2px]"><HelpCircle className="h-5 w-5 flex-shrink-0" /></PopoverTrigger>
                        <PopoverContent className="w-80 p-4 text-sm text-zinc-600 leading-relaxed shadow-xl rounded-xl border-zinc-200 bg-white" side="top">
                          <strong className="text-zinc-900 block mb-1 font-bold">{t.q2PopoverTitle}</strong> 
                          {t.q2PopoverText}
                        </PopoverContent>
                      </Popover>
                    </div>
                    <StepperInput t={t} value={bufferMins} setValue={setBufferMins} step={5} min={0} max={60} unit={t.unitMin} />
                  </div>
                  <Button className="w-full h-14 rounded-xl text-lg font-semibold shadow-lg hover:shadow-xl transition-all" onClick={() => setStep(2)}>
                    {t.continue} <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </div>
              )}

              {/* STEP 2 */}
              {step === 2 && (
                <div className="space-y-8 animate-in fade-in slide-in-from-right-8 duration-500">
                  <div className="space-y-6">
                    <div className="flex flex-col gap-3 relative">
                      <Label className="text-lg font-semibold text-zinc-800">{t.q3Title}</Label>
                      <button 
                        onClick={() => setLocationOpen(!locationOpen)} 
                        className={cn("flex w-full items-center justify-between text-left h-14 px-4 text-lg font-normal bg-zinc-50/50 border border-zinc-200 rounded-xl hover:bg-zinc-100 transition-colors", !selectedLocation && "text-zinc-400")}
                      >
                        {selectedLocation ? `${selectedLocation.name}, ${selectedLocation.country}` : t.searchPlaceholder}
                        <MapPin className="ml-2 h-5 w-5 opacity-50" />
                      </button>
                      
                      {locationOpen && (
                        <div className="absolute top-full left-0 w-full h-0 z-50">
                          <div className="fixed inset-0 z-40" onClick={() => setLocationOpen(false)} />
                          <div className="absolute top-0 left-0 w-full mt-2 z-50 bg-white border border-zinc-200 shadow-xl rounded-xl overflow-hidden animate-in fade-in zoom-in-95 duration-100 origin-top">
                            <Command shouldFilter={false}>
                              <CommandInput 
                                autoFocus 
                                placeholder={t.searchHint} 
                                className="h-14 border-none ring-0 focus-visible:ring-0" 
                                value={searchQuery}
                                onValueChange={async (val) => {
                                  setSearchQuery(val);
                                  if (val.length < 2) {
                                    setSearchResults([]);
                                    return;
                                  }
                                  setIsSearching(true);
                                  try {
                                    const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(val)}&count=5&language=${lang}&format=json`);
                                    const data = await res.json();
                                    setSearchResults(data.results || []);
                                  } catch (e) {
                                    console.error(e);
                                  } finally {
                                    setIsSearching(false);
                                  }
                                }}
                              />
                              <CommandList className="max-h-64">
                                {isSearching ? (
                                  <div className="p-4 text-center text-sm text-zinc-500">{t.searching}</div>
                                ) : searchResults.length === 0 && searchQuery.length >= 2 ? (
                                  <CommandEmpty>{t.noResult}</CommandEmpty>
                                ) : (
                                  <CommandGroup>
                                    {searchResults.map((loc) => (
                                      <CommandItem 
                                        key={loc.id} 
                                        value={loc.id.toString()} 
                                        onSelect={() => { 
                                          setSelectedLocation(loc); 
                                          setLocationOpen(false); 
                                        }} 
                                        className="text-base cursor-pointer px-4 py-3 min-h-14"
                                      >
                                        <div>
                                          <div className="font-semibold text-zinc-900">{loc.name}</div>
                                          <div className="text-sm text-zinc-500">{loc.admin1 ? `${loc.admin1}, ` : ''}{loc.country}</div>
                                        </div>
                                      </CommandItem>
                                    ))}
                                  </CommandGroup>
                                )}
                              </CommandList>
                            </Command>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex gap-4">
                    <Button variant="outline" className="h-14 px-6 rounded-xl border-zinc-200 text-zinc-600" onClick={() => setStep(1)}><ArrowLeft className="mr-2 h-5 w-5" /></Button>
                    <Button className="h-14 flex-1 rounded-xl text-lg font-semibold shadow-lg hover:shadow-xl transition-all" disabled={!selectedLocation} onClick={() => setStep(3)}>{t.continue} <ArrowRight className="ml-2 h-5 w-5" /></Button>
                  </div>
                </div>
              )}

              {/* STEP 3 */}
              {step === 3 && (
                <div className="space-y-8 animate-in fade-in slide-in-from-right-8 duration-500">
                  <div className="space-y-3">
                    <Label className="text-lg font-semibold text-zinc-800">{t.q4}</Label>
                    <SunriseOffsetInput t={t} value={sunriseOffset} setValue={setSunriseOffset} step={5} min={-120} max={120} />
                  </div>
                  
                  <div className="flex gap-4">
                    <Button variant="outline" className="h-14 px-6 rounded-xl border-zinc-200 text-zinc-600" onClick={() => setStep(2)}><ArrowLeft className="mr-2 h-5 w-5" /></Button>
                    <Button className="h-14 flex-1 rounded-xl text-lg font-semibold shadow-lg hover:shadow-xl transition-all" onClick={() => setStep(4)}>{t.continue} <ArrowRight className="ml-2 h-5 w-5" /></Button>
                  </div>
                </div>
              )}

              {/* STEP 4 */}
              {step === 4 && (
                <div className="space-y-8 animate-in fade-in slide-in-from-right-8 duration-500">
                  <div className="space-y-4 flex flex-col">
                    <Label className="text-lg font-semibold text-zinc-800">{t.q5}</Label>
                    <div className="grid grid-cols-2 gap-3 sm:gap-4">
                      <div 
                        onClick={() => { setStartDate(new Date()); setDateMode("today"); }}
                        className={cn("cursor-pointer border-2 transition-all duration-200 rounded-xl flex flex-col items-center justify-center p-4", dateMode === "today" ? "border-zinc-900 bg-zinc-50 text-zinc-900 font-bold" : "border-zinc-100 bg-white text-zinc-500 hover:border-zinc-300")}
                      >
                        <CalendarIcon className="h-6 w-6 mb-2" />
                        <span className="text-base sm:text-lg">{t.startToday}</span>
                      </div>

                      <Popover open={dateOpen} onOpenChange={setDateOpen}>
                        <PopoverTrigger 
                          onClick={() => setDateMode("custom")}
                          className={cn("cursor-pointer border-2 transition-all duration-200 rounded-xl flex flex-col items-center justify-center p-4", dateMode === "custom" ? "border-zinc-900 bg-zinc-50 text-zinc-900 font-bold" : "border-zinc-100 bg-white text-zinc-500 hover:border-zinc-300")}
                        >
                          <CalendarIcon className="h-6 w-6 mb-2" />
                          <span className="text-base sm:text-lg">
                            {dateMode === "custom" && startDate ? format(startDate, "dd MMM", { locale: getLocaleObj() }) : t.customDate}
                          </span>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0 rounded-xl shadow-xl">
                          <Calendar 
                            mode="single" 
                            selected={startDate} 
                            onSelect={(d) => { if (d) { setStartDate(d); setDateMode("custom"); setDateOpen(false); } }} 
                            className="p-3" 
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <Label className="text-lg font-semibold text-zinc-800">{t.q6}</Label>
                    <div className="grid grid-cols-2 gap-3 sm:gap-4">
                      {[
                        { val: "1", label: t.m1 },
                        { val: "3", label: t.m3 },
                        { val: "6", label: t.m6 },
                        { val: "12", label: t.m12 }
                      ].map((opt) => (
                        <div 
                          key={opt.val}
                          onClick={() => setMonths(opt.val)}
                          className={cn("cursor-pointer border-2 transition-all duration-200 rounded-xl flex items-center justify-center py-4", months === opt.val ? "border-zinc-900 bg-zinc-50 text-zinc-900 font-bold" : "border-zinc-100 bg-white text-zinc-500 font-medium hover:border-zinc-300")}
                        >
                          <span className="text-lg">{opt.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {error && <div className="p-4 bg-red-50 text-red-600 rounded-xl text-sm font-medium border border-red-100">{error}</div>}

                  <div className="flex gap-4">
                    <Button variant="outline" className="h-14 px-6 rounded-xl border-zinc-200 text-zinc-600" onClick={() => setStep(3)}><ArrowLeft className="mr-2 h-5 w-5" /></Button>
                    <Button className="h-14 flex-1 rounded-xl text-lg font-bold shadow-xl hover:shadow-2xl hover:-translate-y-0.5 transition-all bg-zinc-900 text-white" disabled={loading} onClick={handleGenerate}>
                      {loading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : t.generate}
                    </Button>
                  </div>
                </div>
              )}

            </CardContent>
          </Card>
        )}

        {/* STEP 5: RESULT */}
        {step === 5 && schedule.length > 0 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-8 duration-700">
            <Card id="printable-schedule" className="border-0 shadow-2xl rounded-2xl overflow-hidden bg-white/90 backdrop-blur-xl">
              <div className="bg-white p-6 sm:p-8 flex flex-col gap-6 schedule-header">
                <div>
                  <h2 className="text-2xl sm:text-3xl font-extrabold text-zinc-900 mb-2 sm:mb-3">{t.resultTitle}</h2>
                  <div className="text-zinc-500 text-sm sm:text-base leading-relaxed min-h-[24px] flex items-center">
                    {selectedLocation ? (
                      <p>{t.resultDesc.replace("{loc}", selectedLocation.name || "").replace("{offset}", getOffsetString(sunriseOffset))}</p>
                    ) : (
                      <div className="h-4 w-64 bg-zinc-200 animate-pulse rounded-md"></div>
                    )}
                  </div>
                </div>
                
                <div className="flex flex-col sm:flex-row gap-3 sm:gap-3 w-full items-center no-print">
                  <div className="inline-flex rounded-xl border border-zinc-200 bg-white h-12 shadow-sm w-full sm:w-auto">
                    <button
                      type="button"
                      disabled={isDownloadingPdf || isDownloadingImg}
                      onClick={downloadPDF}
                      className="inline-flex flex-1 sm:flex-initial items-center justify-center px-4 sm:px-5 font-medium text-zinc-700 hover:bg-zinc-50 transition-colors rounded-l-xl disabled:opacity-50 text-sm sm:text-base outline-none"
                    >
                      {isDownloadingPdf ? (
                        <Loader2 className="h-5 w-5 mr-2 animate-spin text-zinc-500" />
                      ) : (
                        <Download className="h-5 w-5 mr-2 text-zinc-500" />
                      )}
                      {t.downloadPdf}
                    </button>
                    <div className="w-[1px] bg-zinc-200 my-2.5"></div>
                    <Popover>
                      <PopoverTrigger
                        disabled={isDownloadingPdf || isDownloadingImg}
                        className="px-2.5 hover:bg-zinc-50 transition-colors rounded-r-xl outline-none flex items-center justify-center text-zinc-500 hover:text-zinc-700 disabled:opacity-50"
                        aria-label="Download options"
                      >
                        <ChevronDown className="h-4 w-4" />
                      </PopoverTrigger>
                      <PopoverContent align="end" side="bottom" className="w-44 p-1.5 rounded-xl shadow-xl border-zinc-200 bg-white z-50">
                        <button
                          type="button"
                          disabled={isDownloadingImg}
                          onClick={downloadImage}
                          className="w-full flex items-center px-3 py-2 text-sm sm:text-base font-medium hover:bg-zinc-100 rounded-lg text-zinc-700 transition-colors disabled:opacity-50"
                        >
                          {isDownloadingImg ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin text-zinc-500" />
                          ) : (
                            <ImageIcon className="h-4 w-4 mr-2 text-zinc-500" />
                          )}
                          {t.downloadImg}
                        </button>
                      </PopoverContent>
                    </Popover>
                  </div>

                  <Button 
                    variant="outline" 
                    className="w-full sm:w-auto border-zinc-200 text-zinc-700 hover:bg-zinc-50 rounded-xl font-medium text-sm sm:text-base px-5 h-12 shadow-sm" 
                    onClick={() => {
                      navigator.clipboard.writeText(window.location.href);
                      setCopied(true);
                      setTimeout(() => setCopied(false), 2000);
                    }}
                  >
                    {copied ? <Check className="h-5 w-5 mr-2 text-green-600" /> : <Share2 className="h-5 w-5 mr-2 text-zinc-500" />}
                    {copied ? t.copied : t.share}
                  </Button>

                  <Button 
                    variant="outline" 
                    className="w-full sm:w-auto sm:ml-auto border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 hover:text-emerald-800 rounded-xl font-medium text-sm sm:text-base px-5 h-12 shadow-sm" 
                    onClick={() => { window.history.pushState(null, '', window.location.pathname); setStep(1); }}
                  >
                    <RefreshCcw className="h-5 w-5 mr-2 text-emerald-600" />
                    {t.startOver}
                  </Button>
                </div>
              </div>
              <CardContent className="px-6 sm:px-8 pb-6 sm:pb-8">
                <div className="max-h-[600px] overflow-auto print:max-h-none print:overflow-visible">
                  <Table className="w-full text-base">
                    <TableHeader className="bg-zinc-50 sticky top-0 shadow-sm z-10">
                      <TableRow className="border-b border-zinc-200">
                        <TableHead className="py-4 text-sm font-semibold text-zinc-500 uppercase tracking-wider">{t.colDate}</TableHead>
                        <TableHead className="py-4 text-sm font-semibold text-zinc-500 uppercase tracking-wider">{t.colDay}</TableHead>
                        <TableHead className="py-4 text-sm font-semibold text-zinc-500 uppercase tracking-wider">{t.colSun}</TableHead>
                        <TableHead className="py-4 text-sm font-semibold text-zinc-500 uppercase tracking-wider">{t.colWake}</TableHead>
                        <TableHead className="py-4 text-sm font-semibold text-zinc-500 uppercase tracking-wider">{t.colBed}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {schedule.map((row, i) => {
                        const today = isToday(row.date);
                        return (
                          <TableRow 
                            key={i} 
                            className={cn(
                              "transition-colors border-b",
                              today 
                                ? "bg-amber-50/60 hover:bg-amber-100/50 border-amber-200" 
                                : "hover:bg-zinc-50/50 border-zinc-100"
                            )}
                          >
                            <TableCell className={cn("py-4 font-medium", today ? "text-amber-900 font-bold" : "text-zinc-700")}>
                              {format(row.date, "dd MMM yyyy", { locale: getLocaleObj() })}
                              {today && <span className="ml-2 inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">{t.todayBadge}</span>}
                            </TableCell>
                            <TableCell className={cn("py-4", today ? "text-amber-700 font-medium" : "text-zinc-500")}>
                              {format(row.date, "EEEE", { locale: getLocaleObj() })}
                            </TableCell>
                            <TableCell className={cn("py-4 font-medium", today ? "text-amber-700" : "text-amber-600")}>
                              {row.sunrise}
                            </TableCell>
                            <TableCell className="py-4 font-semibold text-zinc-900">{row.wakeTime}</TableCell>
                            <TableCell className="py-4 font-semibold text-zinc-900">{row.bedTime}</TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
        
        <div className="text-center pt-10 pb-6 no-print space-y-6">
          {step === 5 && (
            <a 
              href="https://buymeacoffee.com/sezeriltekin" 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center h-9 px-5 rounded-full bg-[#FFDD00] text-zinc-900 text-sm font-bold hover:bg-[#ffea4d] hover:scale-105 hover:shadow-md transition-all duration-300"
            >
              <Coffee className="h-4 w-4 mr-2" />
              {t.coffee}
            </a>
          )}
          <p className="text-sm text-zinc-400 font-medium">
            {t.builtBy} <a href="https://x.com/sezeriltekin" target="_blank" rel="noopener noreferrer" className="text-zinc-500 hover:text-zinc-900 transition-colors">@sezeriltekin</a>
          </p>

          {/* Language Selector: Centered below footer on mobile, 50% closer to bottom on desktop */}
          <div className="flex justify-center sm:block sm:fixed sm:bottom-5 sm:right-6 z-50 no-print pt-2 sm:pt-0">
            <Popover open={langOpen} onOpenChange={setLangOpen}>
              <PopoverTrigger className="w-8 h-8 sm:w-12 sm:h-12 bg-white/90 backdrop-blur-md rounded-full shadow-md sm:shadow-2xl border border-zinc-200 flex items-center justify-center text-zinc-700 hover:text-zinc-900 hover:bg-white hover:scale-105 transition-all duration-300 outline-none">
                <Globe className="h-4 w-4 sm:h-6 sm:w-6" />
              </PopoverTrigger>
              <PopoverContent align="center" side="top" className="w-40 p-2 rounded-2xl shadow-2xl border-zinc-200 bg-white/95 backdrop-blur-xl mb-3 sm:mb-4">
                <div className="flex flex-col gap-1">
                  {Object.entries({
                    tr: "Türkçe",
                    en: "English",
                    es: "Español",
                    fr: "Français",
                    de: "Deutsch",
                    pt: "Português",
                    ru: "Русский",
                    ja: "日本語",
                    zh: "中文",
                    ar: "العربية"
                  }).map(([key, name]) => (
                      <button
                        key={key}
                        onClick={() => { setLang(key as Language); setLangOpen(false); }}
                        className={`text-left px-4 py-2.5 text-sm rounded-xl transition-all ${lang === key ? "bg-zinc-900 font-bold text-white shadow-md" : "text-zinc-600 hover:bg-zinc-100 font-medium"}`}
                      >
                        {name}
                      </button>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>

      </div>
    </div>
  );
}
