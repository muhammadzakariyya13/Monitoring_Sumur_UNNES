"use client";
import { useEffect, useState } from "react";
import {
  MapContainer,
  TileLayer,
  CircleMarker,
  Marker,
  Tooltip,
  useMap,
} from "react-leaflet";
import { divIcon } from "leaflet";
import type { MonitoringLocation } from "@/lib/data";
import "leaflet/dist/leaflet.css";
function Focus({
  well,
  detail,
}: {
  well?: MonitoringLocation;
  detail: boolean;
}) {
  const map = useMap();
  useEffect(() => {
    const panel = detail
      ? map
          .getContainer()
          .closest(".detail-backdrop")
          ?.querySelector(".detail-panel")
      : null;
    const observer = new ResizeObserver(() => {
      map.invalidateSize();
      if (well && detail) {
        const size = map.getSize();
        const mobile = window.matchMedia("(max-width: 640px)").matches;
        const panelHeight =
          panel?.getBoundingClientRect().height ?? size.y * 0.6;
        const target = mobile
          ? [size.x / 2, (size.y - panelHeight) / 2]
          : [(size.x - 464) / 2, size.y / 2];
        const point = map.project([well.lat, well.lng], 16);
        const center = map.unproject(
          [point.x + size.x / 2 - target[0], point.y + size.y / 2 - target[1]],
          16,
        );
        map.setView(center, 16, { animate: false });
      }
    });
    observer.observe(map.getContainer());
    if (panel) observer.observe(panel);
    return () => observer.disconnect();
  }, [map, well, detail]);
  useEffect(() => {
    if (well && !detail)
      map.flyTo([well.lat, well.lng], 16, {
        duration: 0.6,
        animate: !window.matchMedia("(prefers-reduced-motion: reduce)").matches,
      });
  }, [well, map, detail]);
  return null;
}
export default function WellMap({
  wells,
  selected,
  onSelect,
  detail = false,
}: {
  wells: MonitoringLocation[];
  selected: string;
  onSelect: (id: string) => void;
  detail?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  return (
    <div className="map-wrap">
      <MapContainer
        center={[-7.0505, 110.394]}
        zoom={15}
        scrollWheelZoom={false}
        className="map-canvas"
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          eventHandlers={{ tileerror: () => setFailed(true) }}
        />
        <Focus well={wells.find((w) => w.id === selected)} detail={detail} />
        {wells.map((w) =>
          w.type === "BUILDING" ? (
            <Marker
              key={w.id}
              position={[w.lat, w.lng]}
              icon={divIcon({ className: "building-marker", iconSize: [30, 30], iconAnchor: [15, 15], html: '<span aria-hidden="true">&#9638;</span>' })}
              eventHandlers={{ click: () => onSelect(w.id) }}
            >
              <Tooltip permanent={detail && w.id === selected}>
                {w.name} - Gedung
              </Tooltip>
            </Marker>
          ) : (
            <CircleMarker
              key={w.id}
              center={[w.lat, w.lng]}
              radius={selected === w.id ? 15 : 11}
              pathOptions={{
                color: "white",
                weight: 4,
                fillColor: w.flow === null ? "#e8a82f" : "#087eac",
                fillOpacity: 1,
              }}
              eventHandlers={{ click: () => onSelect(w.id) }}
            >
              <Tooltip direction="top" permanent={detail && w.id === selected}>
                {w.name} · {w.flow === null ? "Terputus" : "Terhubung"} · lokasi
                contoh
              </Tooltip>
            </CircleMarker>
          ),
        )}
      </MapContainer>
      <span className="map-label">Titik contoh · bukan lokasi titik asli</span>
      {failed && (
        <span className="map-error">
          Peta dasar tidak tersedia. Pilih titik melalui daftar.
        </span>
      )}
    </div>
  );
}
