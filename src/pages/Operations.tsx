import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Waves, Check, Plus, ChevronDown, CloudRain
} from 'lucide-react';
import { MapContainer, TileLayer, Polygon, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Map tile configurations for Operations matching exact user requirements: google map, google hybrid, carto, osm
export type OpsMapTile = 'google-hybrid' | 'google-map' | 'carto' | 'osm';

const OPS_MAP_TILES: Record<OpsMapTile, { name: string; url: string; subdomains?: string[]; maxZoom: number }> = {
  'google-hybrid': {
    name: 'Google Hybrid',
    url: 'https://mt{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}',
    subdomains: ['0', '1', '2', '3'],
    maxZoom: 20,
  },
  'google-map': {
    name: 'Google Map',
    url: 'https://mt{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}',
    subdomains: ['0', '1', '2', '3'],
    maxZoom: 20,
  },
  'carto': {
    name: 'Carto',
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    subdomains: ['a', 'b', 'c', 'd'],
    maxZoom: 19,
  },
  'osm': {
    name: 'OSM',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    maxZoom: 19,
  },
};

// Map controller to center map smoothly
function MapCenterController({ center, zoom }: { center: [number, number]; zoom?: number }) {
  const map = useMap();
  useEffect(() => {
    map.invalidateSize();
    if (center) {
      map.setView(center, zoom || map.getZoom(), { animate: true });
    }
  }, [center, zoom, map]);
  return null;
}

// Marker Icons
const createShelterIcon = (label: string) =>
  L.divIcon({
    className: 'shelter-marker-icon',
    html: `<div style="background:#ffffff; color:#0f172a; padding:2px 6px; border-radius:4px; font-weight:800; font-size:10px; font-family:monospace; display:flex; align-items:center; gap:3px; box-shadow:0 2px 8px rgba(0,0,0,0.5); border:1px solid #94a3b8; white-space:nowrap;">
      <span style="display:inline-block; width:6px; height:6px; border-radius:50%; background:#0284c7;"></span>
      ${label}
    </div>`,
    iconSize: [80, 24],
    iconAnchor: [40, 12],
  });

const createUsvMarkerIcon = () =>
  L.divIcon({
    className: 'ops-usv-icon',
    html: `<div style="width:28px; height:28px; display:flex; align-items:center; justify-content:center; position:relative;">
      <span style="position:absolute; width:100%; height:100%; border-radius:50%; background:rgba(34,211,238,0.3); animation:ping 2s cubic-bezier(0,0,0.2,1) infinite;"></span>
      <div style="width:16px; height:16px; background:#22d3ee; border:2px solid #083344; border-radius:50%; box-shadow:0 0 10px #22d3ee;"></div>
    </div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });

interface FloodZone {
  id: string;
  name: string;
  code: string;
  status: 'cleared' | 'searching' | 'not_started';
  urgency: 'Critical' | 'High' | 'Moderate' | 'Receding';
  urgencyBadgeColor: string;
  note: string;
  missingCount: number;
  teamsAssigned: number;
  streetsTotal: number;
  streetsCleared: number;
  waterDepth: string;
  waterTrend: string;
  rescuedCount: number;
  polygon: [number, number][];
  center: [number, number];
}

interface RescueTeam {
  id: string;
  name: string;
  status: 'Searching' | 'En route' | 'Target found' | 'Evacuating' | 'Done';
  statusColor: string;
  rescued: number;
  location: string;
}

interface ReportItem {
  id: string;
  time: string;
  agency: string;
  badge: string;
  badgeColor: string;
  category: 'urgent' | 'updates' | 'unread' | 'general';
  text: string;
  acknowledged: boolean;
  zoneId: string;
}

interface StreetItem {
  id: string;
  name: string;
  zoneId: string;
  status: 'Cleared' | 'Searching' | 'Not started';
}

export default function Operations() {
  const navigate = useNavigate();

  // Active page selector
  const [activeTab, setActiveTab] = useState<'console' | 'operations'>('operations');

  // Real-time clock in MYT (Malaysian Time)
  const [currentTimeMyt, setCurrentTimeMyt] = useState<string>('08:44 MYT');
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const options: Intl.DateTimeFormatOptions = {
        timeZone: 'Asia/Kuala_Lumpur',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      };
      const formatted = new Intl.DateTimeFormat('en-GB', options).format(now);
      setCurrentTimeMyt(`${formatted} MYT`);
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Map tile source
  const [mapTileSource, setMapTileSource] = useState<OpsMapTile>('google-hybrid');
  const [showTileMenu, setShowTileMenu] = useState<boolean>(false);

  // Selected Zone
  const [selectedZoneId, setSelectedZoneId] = useState<string>('lorong-jasmin');

  // Report filter
  const [reportFilter, setReportFilter] = useState<'all' | 'urgent' | 'updates' | 'unread'>('all');

  // New report prompt toggle
  const [showNewReportModal, setShowNewReportModal] = useState<boolean>(false);
  const [newReportText, setNewReportText] = useState<string>('');
  const [newReportAgency, setNewReportAgency] = useState<string>('Hotline 999');

  // Zones data matching Picture 1
  const [zones, setZones] = useState<FloodZone[]>([
    {
      id: 'lorong-jasmin',
      name: 'Lorong Jasmin',
      code: '1',
      status: 'searching',
      urgency: 'Critical',
      urgencyBadgeColor: 'bg-rose-950 text-rose-300 border-rose-800',
      note: 'Elderly in group, water rising',
      missingCount: 5,
      teamsAssigned: 3,
      streetsTotal: 4,
      streetsCleared: 1,
      waterDepth: '1.6 m',
      waterTrend: 'rising',
      rescuedCount: 6,
      polygon: [
        [4.2995, 100.7635],
        [4.3015, 100.7645],
        [4.3008, 100.7675],
        [4.2980, 100.7660],
      ],
      center: [4.2998, 100.7652],
    },
    {
      id: 'taman-megah-jaya',
      name: 'Taman Megah Jaya',
      code: '2',
      status: 'searching',
      urgency: 'High',
      urgencyBadgeColor: 'bg-amber-950 text-amber-300 border-amber-800',
      note: 'Pension enclave reported, 1 team only',
      missingCount: 3,
      teamsAssigned: 1,
      streetsTotal: 3,
      streetsCleared: 1,
      waterDepth: '1.2 m',
      waterTrend: 'stable',
      rescuedCount: 4,
      polygon: [
        [4.2975, 100.7655],
        [4.2985, 100.7680],
        [4.2955, 100.7695],
        [4.2950, 100.7668],
      ],
      center: [4.2966, 100.7674],
    },
    {
      id: 'ayer-tawar-market',
      name: 'Ayer Tawar Market',
      code: '3',
      status: 'searching',
      urgency: 'Moderate',
      urgencyBadgeColor: 'bg-yellow-950 text-yellow-300 border-yellow-800',
      note: 'Shelter near capacity',
      missingCount: 1,
      teamsAssigned: 1,
      streetsTotal: 2,
      streetsCleared: 1,
      waterDepth: '0.8 m',
      waterTrend: 'receding',
      rescuedCount: 3,
      polygon: [
        [4.2960, 100.7620],
        [4.2975, 100.7645],
        [4.2952, 100.7652],
        [4.2940, 100.7628],
      ],
      center: [4.2957, 100.7636],
    },
    {
      id: 'jln-ling-sing-hang',
      name: 'Jalan Ling Sing Hang',
      code: '4',
      status: 'cleared',
      urgency: 'Receding',
      urgencyBadgeColor: 'bg-emerald-950 text-emerald-300 border-emerald-800',
      note: 'All streets cleared',
      missingCount: 0,
      teamsAssigned: 1,
      streetsTotal: 3,
      streetsCleared: 3,
      waterDepth: '0.3 m',
      waterTrend: 'dry',
      rescuedCount: 1,
      polygon: [
        [4.2982, 100.7622],
        [4.2995, 100.7640],
        [4.2975, 100.7645],
        [4.2968, 100.7628],
      ],
      center: [4.2980, 100.7634],
    },
  ]);

  // Rescue Teams matching Picture 1
  const [teams] = useState<RescueTeam[]>([
    { id: 't1', name: 'Bomba Team A', status: 'Searching', statusColor: 'bg-amber-950 text-amber-300 border-amber-700', rescued: 4, location: 'Lorong Jasmin' },
    { id: 't2', name: 'APM Boat 2', status: 'En route', statusColor: 'bg-sky-950 text-sky-300 border-sky-700', rescued: 2, location: 'Taman Megah Jaya' },
    { id: 't3', name: 'USV-01 FloodScout', status: 'Target found', statusColor: 'bg-cyan-950 text-cyan-300 border-cyan-700', rescued: 0, location: 'Lorong Jasmin 6' },
    { id: 't4', name: 'Bomba Team B', status: 'Searching', statusColor: 'bg-amber-950 text-amber-300 border-amber-700', rescued: 3, location: 'Lorong Jasmin 7' },
    { id: 't5', name: 'APM Boat 1', status: 'Evacuating', statusColor: 'bg-purple-950 text-purple-300 border-purple-700', rescued: 3, location: 'Ayer Tawar Market' },
    { id: 't6', name: 'PDRM Unit 5', status: 'Done', statusColor: 'bg-emerald-950 text-emerald-300 border-emerald-700', rescued: 2, location: 'Jalan Ling Sing Hang' },
  ]);

  // Reports Channel matching Picture 1
  const [reports, setReports] = useState<ReportItem[]>([
    {
      id: 'rep-1',
      time: '00:41',
      agency: 'JKM Welfare',
      badge: 'Missing',
      badgeColor: 'bg-orange-950 text-orange-300 border-orange-700',
      category: 'urgent',
      text: 'Priority at 6 reported missing at Lorong Jasmin 1, includes 2 elderly. Last contact 23:20.',
      acknowledged: false,
      zoneId: 'lorong-jasmin',
    },
    {
      id: 'rep-2',
      time: '00:32',
      agency: 'Hotline 999',
      badge: 'Critical',
      badgeColor: 'bg-rose-950 text-rose-300 border-rose-700',
      category: 'urgent',
      text: 'Caller sees a man holding onto a tree near Lorong Megah Jaya 5.',
      acknowledged: false,
      zoneId: 'taman-megah-jaya',
    },
    {
      id: 'rep-3',
      time: '00:30',
      agency: 'Bomba',
      badge: 'Update',
      badgeColor: 'bg-blue-950 text-blue-300 border-blue-700',
      category: 'updates',
      text: 'Team A rescued 2 from a rooftop on Lorong Jasmin 5. Moving to Jasmin 6.',
      acknowledged: true,
      zoneId: 'lorong-jasmin',
    },
    {
      id: 'rep-4',
      time: '00:26',
      agency: 'MetMalaysia',
      badge: 'Warning',
      badgeColor: 'bg-amber-950 text-amber-300 border-amber-700',
      category: 'updates',
      text: 'Heavy rain for the next 2 hours. Water expected to rise about 0.3 m.',
      acknowledged: false,
      zoneId: 'lorong-jasmin',
    },
    {
      id: 'rep-5',
      time: '00:22',
      agency: 'District Health',
      badge: 'Info',
      badgeColor: 'bg-slate-800 text-slate-300 border-slate-700',
      category: 'general',
      text: 'PPS Ayer Tawar shelter at 82% capacity. Overflow to SK Ayer Tawar.',
      acknowledged: false,
      zoneId: 'ayer-tawar-market',
    },
  ]);

  // Street Clearance Checklist (12 streets from Pic 1)
  const [streets, setStreets] = useState<StreetItem[]>([
    { id: 's1', name: 'Lorong Jasmin 5', zoneId: 'lorong-jasmin', status: 'Cleared' },
    { id: 's2', name: 'Lorong Jasmin 6', zoneId: 'lorong-jasmin', status: 'Searching' },
    { id: 's3', name: 'Lorong Jasmin 7', zoneId: 'lorong-jasmin', status: 'Searching' },
    { id: 's4', name: 'Lorong Jasmin 8', zoneId: 'lorong-jasmin', status: 'Not started' },
    { id: 's5', name: 'Lorong Megah Jaya 3', zoneId: 'taman-megah-jaya', status: 'Cleared' },
    { id: 's6', name: 'Lorong Megah Jaya 5', zoneId: 'taman-megah-jaya', status: 'Searching' },
    { id: 's7', name: 'Jalan Jaya 2/1', zoneId: 'taman-megah-jaya', status: 'Not started' },
    { id: 's8', name: 'Jalan Pasar', zoneId: 'ayer-tawar-market', status: 'Cleared' },
    { id: 's9', name: 'Lorong Pasar 2', zoneId: 'ayer-tawar-market', status: 'Cleared' },
    { id: 's10', name: 'Jalan Ling Sing Hang 1', zoneId: 'jln-ling-sing-hang', status: 'Cleared' },
    { id: 's11', name: 'Jalan Ling Sing Hang 3', zoneId: 'jln-ling-sing-hang', status: 'Cleared' },
    { id: 's12', name: 'Lorong Selamat 4', zoneId: 'jln-ling-sing-hang', status: 'Cleared' },
  ]);

  // Toggle Street status on click
  const handleToggleStreet = (id: string) => {
    setStreets((prev) =>
      prev.map((s) => {
        if (s.id !== id) return s;
        const nextStatus =
          s.status === 'Cleared'
            ? 'Searching'
            : s.status === 'Searching'
            ? 'Not started'
            : 'Cleared';
        return { ...s, status: nextStatus };
      })
    );
  };

  // Toggle report acknowledged
  const handleToggleAcknowledge = (id: string) => {
    setReports((prev) =>
      prev.map((r) => (r.id === id ? { ...r, acknowledged: !r.acknowledged } : r))
    );
  };

  // Add a new report
  const handleAddReport = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newReportText.trim()) return;
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const newEntry: ReportItem = {
      id: `rep-${Date.now()}`,
      time: timeStr,
      agency: newReportAgency,
      badge: 'Urgent',
      badgeColor: 'bg-rose-950 text-rose-300 border-rose-700',
      category: 'urgent',
      text: newReportText.trim(),
      acknowledged: false,
      zoneId: selectedZoneId,
    };
    setReports([newEntry, ...reports]);
    setNewReportText('');
    setShowNewReportModal(false);
  };

  // Calculate live stats
  const totalMissing = useMemo(() => zones.reduce((acc, z) => acc + z.missingCount, 0), [zones]);
  const totalRescued = useMemo(() => zones.reduce((acc, z) => acc + z.rescuedCount, 0), [zones]);
  const clearedStreetsCount = useMemo(() => streets.filter((s) => s.status === 'Cleared').length, [streets]);
  const totalStreetsCount = streets.length;
  const accountedPercent = Math.round((totalRescued / (totalRescued + totalMissing)) * 100) || 61;

  // Selected Zone object
  const activeZone = useMemo(
    () => zones.find((z) => z.id === selectedZoneId) || zones[0],
    [zones, selectedZoneId]
  );

  // Filtered reports
  const filteredReports = useMemo(() => {
    if (reportFilter === 'urgent') return reports.filter((r) => r.category === 'urgent');
    if (reportFilter === 'updates') return reports.filter((r) => r.category === 'updates');
    if (reportFilter === 'unread') return reports.filter((r) => !r.acknowledged);
    return reports;
  }, [reports, reportFilter]);

  // Log a rescue in selected zone
  const handleLogRescue = () => {
    setZones((prev) =>
      prev.map((z) => {
        if (z.id !== selectedZoneId) return z;
        return {
          ...z,
          rescuedCount: z.rescuedCount + 1,
          missingCount: Math.max(0, z.missingCount - 1),
        };
      })
    );
  };

  return (
    <div className="min-h-screen bg-[#070b11] text-slate-100 flex flex-col font-sans select-none overflow-x-hidden">
      {/* ─── Top Command Header ──────────────────────────────────────────────── */}
      <header className="h-14 px-4 bg-[#0a0f17] border-b border-[#151f2e] flex items-center justify-between shrink-0 z-40">
        {/* Brand Left */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-sky-700 flex items-center justify-center shadow-lg shadow-cyan-900/30">
            <Waves className="w-5 h-5 text-slate-950" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-white tracking-wider text-sm">FLOODSCOUT COMMAND</span>
            </div>
            <p className="text-[11px] font-mono text-cyan-400">
              Ayer Tawar flood response · Operation day 2
            </p>
          </div>
        </div>

        {/* Center Tab Switcher: [Robot console] | [Operations] */}
        <div className="flex items-center bg-[#0e1623] p-1 rounded-lg border border-[#1b293d]">
          <button
            onClick={() => {
              setActiveTab('console');
              navigate('/dashboard');
            }}
            className={`px-4 py-1.5 rounded text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'console'
                ? 'bg-cyan-500 text-slate-950 shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Robot console
          </button>
          <button
            onClick={() => setActiveTab('operations')}
            className={`px-4 py-1.5 rounded text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'operations'
                ? 'bg-cyan-500 text-slate-950 shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Operations
          </button>
        </div>

        {/* Right Info: Weather & Real-time Clock */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded bg-[#0e1623] border border-[#1b293d] text-xs font-mono text-amber-300">
            <CloudRain size={14} className="text-amber-400" />
            <span>Heavy Rain 2 h · <span className="text-cyan-400 font-bold">+0.3 m</span></span>
          </div>

          <div className="px-3 py-1 rounded bg-[#0e1623] border border-[#1b293d] text-xs font-mono font-bold text-slate-200">
            {currentTimeMyt}
          </div>
        </div>
      </header>

      {/* ─── Top KPI Bar: 6 Emergency Response Metrics ──────────────────────── */}
      <div className="px-4 py-2.5 bg-[#080d14] border-b border-[#151f2e] grid grid-cols-2 md:grid-cols-6 gap-3">
        {/* Metric 1 */}
        <div className="bg-[#0b121c] p-2.5 rounded-lg border border-[#152132]">
          <span className="text-[10px] font-mono uppercase text-slate-400 block tracking-wider">Reported missing</span>
          <div className="text-xl font-bold text-white mt-0.5">23</div>
          <span className="text-[10px] text-slate-500 font-mono">from 4 disaster reports</span>
        </div>

        {/* Metric 2 */}
        <div className="bg-[#0b121c] p-2.5 rounded-lg border border-[#152132]">
          <span className="text-[10px] font-mono uppercase text-slate-400 block tracking-wider">Rescued</span>
          <div className="text-xl font-bold text-emerald-400 mt-0.5">{totalRescued}</div>
          <span className="text-[10px] text-slate-500 font-mono">in 7/12 shelters</span>
        </div>

        {/* Metric 3 */}
        <div className="bg-[#0b121c] p-2.5 rounded-lg border border-[#152132] relative overflow-hidden">
          <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-rose-500 animate-pulse"></div>
          <span className="text-[10px] font-mono uppercase text-slate-400 block tracking-wider">Still missing</span>
          <div className="text-xl font-bold text-rose-400 mt-0.5">{totalMissing}</div>
          <span className="text-[10px] text-slate-500 font-mono">across 3 zones</span>
        </div>

        {/* Metric 4 */}
        <div className="bg-[#0b121c] p-2.5 rounded-lg border border-[#152132]">
          <span className="text-[10px] font-mono uppercase text-slate-400 block tracking-wider">Teams in field</span>
          <div className="text-xl font-bold text-cyan-400 mt-0.5">6</div>
          <span className="text-[10px] text-slate-500 font-mono">5 crews + 1 USV</span>
        </div>

        {/* Metric 5 */}
        <div className="bg-[#0b121c] p-2.5 rounded-lg border border-[#152132]">
          <span className="text-[10px] font-mono uppercase text-slate-400 block tracking-wider">Streets cleared</span>
          <div className="text-xl font-bold text-white mt-0.5">{clearedStreetsCount} / {totalStreetsCount}</div>
          <span className="text-[10px] text-slate-500 font-mono">50% coverage</span>
        </div>

        {/* Metric 6 */}
        <div className="bg-[#0b121c] p-2.5 rounded-lg border border-[#152132] flex flex-col justify-between">
          <div>
            <span className="text-[10px] font-mono uppercase text-slate-400 block tracking-wider">Accounted for</span>
            <div className="text-xl font-bold text-cyan-400 mt-0.5">{accountedPercent}%</div>
          </div>
          <div className="w-full bg-[#162334] h-1.5 rounded-full overflow-hidden mt-1">
            <div className="bg-cyan-400 h-full rounded-full transition-all duration-500" style={{ width: `${accountedPercent}%` }}></div>
          </div>
        </div>
      </div>

      {/* ─── Main Content Grid ──────────────────────────────────────────────── */}
      <div className="flex-1 p-4 grid grid-cols-1 lg:grid-cols-12 gap-3 min-h-0 overflow-y-auto">
        {/* ─── Top Left: FLOOD ZONES & CLEARANCE MAP (8 cols) ───────────────── */}
        <div className="lg:col-span-8 bg-[#0b121c] rounded-xl border border-[#152132] flex flex-col p-3 shadow-lg min-h-[380px]">
          {/* Card Header */}
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#152132]">
            <div className="flex items-center gap-3">
              <span className="font-extrabold text-xs tracking-wider uppercase text-white">FLOOD ZONES & CLEARANCE</span>
              {/* Map Legend */}
              <div className="hidden sm:flex items-center gap-3 text-[10px] font-mono text-slate-400">
                <span className="flex items-center gap-1">
                  <span className="w-3 h-0.5 bg-cyan-400 inline-block"></span> Cleared
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-3 border-b-2 border-dashed border-amber-400 inline-block"></span> Searching
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-3 border-b-2 border-dashed border-slate-500 inline-block"></span> Not started
                </span>
              </div>
            </div>

            {/* Map Tiles Selector Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowTileMenu(!showTileMenu)}
                className="flex items-center gap-1.5 px-2.5 py-1 bg-[#101926] hover:bg-[#162334] text-cyan-400 border border-[#1b293d] rounded text-[10px] font-mono font-bold tracking-wider cursor-pointer transition-colors"
              >
                <span>[MAP TILES: {OPS_MAP_TILES[mapTileSource].name.toUpperCase()}]</span>
                <ChevronDown size={11} />
              </button>

              {showTileMenu && (
                <div className="absolute right-0 top-full mt-1 w-44 bg-[#0d1622] border border-[#1e2f44] rounded-lg shadow-2xl py-1 z-[2000] font-mono text-xs">
                  {(Object.keys(OPS_MAP_TILES) as OpsMapTile[]).map((tileKey) => (
                    <button
                      key={tileKey}
                      onClick={() => {
                        setMapTileSource(tileKey);
                        setShowTileMenu(false);
                      }}
                      className={`w-full px-3 py-1.5 text-left flex items-center justify-between hover:bg-[#162438] cursor-pointer transition-colors ${
                        mapTileSource === tileKey ? 'text-cyan-400 font-bold bg-[#111e2f]' : 'text-slate-300'
                      }`}
                    >
                      <span>{OPS_MAP_TILES[tileKey].name}</span>
                      {mapTileSource === tileKey && <Check size={12} />}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Interactive Map Area */}
          <div className="relative flex-1 rounded-lg overflow-hidden border border-[#172538] bg-[#070b11] min-h-[260px]">
            <MapContainer
              center={activeZone.center}
              zoom={16}
              zoomControl={false}
              attributionControl={false}
              className="w-full h-full"
            >
              <TileLayer
                key={mapTileSource}
                url={OPS_MAP_TILES[mapTileSource].url}
                subdomains={OPS_MAP_TILES[mapTileSource].subdomains}
                maxZoom={OPS_MAP_TILES[mapTileSource].maxZoom}
              />
              <MapCenterController center={activeZone.center} />

              {/* Render Flood Zones as interactive polygons */}
              {zones.map((zone) => {
                const isSelected = zone.id === selectedZoneId;
                const fillColor =
                  zone.status === 'cleared'
                    ? '#10b981'
                    : zone.urgency === 'Critical'
                    ? '#f43f5e'
                    : '#f59e0b';

                return (
                  <Polygon
                    key={zone.id}
                    positions={zone.polygon}
                    pathOptions={{
                      color: fillColor,
                      weight: isSelected ? 3 : 1.5,
                      dashArray: zone.status === 'cleared' ? undefined : '5, 5',
                      fillColor,
                      fillOpacity: isSelected ? 0.35 : 0.18,
                    }}
                    eventHandlers={{
                      click: () => setSelectedZoneId(zone.id),
                    }}
                  >
                    <Popup className="font-mono text-xs">
                      <strong>{zone.name}</strong>
                      <br />
                      Status: {zone.status} | Urgency: {zone.urgency}
                      <br />
                      Missing: {zone.missingCount} | Rescued: {zone.rescuedCount}
                    </Popup>
                  </Polygon>
                );
              })}

              {/* PPS Shelter Marker */}
              <Marker position={[4.2965, 100.7628]} icon={createShelterIcon('PPS SHELTER AYER TAWAR')}>
                <Popup className="font-mono text-xs">
                  <strong>PPS Ayer Tawar Shelter</strong>
                  <br />Capacity: 82%
                </Popup>
              </Marker>

              {/* USV-01 FloodScout Boat Beacon */}
              <Marker position={[4.29871, 100.76416]} icon={createUsvMarkerIcon()}>
                <Popup className="font-mono text-xs">
                  <strong>USV-01 FloodScout</strong>
                  <br />Active mission patrol · Lorong Jasmin
                </Popup>
              </Marker>
            </MapContainer>
          </div>

          {/* Active Zone Inspection Drawer (Bottom of Zone Card) */}
          <div className="mt-2 pt-2 border-t border-[#152132] flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
            <div className="flex items-center gap-4">
              <span className="font-bold text-white text-sm">{activeZone.name}</span>
              <span className="text-slate-400">Teams: <strong className="text-white">{activeZone.teamsAssigned}</strong></span>
              <span className="text-slate-400">Streets: <strong className="text-white">{activeZone.streetsCleared} / {activeZone.streetsTotal}</strong></span>
              <span className="text-slate-400">
                Water: <strong className="text-amber-400">{activeZone.waterDepth} {activeZone.waterTrend}</strong>
              </span>
              <span className="text-slate-400">Rescued: <strong className="text-emerald-400">{activeZone.rescuedCount}</strong></span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleLogRescue}
                className="px-3 py-1 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded cursor-pointer transition-colors shadow"
              >
                Log a rescue here
              </button>
              <button
                onClick={() => {
                  alert(`Dispatch command transmitted: USV-01 navigating to ${activeZone.name}`);
                }}
                className="px-3 py-1 bg-[#162334] hover:bg-[#1e3149] text-cyan-400 border border-cyan-800 rounded font-bold cursor-pointer transition-colors"
              >
                Send USV-01
              </button>
            </div>
          </div>
        </div>

        {/* ─── Top Right: MOST URGENT ZONES (4 cols) ────────────────────────── */}
        <div className="lg:col-span-4 bg-[#0b121c] rounded-xl border border-[#152132] flex flex-col p-3 shadow-lg">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#152132]">
            <span className="font-extrabold text-xs tracking-wider uppercase text-white">MOST URGENT ZONES</span>
            <span className="text-[10px] font-mono text-slate-500">ranked by urgency</span>
          </div>

          <div className="flex-1 flex flex-col gap-2 overflow-y-auto">
            {zones.map((zone) => {
              const isSelected = zone.id === selectedZoneId;
              return (
                <div
                  key={zone.id}
                  onClick={() => setSelectedZoneId(zone.id)}
                  className={`p-2.5 rounded-lg border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-[#121e2d] border-cyan-500/70 shadow'
                      : 'bg-[#0d1520] border-[#182637] hover:border-[#22374e]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-slate-400">{zone.code}</span>
                      <span className="font-bold text-sm text-white">{zone.name}</span>
                      <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border ${zone.urgencyBadgeColor}`}>
                        {zone.urgency}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className={`font-mono text-xs font-bold ${zone.missingCount > 0 ? 'text-rose-400' : 'text-slate-400'}`}>
                        {zone.missingCount} missing
                      </span>
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1 font-mono">{zone.note}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* ─── Bottom Left: RESCUE TEAMS (3 cols) ───────────────────────────── */}
        <div className="lg:col-span-3 bg-[#0b121c] rounded-xl border border-[#152132] flex flex-col p-3 shadow-lg min-h-[220px]">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#152132]">
            <span className="font-extrabold text-xs tracking-wider uppercase text-white">RESCUE TEAMS</span>
            <span className="text-[10px] font-mono text-slate-500">allocated, status, rescued</span>
          </div>

          <div className="flex-1 flex flex-col gap-1.5 overflow-y-auto font-mono text-xs">
            {teams.map((t) => (
              <div key={t.id} className="p-2 rounded bg-[#0d1520] border border-[#162334] flex items-center justify-between">
                <div>
                  <div className="font-bold text-white text-[11px]">{t.name}</div>
                  <div className="text-[9px] text-slate-400">{t.location}</div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${t.statusColor}`}>
                    {t.status}
                  </span>
                  <span className="font-bold text-emerald-400 w-3 text-right">{t.rescued}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ─── Bottom Center: REPORT CHANNEL (6 cols) ───────────────────────── */}
        <div className="lg:col-span-6 bg-[#0b121c] rounded-xl border border-[#152132] flex flex-col p-3 shadow-lg min-h-[220px]">
          {/* Header */}
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#152132]">
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-xs tracking-wider uppercase text-white">REPORT CHANNEL</span>
              <button
                onClick={() => setShowNewReportModal(true)}
                className="px-2 py-0.5 bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold text-[10px] rounded flex items-center gap-1 cursor-pointer transition-colors"
              >
                <Plus size={10} /> New
              </button>
            </div>

            {/* Filter pills: [All] [Urgent] [Updates] [Unread] */}
            <div className="flex items-center gap-1 text-[10px] font-mono">
              {(['all', 'urgent', 'updates', 'unread'] as const).map((cat) => (
                <button
                  key={cat}
                  onClick={() => setReportFilter(cat)}
                  className={`px-2 py-0.5 rounded capitalize cursor-pointer transition-colors ${
                    reportFilter === cat
                      ? 'bg-cyan-500 text-slate-950 font-bold'
                      : 'bg-[#101722] text-slate-400 hover:text-white'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Reports Feed */}
          <div className="flex-1 flex flex-col gap-2 overflow-y-auto font-mono text-xs">
            {filteredReports.map((r) => (
              <div
                key={r.id}
                className={`p-2.5 rounded-lg border transition-all ${
                  r.acknowledged
                    ? 'bg-[#090e15] border-[#141e2b] opacity-80'
                    : 'bg-[#0e1622] border-[#1d2d42]'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-slate-400">{r.time}</span>
                    <span className="font-bold text-white text-[11px]">{r.agency}</span>
                    <span className={`text-[9px] px-1.5 py-0.2 rounded border font-bold ${r.badgeColor}`}>
                      {r.badge}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleToggleAcknowledge(r.id)}
                      className={`text-[9px] px-2 py-0.5 rounded font-bold transition-colors cursor-pointer ${
                        r.acknowledged
                          ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                          : 'bg-[#182638] text-slate-300 hover:bg-[#20334c]'
                      }`}
                    >
                      {r.acknowledged ? 'Acknowledged ✓' : 'Acknowledge'}
                    </button>
                    <button
                      onClick={() => setSelectedZoneId(r.zoneId)}
                      className="text-[9px] px-2 py-0.5 rounded bg-[#182638] text-cyan-400 hover:bg-[#20334c] transition-colors cursor-pointer"
                    >
                      Show zone
                    </button>
                  </div>
                </div>
                <p className="text-[11px] text-slate-300 font-sans leading-relaxed">{r.text}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ─── Bottom Right: STREET CLEARANCE (3 cols) ──────────────────────── */}
        <div className="lg:col-span-3 bg-[#0b121c] rounded-xl border border-[#152132] flex flex-col p-3 shadow-lg min-h-[220px]">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#152132]">
            <span className="font-extrabold text-xs tracking-wider uppercase text-white">STREET CLEARANCE</span>
            <span className="text-[9px] font-mono text-slate-500">Tap to toggle</span>
          </div>

          <div className="flex-1 flex flex-col gap-1 overflow-y-auto font-mono text-[11px]">
            {streets.map((s) => {
              const statusColor =
                s.status === 'Cleared'
                  ? 'text-emerald-400 bg-emerald-950/40 border-emerald-800'
                  : s.status === 'Searching'
                  ? 'text-amber-400 bg-amber-950/40 border-amber-800'
                  : 'text-slate-400 bg-slate-900 border-slate-800';

              return (
                <div
                  key={s.id}
                  onClick={() => handleToggleStreet(s.id)}
                  className="px-2 py-1.5 rounded bg-[#0d1520] hover:bg-[#121c2b] border border-[#152132] flex items-center justify-between cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        s.status === 'Cleared'
                          ? 'bg-emerald-400'
                          : s.status === 'Searching'
                          ? 'bg-amber-400'
                          : 'bg-slate-600'
                      }`}
                    ></span>
                    <span className="text-slate-200">{s.name}</span>
                  </div>
                  <span className={`text-[9px] px-1.5 py-0.5 rounded border font-bold ${statusColor}`}>
                    {s.status}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ─── New Report Modal ──────────────────────────────────────────────── */}
      {showNewReportModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[3000] flex items-center justify-center p-4">
          <div className="bg-[#0e1622] border border-[#1e2f44] rounded-xl p-5 w-full max-w-md shadow-2xl">
            <h3 className="font-extrabold text-white text-sm mb-3">Broadcast Emergency Incident Report</h3>
            <form onSubmit={handleAddReport} className="flex flex-col gap-3 font-mono text-xs">
              <div>
                <label className="text-slate-400 block mb-1">Originating Agency / Caller</label>
                <input
                  type="text"
                  value={newReportAgency}
                  onChange={(e) => setNewReportAgency(e.target.value)}
                  className="w-full bg-[#080d14] border border-[#1e2f44] rounded px-3 py-2 text-white outline-none focus:border-cyan-400"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Incident Report Description</label>
                <textarea
                  rows={3}
                  value={newReportText}
                  onChange={(e) => setNewReportText(e.target.value)}
                  placeholder="E.g. Person stranded on roof at Lorong Jasmin 3..."
                  className="w-full bg-[#080d14] border border-[#1e2f44] rounded px-3 py-2 text-white outline-none focus:border-cyan-400"
                />
              </div>

              <div className="flex justify-end gap-2 mt-2">
                <button
                  type="button"
                  onClick={() => setShowNewReportModal(false)}
                  className="px-4 py-1.5 rounded bg-[#182638] text-slate-300 hover:bg-[#20334c] font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold"
                >
                  Broadcast Report
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
