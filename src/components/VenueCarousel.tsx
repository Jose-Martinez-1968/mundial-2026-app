import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Users, Cloud, Calendar, MapPin } from 'lucide-react';

interface VenuePhoto {
  url: string;
  caption: string;
}

interface VenueCarouselProps {
  stadiumName: string;
  commonName: string;
  city: string;
  capacity: string;
  photos: VenuePhoto[];
  lat: number;
  lon: number;
  matches: string;
  nextMatch?: {
    date: string;
    teams: string;
  };
}

interface OpenMeteoCurrentWeather {
  temperature: number;
  weathercode: number;
}

interface OpenMeteoResponse {
  current_weather: OpenMeteoCurrentWeather;
}

const isOpenMeteoResponse = (value: unknown): value is OpenMeteoResponse => {
  if (!value || typeof value !== 'object') return false;
  const currentWeather = (value as { current_weather?: unknown }).current_weather;
  if (!currentWeather || typeof currentWeather !== 'object') return false;
  const weather = currentWeather as Partial<OpenMeteoCurrentWeather>;
  return typeof weather.temperature === 'number' && typeof weather.weathercode === 'number';
};

export const VenueCarousel: React.FC<VenueCarouselProps> = ({ 
  stadiumName, 
  commonName,
  city, 
  capacity, 
  photos, 
  lat, 
  lon,
  matches,
  nextMatch 
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [weather, setWeather] = useState<{ temp: number; condition: string } | null>(null);
  const [loadingWeather, setLoadingWeather] = useState(true);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const imageLoadedRef = useRef(false);

  // Reset image state when slide or stadium changes — NO imageLoaded in deps
  useEffect(() => {
    setImageLoaded(false);
    setImageError(false);
    imageLoadedRef.current = false;

    const timer = setTimeout(() => {
      if (!imageLoadedRef.current) {
        setImageError(true);
      }
    }, 8000);

    return () => clearTimeout(timer);
  }, [currentIndex, stadiumName]);

  const handleImageLoad = () => {
    imageLoadedRef.current = true;
    setImageLoaded(true);
  };

  const handleImageError = () => {
    setImageError(true);
  };

  const currentPhoto = photos[currentIndex];
  const displayUrl = imageError 
    ? `https://placehold.co/1920x1080/0f172a/64748b?text=${encodeURIComponent(stadiumName)}`
    : currentPhoto.url;

  useEffect(() => {
    const controller = new AbortController();
    const fetchWeather = async () => {
      try {
        const res = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`,
          { signal: controller.signal },
        );
        const data: unknown = await res.json();
        if (!isOpenMeteoResponse(data)) {
          throw new Error('Respuesta de clima invalida');
        }
        setWeather({
          temp: Math.round(data.current_weather.temperature),
          condition: data.current_weather.weathercode.toString()
        });
      } catch (e) {
        if (controller.signal.aborted) return;
        console.error("Error fetching weather", e);
      } finally {
        if (!controller.signal.aborted) setLoadingWeather(false);
      }
    };
    void fetchWeather();
    return () => controller.abort();
  }, [lat, lon]);

  const next = () => setCurrentIndex((prev) => (prev + 1) % photos.length);
  const prev = () => setCurrentIndex((prev) => (prev - 1 + photos.length) % photos.length);

  return (
    <div className="bg-slate-900/40 rounded-2xl border border-white/5 overflow-hidden backdrop-blur-sm group h-full flex flex-col">
      {/* IMAGE SLIDER */}
      <div className="relative h-64 md:h-80 overflow-hidden bg-slate-800">
        {/* SKELETON LOADER */}
        {!imageLoaded && !imageError && (
          <div className="absolute inset-0 bg-slate-800 animate-pulse flex items-center justify-center">
            <div className="w-10 h-10 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
          </div>
        )}

        <AnimatePresence mode="wait">
          <img
            key={`${stadiumName}-${currentIndex}-${imageError}`}
            src={displayUrl}
            alt={stadiumName}
            onLoad={handleImageLoad}
            onError={handleImageError}
            className={`w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 ${
              imageLoaded ? 'opacity-100' : 'opacity-0'
            }`}
          />
        </AnimatePresence>

        {/* GRADIENT OVERLAY */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent opacity-90" />

        {/* TEXT OVERLAY */}
        <div className="absolute bottom-4 left-5 right-5">
          <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
            <h3 className="text-xl md:text-2xl font-black text-white drop-shadow-lg uppercase tracking-tight">
              {stadiumName}
            </h3>
            <div className="text-xs font-medium text-slate-400 mb-1">
              {commonName}
            </div>
            <div className="flex items-center gap-1.5 text-blue-400 font-bold text-xs uppercase tracking-widest mt-1">
              <MapPin size={12} />
              {city}
            </div>
          </motion.div>
        </div>

        {/* NAVIGATION BUTTONS */}
        {photos.length > 1 && (
          <>
            <button 
              onClick={prev}
              className="absolute left-2 top-1/2 -translate-y-1/2 p-2 bg-black/40 hover:bg-black/60 text-white rounded-full backdrop-blur-md opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <ChevronLeft size={20} />
            </button>
            <button 
              onClick={next}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-black/40 hover:bg-black/60 text-white rounded-full backdrop-blur-md opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <ChevronRight size={20} />
            </button>
          </>
        )}
      </div>

      {/* MATCHES DESCRIPTION */}
      <div className="px-5 py-3 text-[11px] text-slate-400 leading-relaxed border-b border-white/5 bg-slate-900/40">
        <strong className="text-blue-400 uppercase tracking-tighter mr-1">Partidos:</strong>
        {matches}
      </div>

      {/* TECH DATA FOOTER */}
      <div className="p-5 grid grid-cols-3 gap-4 border-t border-white/5 bg-slate-900/20 mt-auto">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-slate-500 text-[10px] font-bold uppercase tracking-widest">
            <Users size={12} className="text-blue-400" />
            Capacidad
          </div>
          <div className="text-sm font-black text-slate-200">{capacity}</div>
        </div>

        <div className="space-y-1">
          <div className="flex items-center gap-2 text-slate-500 text-[10px] font-bold uppercase tracking-widest">
            <Cloud size={12} className="text-emerald-400" />
            Clima
          </div>
          <div className="text-sm font-black text-slate-200">
            {loadingWeather ? '...' : `${weather?.temp}°C`}
          </div>
        </div>

        <div className="space-y-1">
          <div className="flex items-center gap-2 text-slate-500 text-[10px] font-bold uppercase tracking-widest">
            <Calendar size={12} className="text-rose-400" />
            Próximo
          </div>
          <div className="text-[10px] font-black text-slate-300 leading-tight truncate" title={nextMatch?.teams}>
            {nextMatch ? nextMatch.teams : 'Por determinar'}
          </div>
        </div>
      </div>
    </div>
  );
};
