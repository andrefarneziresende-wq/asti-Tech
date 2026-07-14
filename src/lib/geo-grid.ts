export interface GridCell {
  lat: number;
  lng: number;
  radiusMeters: number;
}

const EARTH_RADIUS_M = 6371000;

function metersToLatDegrees(meters: number): number {
  return (meters / EARTH_RADIUS_M) * (180 / Math.PI);
}

function metersToLngDegrees(meters: number, atLat: number): number {
  return (meters / (EARTH_RADIUS_M * Math.cos((atLat * Math.PI) / 180))) * (180 / Math.PI);
}

function distanceMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(a));
}

/**
 * Divide um círculo (centro + raio, em metros) numa grade de células menores
 * que se sobrepõem levemente, cobrindo toda a área. Cada célula vira uma
 * busca própria (com viés de localização) — necessário porque uma única
 * busca do Places nunca cobre mais que ~20-60 resultados, insuficiente para
 * mapear um bairro inteiro de uma vez.
 */
export function buildSearchGrid(
  center: { lat: number; lng: number },
  radiusMeters: number,
  cellRadiusMeters = 600,
  maxCells = 30
): GridCell[] {
  const step = cellRadiusMeters * 1.3; // leve sobreposição entre células vizinhas
  const cells: GridCell[] = [];
  const rings = Math.max(1, Math.ceil(radiusMeters / step));

  for (let row = -rings; row <= rings; row += 1) {
    const latOffsetMeters = row * step;
    if (Math.abs(latOffsetMeters) > radiusMeters + cellRadiusMeters) continue;
    const cellLat = center.lat + metersToLatDegrees(latOffsetMeters);

    for (let col = -rings; col <= rings; col += 1) {
      const lngOffsetMeters = col * step;
      const cellLng = center.lng + metersToLngDegrees(lngOffsetMeters, center.lat);
      const dist = distanceMeters(center.lat, center.lng, cellLat, cellLng);
      if (dist > radiusMeters + cellRadiusMeters) continue;

      cells.push({ lat: cellLat, lng: cellLng, radiusMeters: cellRadiusMeters });
      if (cells.length >= maxCells) return cells;
    }
  }

  return cells;
}
