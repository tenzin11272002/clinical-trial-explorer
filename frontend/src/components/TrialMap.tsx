import { useEffect, useRef } from "react";
import { MapContainer, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet.markercluster";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import type { Site } from "../api";
import { colorFor, pretty } from "../constants";
import { Card, CardHeader } from "./ui";

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

  const title = document.createElement("div");
  title.textContent = site.title;
  title.style.fontWeight = "600";
  title.style.color = "#0f172a";

  // "Phase 3 · Recruiting" with the status in its pin colour
  const meta = document.createElement("div");
  meta.style.marginTop = "4px";
  const phase = document.createElement("span");
  phase.textContent = `${pretty(site.phase)} · `;
  phase.style.color = "#475569";
  const status = document.createElement("span");
  status.textContent = pretty(site.status);
  status.style.color = colorFor(site.status);
  status.style.fontWeight = "600";
  meta.append(phase, status);

  const place = document.createElement("div");
  place.textContent = `${site.facility}, ${site.city}, ${site.country}`;
  place.style.color = "#64748b";
  place.style.marginTop = "2px";

  const button = document.createElement("button");
  button.textContent = "View trial details →";
  button.style.color = "#2563eb";
  button.style.marginTop = "8px";
  button.style.fontWeight = "600";
  button.style.cursor = "pointer";
  button.onclick = () => onSelect(site.nct_id);

  box.append(title, meta, place, button);
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
  missing,
  onSelect,
}: {
  sites: Site[];
  missing: number; // sites without coordinates (not drawn)
  onSelect: (nctId: string) => void;
}) {
  // Only list the statuses that actually appear on the map right now
  const statuses = [...new Set(sites.map((s) => s.status))].sort();

  return (
    <Card className="overflow-hidden">
      <CardHeader
        title="Trial sites"
        subtitle={`${sites.length.toLocaleString()} sites on the map. Numbered bubbles are groups: zoom in or click to open them.`}
      />

      <MapContainer center={[20, 0]} zoom={2} className="h-[520px] w-full">
        {/* Free OpenStreetMap tiles (no API key). index.css softens their colours so the pins stand out */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <ClusterLayer sites={sites} onSelect={onSelect} />
      </MapContainer>

      {/* Legend: what each pin colour means */}
      <div className="border-t border-slate-100 px-5 py-3">
        <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-slate-600">
          {statuses.map((s) => (
            <span key={s} className="flex items-center gap-1.5">
              <span
                className="inline-block h-2.5 w-2.5 rounded-full ring-2 ring-white"
                style={{ backgroundColor: colorFor(s) }}
              />
              {pretty(s)}
            </span>
          ))}
        </div>
        {missing > 0 && (
          <p className="mt-2 text-xs text-slate-500">
            {missing.toLocaleString()} sites have no location in
            ClinicalTrials.gov, so they are not on the map. They are still
            counted in the numbers above.
          </p>
        )}
      </div>
    </Card>
  );
}
