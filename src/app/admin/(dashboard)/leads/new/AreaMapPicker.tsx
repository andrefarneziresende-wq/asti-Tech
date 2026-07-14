"use client";

import { useEffect, useRef, useState } from "react";
import { buildSearchGrid } from "@/lib/geo-grid";

export interface SelectedArea {
  lat: number;
  lng: number;
  radiusMeters: number;
}

const SAO_PAULO = { lat: -23.5505, lng: -46.6333 };
const CELL_RADIUS_METERS = 600;
const MAX_GRID_CELLS = 30;
const DEFAULT_RADIUS_METERS = 1000;
const MIN_RADIUS_KM = 0.3;
const MAX_RADIUS_KM = 5;

let loaderPromise: Promise<void> | null = null;

function loadGoogleMaps(apiKey: string): Promise<void> {
  if (window.google?.maps) return Promise.resolve();
  if (loaderPromise) return loaderPromise;

  loaderPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&language=pt-BR&region=BR`;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Falha ao carregar o Google Maps."));
    document.head.appendChild(script);
  });

  return loaderPromise;
}

/**
 * Mapa onde o usuário clica pra definir o centro de uma área de busca, e
 * ajusta o raio num controle deslizante — o DrawingManager (desenho livre de
 * formas) foi descontinuado pela própria Google na API do Maps, então o
 * círculo é criado/editado manualmente (clique + slider de raio, ambos ainda
 * suportados). Calcula em tempo real quantas células de busca (grade) isso
 * gera, pra deixar o custo previsível antes de enviar.
 */
export function AreaMapPicker({ onAreaChange }: { onAreaChange: (area: SelectedArea | null) => void }) {
  const mapDivRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const circleRef = useRef<google.maps.Circle | null>(null);
  const [error, setError] = useState("");
  const [area, setArea] = useState<SelectedArea | null>(null);
  const [cellCount, setCellCount] = useState(0);

  function applyArea(lat: number, lng: number, radiusMeters: number) {
    const selected: SelectedArea = { lat, lng, radiusMeters };
    setArea(selected);
    onAreaChange(selected);
    setCellCount(buildSearchGrid(selected, radiusMeters, CELL_RADIUS_METERS, MAX_GRID_CELLS).length);
  }

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  useEffect(() => {
    if (!apiKey) return;
    if (!mapDivRef.current) return;

    let cancelled = false;

    loadGoogleMaps(apiKey)
      .then(() => {
        if (cancelled || !mapDivRef.current) return;

        const map = new google.maps.Map(mapDivRef.current, {
          center: SAO_PAULO,
          zoom: 13,
        });
        mapRef.current = map;

        map.addListener("click", (event: google.maps.MapMouseEvent) => {
          const lat = event.latLng?.lat();
          const lng = event.latLng?.lng();
          if (lat == null || lng == null) return;

          const radiusMeters = circleRef.current?.getRadius() ?? DEFAULT_RADIUS_METERS;

          if (circleRef.current) {
            circleRef.current.setCenter({ lat, lng });
          } else {
            const circle = new google.maps.Circle({
              map,
              center: { lat, lng },
              radius: radiusMeters,
              editable: true,
              draggable: true,
              fillColor: "#6d5efc",
              fillOpacity: 0.15,
              strokeColor: "#6d5efc",
            });
            circleRef.current = circle;
            circle.addListener("center_changed", () => {
              const c = circle.getCenter();
              if (c) applyArea(c.lat(), c.lng(), circle.getRadius());
            });
            circle.addListener("radius_changed", () => {
              const c = circle.getCenter();
              if (c) applyArea(c.lat(), c.lng(), circle.getRadius());
            });
          }

          applyArea(lat, lng, radiusMeters);
        });
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Falha ao carregar o mapa."));

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleRadiusChange(km: number) {
    const radiusMeters = km * 1000;
    if (circleRef.current) {
      circleRef.current.setRadius(radiusMeters);
    }
    if (area) applyArea(area.lat, area.lng, radiusMeters);
  }

  function handleClear() {
    if (circleRef.current) {
      circleRef.current.setMap(null);
      circleRef.current = null;
    }
    setArea(null);
    setCellCount(0);
    onAreaChange(null);
  }

  if (!apiKey || error) {
    return (
      <p className="rounded-lg border border-amber-500/40 bg-amber-500/5 p-3 text-xs text-amber-300">
        {error || "Mapa não configurado (NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ausente)."} Sem o mapa, a busca usa só o
        texto digitado acima (geocodificação simples).
      </p>
    );
  }

  return (
    <div>
      <div ref={mapDivRef} className="h-72 w-full rounded-lg border border-border" />
      <p className="mt-1 text-xs text-muted">Clique no mapa pra marcar o centro da área.</p>

      {area && (
        <div className="mt-2 flex items-center gap-3">
          <input
            type="range"
            min={MIN_RADIUS_KM}
            max={MAX_RADIUS_KM}
            step={0.1}
            value={area.radiusMeters / 1000}
            onChange={(e) => handleRadiusChange(Number(e.target.value))}
            className="flex-1"
          />
          <span className="whitespace-nowrap text-xs text-muted">
            {(area.radiusMeters / 1000).toFixed(1)}km — {cellCount} célula(s)
          </span>
          <button type="button" onClick={handleClear} className="text-xs text-accent hover:underline">
            Limpar
          </button>
        </div>
      )}
    </div>
  );
}
