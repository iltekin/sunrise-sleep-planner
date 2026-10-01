"use client";

import { useState, useEffect } from "react";
import { format, addMonths, subMinutes, subHours, parse, addDays, differenceInDays, isToday } from "date-fns";
import { tr } from "date-fns/locale";
import { CalendarIcon, Loader2, MapPin, ArrowRight, ArrowLeft, Share2, Check, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";

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

const StepperInput = ({ value, setValue, step, min, max, unit }: { value: string, setValue: (v: string) => void, step: number, min: number, max: number, unit: string }) => {
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

const SunriseOffsetInput = ({ value, setValue, step, min, max }: { value: string, setValue: (v: string) => void, step: number, min: number, max: number }) => {
  const num = Number(value);
  
  let content = <span className="font-medium text-zinc-700">Tam güneş doğarken</span>;
  if (num < 0) {
    content = (
      <>
        <span className="font-bold text-zinc-900">{Math.abs(num)} dk</span>
        <span className="font-normal text-zinc-500 ml-1.5">önce</span>
      </>
    );
  } else if (num > 0) {
    content = (
      <>
        <span className="font-bold text-zinc-900">{num} dk</span>
        <span className="font-normal text-zinc-500 ml-1.5">sonra</span>
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
      const params = new URLSearchParams(window.location.search);
      if (params.has("lat") && params.has("lon") && params.has("sh")) {
        const lat = parseFloat(params.get("lat")!);
        const lon = parseFloat(params.get("lon")!);
        const locName = params.get("loc") || "Seçili Konum";
        const sh = params.get("sh")!;
        const bm = params.get("bm")!;
        const so = params.get("so")!;
        const mnths = params.get("m") || "1";
        
        let startD = new Date();
        if (params.has("sd")) {
          const parsed = parse(params.get("sd")!, "yyyy-MM-dd", new Date());
          if (!isNaN(parsed.getTime())) {
            startD = parsed;
            setDateMode("custom");
          }
        }
        
        setSelectedLocation({ id: 0, latitude: lat, longitude: lon, name: locName, country: "" });
        setSleepHours(sh);
        setBufferMins(bm);
        setSunriseOffset(so);
        setStartDate(startD);
        setMonths(mnths);
        
        generateSchedule(lat, lon, locName, sh, bm, so, startD, mnths);
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
      params.set("loc", locName);
      params.set("sh", sh);
      params.set("bm", bm);
      params.set("so", so);
      params.set("sd", format(startD, "yyyy-MM-dd"));
      params.set("m", mnths);
      window.history.pushState(null, '', '?' + params.toString());
      
    } catch {
      setError("Veriler çekilirken bir hata oluştu. Lütfen bağlantınızı kontrol edin.");
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

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-zinc-50 flex items-start justify-center p-4 md:p-8 font-sans">
      <div className={cn("w-full space-y-8 transition-all duration-700", step === 5 ? "max-w-4xl" : "max-w-xl")}>
        
        <div className="text-center space-y-3 no-print">
          <h1 className="text-4xl font-extrabold tracking-tight text-zinc-900">Uyku Planı Oluşturucu</h1>
          <p className="text-zinc-500 font-medium">Gün doğumuna odaklı uyku planı oluşturucu</p>
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
                    <Label className="text-lg font-semibold text-zinc-800">Hedef uyku süreniz nedir?</Label>
                    <StepperInput value={sleepHours} setValue={setSleepHours} step={0.5} min={4} max={12} unit="saat" />
                  </div>
                  <div className="space-y-3">
                    <Label className="text-lg font-semibold text-zinc-800">Yatağa girdikten sonra uykuya dalmanız ortalama kaç dakika sürüyor?</Label>
                    <StepperInput value={bufferMins} setValue={setBufferMins} step={5} min={0} max={60} unit="dk" />
                  </div>
                  <Button className="w-full h-14 rounded-xl text-lg font-semibold shadow-lg hover:shadow-xl transition-all" onClick={() => setStep(2)}>
                    Devam Et <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </div>
              )}

              {/* STEP 2 */}
              {step === 2 && (
                <div className="space-y-8 animate-in fade-in slide-in-from-right-8 duration-500">
                  <div className="space-y-6">
                    <div className="flex flex-col gap-3 relative">
                      <Label className="text-lg font-semibold text-zinc-800">Dünyanın herhangi bir yerini arayın</Label>
                      <button 
                        onClick={() => setLocationOpen(!locationOpen)} 
                        className={cn("flex w-full items-center justify-between text-left h-14 px-4 text-lg font-normal bg-zinc-50/50 border border-zinc-200 rounded-xl hover:bg-zinc-100 transition-colors", !selectedLocation && "text-zinc-400")}
                      >
                        {selectedLocation ? `${selectedLocation.name}, ${selectedLocation.country}` : "Şehir, ilçe veya ülke arayın..."}
                        <MapPin className="ml-2 h-5 w-5 opacity-50" />
                      </button>
                      
                      {locationOpen && (
                        <div className="absolute top-full left-0 w-full h-0 z-50">
                          <div className="fixed inset-0 z-40" onClick={() => setLocationOpen(false)} />
                          <div className="absolute top-0 left-0 w-full mt-2 z-50 bg-white border border-zinc-200 shadow-xl rounded-xl overflow-hidden animate-in fade-in zoom-in-95 duration-100 origin-top">
                            <Command shouldFilter={false}>
                              <CommandInput 
                                autoFocus 
                                placeholder="Örn: Londra, Kadıköy, Berlin..." 
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
                                    const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(val)}&count=5&language=tr&format=json`);
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
                                  <div className="p-4 text-center text-sm text-zinc-500">Aranıyor...</div>
                                ) : searchResults.length === 0 && searchQuery.length >= 2 ? (
                                  <CommandEmpty>Sonuç bulunamadı.</CommandEmpty>
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
                    <Button className="h-14 flex-1 rounded-xl text-lg font-semibold shadow-lg hover:shadow-xl transition-all" disabled={!selectedLocation} onClick={() => setStep(3)}>Devam Et <ArrowRight className="ml-2 h-5 w-5" /></Button>
                  </div>
                </div>
              )}

              {/* STEP 3 */}
              {step === 3 && (
                <div className="space-y-8 animate-in fade-in slide-in-from-right-8 duration-500">
                  <div className="space-y-3">
                    <Label className="text-lg font-semibold text-zinc-800">Güneşten kaç dakika önce/sonra uyanacaksınız?</Label>
                    <SunriseOffsetInput value={sunriseOffset} setValue={setSunriseOffset} step={5} min={-120} max={120} />
                  </div>
                  
                  <div className="flex gap-4">
                    <Button variant="outline" className="h-14 px-6 rounded-xl border-zinc-200 text-zinc-600" onClick={() => setStep(2)}><ArrowLeft className="mr-2 h-5 w-5" /></Button>
                    <Button className="h-14 flex-1 rounded-xl text-lg font-semibold shadow-lg hover:shadow-xl transition-all" onClick={() => setStep(4)}>Devam Et <ArrowRight className="ml-2 h-5 w-5" /></Button>
                  </div>
                </div>
              )}

              {/* STEP 4 */}
              {step === 4 && (
                <div className="space-y-8 animate-in fade-in slide-in-from-right-8 duration-500">
                  <div className="space-y-4 flex flex-col">
                    <Label className="text-lg font-semibold text-zinc-800">Çizelgeniz ne zaman başlasın?</Label>
                    <div className="grid grid-cols-2 gap-3 sm:gap-4">
                      <div 
                        onClick={() => { setStartDate(new Date()); setDateMode("today"); }}
                        className={cn("cursor-pointer border-2 transition-all duration-200 rounded-xl flex flex-col items-center justify-center p-4", dateMode === "today" ? "border-zinc-900 bg-zinc-50 text-zinc-900 font-bold" : "border-zinc-100 bg-white text-zinc-500 hover:border-zinc-300")}
                      >
                        <CalendarIcon className="h-6 w-6 mb-2" />
                        <span className="text-base sm:text-lg">Bugün Başla</span>
                      </div>

                      <Popover open={dateOpen} onOpenChange={setDateOpen}>
                        <PopoverTrigger 
                          onClick={() => setDateMode("custom")}
                          className={cn("cursor-pointer border-2 transition-all duration-200 rounded-xl flex flex-col items-center justify-center p-4", dateMode === "custom" ? "border-zinc-900 bg-zinc-50 text-zinc-900 font-bold" : "border-zinc-100 bg-white text-zinc-500 hover:border-zinc-300")}
                        >
                          <CalendarIcon className="h-6 w-6 mb-2" />
                          <span className="text-base sm:text-lg">
                            {dateMode === "custom" && startDate ? format(startDate, "dd MMM", { locale: tr }) : "Başka Tarih"}
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
                    <Label className="text-lg font-semibold text-zinc-800">Ne kadar sürelik bir plan istersiniz?</Label>
                    <div className="grid grid-cols-2 gap-3 sm:gap-4">
                      {[
                        { val: "1", label: "1 Aylık" },
                        { val: "3", label: "3 Aylık" },
                        { val: "6", label: "6 Aylık" },
                        { val: "12", label: "1 Yıllık" }
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
                      {loading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : "Çizelgeyi Oluştur!"}
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
              <div className="bg-white p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-2xl sm:text-3xl font-extrabold text-zinc-900 mb-1">Uyku Çizelgesi</h2>
                  <p className="text-zinc-500 text-base">{selectedLocation?.name} konumu için güneşin doğuşuna göre hesaplandı.</p>
                </div>
                
                {/* Desktop Buttons */}
                <div className="hidden sm:flex gap-2 no-print">
                  <Button 
                    variant="outline" 
                    className="border-zinc-200 text-zinc-700 hover:bg-zinc-50 rounded-xl font-medium px-4" 
                    onClick={() => {
                      navigator.clipboard.writeText(window.location.href);
                      setCopied(true);
                      setTimeout(() => setCopied(false), 2000);
                    }}
                  >
                    {copied ? <Check className="h-5 w-5 mr-2 text-green-600" /> : <Share2 className="h-5 w-5 mr-2" />}
                    {copied ? "Kopyalandı" : "Paylaş"}
                  </Button>
                  <Button 
                    variant="outline" 
                    className="border-zinc-200 text-zinc-700 hover:bg-zinc-50 rounded-xl font-medium px-4" 
                    onClick={() => window.print()}
                  >
                    <Download className="h-5 w-5 mr-2" />
                    PDF İndir
                  </Button>
                  <Button variant="outline" className="border-zinc-200 text-zinc-700 hover:bg-zinc-50 rounded-xl" onClick={() => { window.history.pushState(null, '', window.location.pathname); setStep(1); }}>Yeniden Başla</Button>
                </div>

                {/* Mobile Buttons */}
                <div className="flex sm:hidden flex-col gap-2 w-full mt-2 no-print">
                  <Button 
                    variant="outline" 
                    className="rounded-xl h-12 w-full text-zinc-700 font-medium" 
                    onClick={() => window.print()}
                  >
                    <Download className="h-5 w-5 mr-2" />
                    PDF Olarak İndir
                  </Button>
                  <Button 
                    variant="outline" 
                    className="rounded-xl h-12 w-full text-zinc-700 font-medium" 
                    onClick={() => {
                      navigator.clipboard.writeText(window.location.href);
                      setCopied(true);
                      setTimeout(() => setCopied(false), 2000);
                    }}
                  >
                    {copied ? <Check className="h-5 w-5 mr-2 text-green-600" /> : <Share2 className="h-5 w-5 mr-2" />}
                    {copied ? "Link Kopyalandı!" : "Planı Paylaş"}
                  </Button>
                  <Button variant="outline" className="rounded-xl h-12 w-full text-zinc-500" onClick={() => { window.history.pushState(null, '', window.location.pathname); setStep(1); }}>Yeniden Başla</Button>
                </div>
              </div>
              <CardContent className="px-6 sm:px-8 pb-6 sm:pb-8">
                <div className="max-h-[600px] overflow-auto print:max-h-none print:overflow-visible">
                  <Table className="w-full text-base">
                    <TableHeader className="bg-zinc-50 sticky top-0 shadow-sm z-10">
                      <TableRow className="border-b border-zinc-200">
                        <TableHead className="py-4 text-sm font-semibold text-zinc-500 uppercase tracking-wider">Tarih</TableHead>
                        <TableHead className="py-4 text-sm font-semibold text-zinc-500 uppercase tracking-wider">Gün</TableHead>
                        <TableHead className="py-4 text-sm font-semibold text-zinc-500 uppercase tracking-wider">Güneş</TableHead>
                        <TableHead className="py-4 text-sm font-semibold text-zinc-500 uppercase tracking-wider">Uyanış</TableHead>
                        <TableHead className="py-4 text-sm font-semibold text-zinc-500 uppercase tracking-wider">Yatış</TableHead>
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
                              {format(row.date, "dd MMM yyyy", { locale: tr })}
                              {today && <span className="ml-2 inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">Bugün</span>}
                            </TableCell>
                            <TableCell className={cn("py-4", today ? "text-amber-700 font-medium" : "text-zinc-500")}>
                              {format(row.date, "EEEE", { locale: tr })}
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
        
        <div className="text-center pt-8 pb-4 no-print">
          <p className="text-sm text-zinc-400 font-medium">
            built by <a href="https://x.com/sezeriltekin" target="_blank" rel="noopener noreferrer" className="text-zinc-500 hover:text-zinc-900 transition-colors">@sezeriltekin</a>
          </p>
        </div>

      </div>
    </div>
  );
}
