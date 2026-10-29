import { useEffect, useRef } from "react";
import { MapContainer, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet.markercluster";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import type { Site } from "../api";
import { colorFor, pretty } from "../constants";

// One icon per status, reused by every pin with that status
const iconCache = new Map<string, L.DivIcon>();

function iconFor(status: string) {
  let icon = iconCache.get(status);
  if (!icon) {
    icon = L.divIcon({
      className: "", // removes Leaflet's default white square behind the icon
      html: `<span style="display:block;width:14px;height:14px;border-radius:9999px;
                          background:${colorFor(status)};border:2px solid white;
                          box-shadow:0 0 2px rgba(0,0,0,0.6)"></span>`,
      iconSize: [14, 14],
      popupAnchor: [0, -7], // popup opens just above the dot
    });
    iconCache.set(status, icon);
  }
  return icon;
}

function popupFor(site: Site, onSelect: (nctId: string) => void) {
  const box = document.createElement("div");

  const title = document.createElement("b");
  title.textContent = site.title;

  const place = document.createElement("div");
  place.textContent = `${site.facility}, ${site.city}, ${site.country}`;

  const status = document.createElement("div");
  status.textContent = pretty(site.status);
  status.style.color = colorFor(site.status);

  const button = document.createElement("button");
  button.textContent = "View trial details →";
  button.style.color = "#2563eb";
  button.style.marginTop = "6px";
  button.style.fontWeight = "600";
  button.style.cursor = "pointer";
  button.onclick = () => onSelect(site.nct_id);

  box.append(title, place, status, button);
  return box;
}

function ClusterLayer({
  sites,
  onSelect,
}: {
  sites: Site[];
  onSelect: (nctId: string) => void;
}) {
  const map = useMap();

  // Keep the latest onSelect in a ref, so a new function from App
  // doesn't rebuild every pin (and re-zoom the map) on each render
  const onSelectRef = useRef(onSelect);
  useEffect(() => {
    onSelectRef.current = onSelect;
  }, [onSelect]);

  useEffect(() => {
    const cluster = L.markerClusterGroup({
      chunkedLoading: true,
      spiderfyOnMaxZoom: true, // many trials share one hospital's coordinates
    });

    const markers = sites.map((site) =>
      L.marker([site.lat, site.lon], { icon: iconFor(site.status) }).bindPopup(
        popupFor(site, (nctId) => onSelectRef.current(nctId)),
      ),
    );

    cluster.addLayers(markers);
    map.addLayer(cluster);

    // Zoom the map so all pins are visible
    if (markers.length > 0) {
      map.fitBounds(cluster.getBounds(), { padding: [30, 30] });
    }

    // Clean up: remove the old pins before drawing new ones
    return () => {
      map.removeLayer(cluster);
    };
  }, [map, sites]);

  return null;
}

export default function TrialMap({
  sites,
  onSelect,
}: {
  sites: Site[];
  onSelect: (nctId: string) => void;
}) {
  // Only list the statuses that actually appear on the map right now
  const statuses = [...new Set(sites.map((s) => s.status))].sort();

  return (
    <div>
      <MapContainer
        center={[20, 0]}
        zoom={2}
        className="h-[500px] w-full rounded-lg shadow"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <ClusterLayer sites={sites} onSelect={onSelect} />
      </MapContainer>

      {/* Legend: what each pin colour means */}
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600">
        {statuses.map((s) => (
          <span key={s} className="flex items-center gap-1">
            <span
              className="inline-block h-3 w-3 rounded-full border border-white shadow"
              style={{ backgroundColor: colorFor(s) }}
            />
            {pretty(s)}
          </span>
        ))}
        <span className="text-slate-400">
          · Numbered bubbles are groups of sites: zoom in or click to open them.
        </span>
      </div>
    </div>
  );
}
