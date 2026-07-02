import { createFileRoute } from '@tanstack/react-router';
import React, { useState, useMemo, useEffect } from 'react';

const API_BASE = import.meta.env.VITE_API_BASE_URL;

// ===== Types =====
interface Product {
    Code: string;
    Name: string;
    Unit?: string;
    Cat?: string;
}
interface Order {
    Id: number;
    BranchId: number;
    PurchaseDate: string;
    Total?: number;
}
interface ProductStat {
    qty: number;
    revenue: number;
}
interface CatStat {
    qty: number;
    revenue: number;
}
interface ReportData {
    orders: Order[];
    productStats: Record<number, ProductStat>;
    productMap: Record<number, Product>;
    categoryStats: Record<string, CatStat>;
    totalRevenue: number;
    periodDays: number;
    periodLabel: string;
}

type FilterPreset =
    | 'today' | 'yesterday' | 'last7days' | 'thisMonth' | 'lastMonth' | 'thisQuarter' | 'custom';

export const Route = createFileRoute("/SaleReport")({
    component: SaleReport,
});

const PRESET_LABELS: { value: FilterPreset; label: string }[] = [
    { value: 'today', label: 'Hôm nay' },
    { value: 'yesterday', label: 'Hôm qua' },
    { value: 'last7days', label: '7 ngày trước' },
    { value: 'thisMonth', label: 'Tháng này' },
    { value: 'lastMonth', label: 'Tháng trước' },
    { value: 'thisQuarter', label: 'Quý này' },
    { value: 'custom', label: 'Tuỳ chọn' },
];

// ===== Bảng màu Cinnamon Forest =====
const C = {
    maroon: '#8B1A38',
    maroonDark: '#6B1129',
    maroonSoft: '#B65A6E',
    pinkBg: '#FBEEF1',
    pinkBg2: '#F7E2E8',
    cream: '#FDF8F5',
    gold: '#C89B3C',
    ink: '#2A1B1E',
    inkSoft: '#6E5A5E',
    line: '#EAD7DC',
    white: '#ffffff',
};
const PAL = ['#8B1A38', '#B65A6E', '#C89B3C', '#D98A9C', '#6B1129', '#E0A95E', '#A23B57', '#E6B8C2', '#7C8B3A', '#C97B4A'];
const NUM = (n: number) => Math.round(n).toLocaleString('vi-VN');
const VND = (n: number) => Math.round(n).toLocaleString('vi-VN') + 'đ';
const short = (s: string, n = 26) => (s.length > n ? s.slice(0, n - 1) + '…' : s);

function startOfDay(d: Date) { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; }
function endOfDay(d: Date) { const x = new Date(d); x.setHours(23, 59, 59, 999); return x; }
function toInputDateTime(d: Date) {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
function getPresetRange(preset: FilterPreset, custom: { from: string; to: string }) {
    const now = new Date();
    switch (preset) {
        case 'today': return { from: startOfDay(now), to: endOfDay(now) };
        case 'yesterday': { const y = new Date(now); y.setDate(y.getDate() - 1); return { from: startOfDay(y), to: endOfDay(y) }; }
        case 'last7days': { const f = new Date(now); f.setDate(f.getDate() - 6); return { from: startOfDay(f), to: endOfDay(now) }; }
        case 'thisMonth': { const f = new Date(now.getFullYear(), now.getMonth(), 1); const t = new Date(now.getFullYear(), now.getMonth() + 1, 0); return { from: startOfDay(f), to: endOfDay(t) }; }
        case 'lastMonth': { const f = new Date(now.getFullYear(), now.getMonth() - 1, 1); const t = new Date(now.getFullYear(), now.getMonth(), 0); return { from: startOfDay(f), to: endOfDay(t) }; }
        case 'thisQuarter': { const q = Math.floor(now.getMonth() / 3); const f = new Date(now.getFullYear(), q * 3, 1); const t = new Date(now.getFullYear(), q * 3 + 3, 0); return { from: startOfDay(f), to: endOfDay(t) }; }
        case 'custom':
        default:
            return { from: custom.from ? new Date(custom.from) : startOfDay(now), to: custom.to ? new Date(custom.to) : endOfDay(now) };
    }
}

function loadStock(): Record<string, number | ''> {
    try { return JSON.parse(localStorage.getItem('sr_stock') || '{}'); } catch { return {}; }
}
function saveStock(o: Record<string, number | ''>) {
    try { localStorage.setItem('sr_stock', JSON.stringify(o)); } catch { /* ignore */ }
}

// ===== Style dùng chung (tông Cinnamon Forest) =====
const sectionStyle: React.CSSProperties = {
    background: C.white, border: `1px solid ${C.line}`, borderRadius: 20, padding: '22px 24px',
    marginBottom: 22, boxShadow: '0 6px 26px -22px rgba(107,17,41,.4)',
};
const h3Style: React.CSSProperties = {
    fontFamily: "'Playfair Display', serif", fontWeight: 600, fontSize: 20, color: C.ink, marginBottom: 4,
    display: 'flex', alignItems: 'center', gap: 10,
};
const tagStyle: React.CSSProperties = {
    fontFamily: "'Be Vietnam Pro', sans-serif", fontSize: 11, fontWeight: 600, letterSpacing: '.05em',
    textTransform: 'uppercase', background: C.pinkBg, color: C.maroon, padding: '3px 10px', borderRadius: 999,
};
const descStyle: React.CSSProperties = { color: C.inkSoft, fontSize: 13.5, marginBottom: 16 };
const segWrapStyle: React.CSSProperties = { display: 'inline-flex', background: C.pinkBg, borderRadius: 999, padding: 3, marginRight: 10, marginBottom: 10 };
const segBtnStyle = (on: boolean): React.CSSProperties => ({
    border: 'none', background: on ? C.maroon : 'transparent', color: on ? '#fff' : C.maroon,
    padding: '7px 15px', borderRadius: 999, fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: '.15s',
});
const inputSmStyle: React.CSSProperties = { fontFamily: 'inherit', fontSize: 13.5, border: `1px solid ${C.line}`, borderRadius: 10, padding: '7px 11px', width: 78, color: C.ink, background: '#fff' };
const selectStyle: React.CSSProperties = { ...inputSmStyle, width: 'auto' };
const thStyle: React.CSSProperties = { textAlign: 'left', padding: '10px 12px', fontSize: 11.5, textTransform: 'uppercase', letterSpacing: '.05em', color: C.inkSoft, borderBottom: `1px solid ${C.line}`, fontWeight: 600, position: 'sticky', top: 0, background: '#fff' };
const tdStyle: React.CSSProperties = { padding: '10px 12px', borderBottom: `1px solid ${C.line}`, fontSize: 13.5 };
const tblScrollStyle: React.CSSProperties = { maxHeight: 420, overflow: 'auto', borderRadius: 12, border: `1px solid ${C.line}` };
const ghostBtnStyle: React.CSSProperties = { background: 'transparent', border: `1px solid ${C.maroonSoft}`, color: C.maroon, padding: '8px 16px', borderRadius: 999, fontWeight: 600, fontSize: 13, cursor: 'pointer' };
const subheadStyle: React.CSSProperties = { fontWeight: 600, fontSize: 14, margin: '18px 0 8px', color: C.maroon };
const chipStyle: React.CSSProperties = { background: C.pinkBg, border: `1px solid ${C.line}`, borderRadius: 999, padding: '4px 11px', fontSize: 12 };
const pillStyle = (cls: 'ok' | 'warn' | 'bad' | 'none'): React.CSSProperties => {
    const map: Record<string, [string, string]> = { ok: ['#e3f3ea', '#1f7a4d'], warn: ['#fdf0db', '#9a6a14'], bad: ['#fde4e4', '#b3261e'], none: ['#efeaec', '#8a7d80'] };
    const [bg, c] = map[cls];
    return { background: bg, color: c, padding: '3px 10px', borderRadius: 999, fontSize: 12, fontWeight: 600 };
};
const abcBadge = (cls: 'A' | 'B' | 'C'): React.CSSProperties => ({
    width: 22, height: 22, borderRadius: 6, display: 'inline-grid', placeItems: 'center', fontSize: 12, fontWeight: 700, color: '#fff',
    background: cls === 'A' ? C.maroon : cls === 'B' ? C.gold : '#9a8c90',
});

// ===== Component =====
export default function SaleReport() {
    const [branchId, setBranchId] = useState<string>('266190');
    const [preset, setPreset] = useState<FilterPreset>('last7days');
    const now = new Date();
    const [customFrom, setCustomFrom] = useState<string>(toInputDateTime(startOfDay(now)));
    const [customTo, setCustomTo] = useState<string>(toInputDateTime(endOfDay(now)));

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string>('');
    const [data, setData] = useState<ReportData | null>(null);

    // controls
    const [sortBy, setSortBy] = useState<'qty' | 'rev'>('qty');
    const [topN, setTopN] = useState(10);
    const [barMode, setBarMode] = useState<'qty' | 'rev'>('qty');
    const [pieMode, setPieMode] = useState<'qty' | 'rev'>('rev');
    const [periodDaysInput, setPeriodDaysInput] = useState<number>(7);
    const [customDays, setCustomDays] = useState<number>(14);
    const [abcMode, setAbcMode] = useState<'qty' | 'rev'>('rev');
    const [slowTh, setSlowTh] = useState<number>(3);
    const [coverDays, setCoverDays] = useState<number>(30);
    const [alertDays, setAlertDays] = useState<number>(7);
    const [stock, setStock] = useState<Record<string, number | ''>>({});

    // compare
    const [cmpLoading, setCmpLoading] = useState(false);
    const [cmpData, setCmpData] = useState<ReportData | null>(null);
    const [cmpPreset, setCmpPreset] = useState<FilterPreset>('lastMonth');
    const [cmpFrom, setCmpFrom] = useState<string>('');
    const [cmpTo, setCmpTo] = useState<string>('');

    useEffect(() => { setStock(loadStock()); }, []);

    async function fetchReport(branch: number, from: Date, to: Date): Promise<ReportData> {
        const url = `${API_BASE}/pos365/sale-report?branchId=${branch}&from=${encodeURIComponent(from.toISOString())}&to=${encodeURIComponent(to.toISOString())}`;
        const res = await fetch(url);
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.message || `HTTP ${res.status}`);
        }
        return res.json();
    }

    async function chayBaoCao() {
        setLoading(true);
        setError('');
        try {
            const branch = Number(branchId);
            const { from, to } = getPresetRange(preset, { from: customFrom, to: customTo });
            const result = await fetchReport(branch, from, to);
            setData(result);
            setPeriodDaysInput(result.periodDays || 7);
        } catch (e: any) {
            setError(e?.message || 'Có lỗi xảy ra khi tải dữ liệu.');
        } finally {
            setLoading(false);
        }
    }

    async function chayBaoCaoCompare() {
        if (!data) return;
        setCmpLoading(true);
        try {
            const branch = Number(branchId);
            const { from, to } = getPresetRange(cmpPreset, { from: cmpFrom, to: cmpTo });
            const result = await fetchReport(branch, from, to);
            setCmpData(result);
        } catch (e: any) {
            setError(e?.message || 'Có lỗi khi tải kỳ so sánh.');
        } finally {
            setCmpLoading(false);
        }
    }

    // ===== Derived data (luôn phòng thủ với dữ liệu null/undefined) =====
    const productList = useMemo(() => {
        if (!data?.productStats) return [];
        return Object.entries(data.productStats).map(([pid, s]) => {
            const p = data.productMap?.[Number(pid)] || { Code: pid, Name: '(không rõ tên)', Cat: 'Chưa phân nhóm' };
            return { pid: Number(pid), code: p.Code, name: p.Name, unit: p.Unit || '', cat: p.Cat || 'Chưa phân nhóm', qty: s.qty, rev: s.revenue };
        });
    }, [data]);

    const totalQty = useMemo(() => productList.reduce((s, p) => s + p.qty, 0), [productList]);
    const totalRev = data?.totalRevenue ?? 0;
    const days = periodDaysInput > 0 ? periodDaysInput : (data?.periodDays || 7);

    const bestSorted = useMemo(
        () => [...productList].sort((a, b) => (sortBy === 'qty' ? b.qty - a.qty : b.rev - a.rev)).slice(0, topN),
        [productList, sortBy, topN]
    );

    const barTop = useMemo(
        () => [...productList].sort((a, b) => (barMode === 'qty' ? b.qty - a.qty : b.rev - a.rev)).slice(0, 10),
        [productList, barMode]
    );
    const barMax = Math.max(1, ...barTop.map((p) => (barMode === 'qty' ? p.qty : p.rev)));

    const pieCats = useMemo(() => {
        if (!data?.categoryStats) return [];
        const entries = Object.entries(data.categoryStats).map(([name, s]) => ({ name, val: pieMode === 'qty' ? s.qty : s.revenue }));
        return entries.sort((a, b) => b.val - a.val);
    }, [data, pieMode]);

    const pieTotal = pieCats.reduce((s, c) => s + c.val, 0) || 1;
    const conicGradient = useMemo(() => {
        let acc = 0;
        const stops = pieCats.map((c, i) => {
            const start = (acc / pieTotal) * 360;
            acc += c.val;
            const end = (acc / pieTotal) * 360;
            return `${PAL[i % PAL.length]} ${start}deg ${end}deg`;
        });
        return `conic-gradient(${stops.join(', ')})`;
    }, [pieCats, pieTotal]);

    const forecastList = useMemo(
        () => productList.map((p) => ({ ...p, rate: p.qty / days, w: (p.qty / days) * 7, m: (p.qty / days) * 30 })).sort((a, b) => b.rate - a.rate),
        [productList, days]
    );
    const totW = forecastList.reduce((s, p) => s + p.w, 0);
    const totM = forecastList.reduce((s, p) => s + p.m, 0);
    const totC = forecastList.reduce((s, p) => s + p.rate * customDays, 0);

    const abcRows = useMemo(() => {
        const sorted = [...productList].sort((a, b) => (abcMode === 'qty' ? b.qty - a.qty : b.rev - a.rev));
        const total = sorted.reduce((s, p) => s + (abcMode === 'qty' ? p.qty : p.rev), 0) || 1;
        let cum = 0;
        return sorted.map((p) => {
            cum += abcMode === 'qty' ? p.qty : p.rev;
            const cumPct = (cum / total) * 100;
            const cls: 'A' | 'B' | 'C' = cumPct <= 80 ? 'A' : cumPct <= 95 ? 'B' : 'C';
            return { ...p, cumPct, cls };
        });
    }, [productList, abcMode]);
    const abcGroups = useMemo(() => {
        const g = { A: { n: 0, v: 0 }, B: { n: 0, v: 0 }, C: { n: 0, v: 0 } };
        abcRows.forEach((r) => { g[r.cls].n++; g[r.cls].v += abcMode === 'qty' ? r.qty : r.rev; });
        return g;
    }, [abcRows, abcMode]);
    const abcTotal = abcRows.reduce((s, p) => s + (abcMode === 'qty' ? p.qty : p.rev), 0) || 1;

    const slowList = useMemo(() => productList.filter((p) => p.qty <= slowTh).sort((a, b) => a.qty - b.qty), [productList, slowTh]);

    const restockList = useMemo(
        () => productList.map((p) => ({ ...p, rate: p.qty / days })).sort((a, b) => b.rate - a.rate),
        [productList, days]
    );

    function updateStock(code: string, val: string) {
        setStock((prev) => {
            const next: Record<string, number | ''> = { ...prev, [code]: val === '' ? '' : (parseFloat(val) || 0) };
            saveStock(next);
            return next;
        });
    }

    const compareRows = useMemo(() => {
        if (!data?.productStats || !cmpData?.productStats) return null;
        const curMap: Record<string, { name: string; cat: string; qty: number }> = {};
        const prevMap: Record<string, { name: string; cat: string; qty: number }> = {};
        productList.forEach((p) => (curMap[p.code] = { name: p.name, cat: p.cat, qty: p.qty }));
        Object.entries(cmpData.productStats).forEach(([pid, s]) => {
            const p = cmpData.productMap?.[Number(pid)] || { Code: pid, Name: '(không rõ tên)', Cat: 'Chưa phân nhóm' };
            prevMap[p.Code] = { name: p.Name, cat: p.Cat || '', qty: s.qty };
        });
        const codes = new Set([...Object.keys(curMap), ...Object.keys(prevMap)]);
        const rows = [...codes].map((code) => {
            const cur = curMap[code], prev = prevMap[code];
            const qc = cur?.qty || 0, qp = prev?.qty || 0;
            const base = cur || prev;
            return { code, name: base.name, qc, qp, dq: qc - qp, pct: qp > 0 ? ((qc - qp) / qp) * 100 : null, isNew: !prev, gone: !cur };
        });
        return {
            up: rows.filter((r) => r.dq > 0).sort((a, b) => b.dq - a.dq).slice(0, 10),
            down: rows.filter((r) => r.dq < 0).sort((a, b) => a.dq - b.dq).slice(0, 10),
            news: rows.filter((r) => r.isNew && r.qc > 0).sort((a, b) => b.qc - a.qc),
            gone: rows.filter((r) => r.gone && r.qp > 0).sort((a, b) => b.qp - a.qp),
        };
    }, [data, cmpData, productList]);

    function downloadCSV() {
        let csv = 'Mã hàng,Tên hàng,Nhóm hàng,Đã bán trong kỳ,Bán/ngày,Dự báo 7 ngày,Dự báo 30 ngày,Dự báo ' + customDays + ' ngày\n';
        forecastList.forEach((p) => {
            const nm = '"' + p.name.replace(/"/g, '""') + '"';
            const ct = '"' + p.cat.replace(/"/g, '""') + '"';
            csv += [p.code, nm, ct, p.qty, p.rate.toFixed(2), Math.round(p.w), Math.round(p.m), Math.round(p.rate * customDays)].join(',') + '\n';
        });
        const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'du-bao-ban-hang.csv';
        a.click();
        URL.revokeObjectURL(a.href);
    }

    return (
        <div style={{
            fontFamily: "'Be Vietnam Pro', system-ui, sans-serif", color: C.ink,
            background: `radial-gradient(1200px 500px at 85% -10%, #fff2f5 0%, transparent 60%),
                         radial-gradient(900px 500px at -10% 10%, #fbeef1 0%, transparent 55%), ${C.cream}`,
            minHeight: '100vh',
        }}>
            <link rel="preconnect" href="https://fonts.googleapis.com" />
            <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
            <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@500;600;700&family=Be+Vietnam+Pro:wght@300;400;500;600;700&display=swap" rel="stylesheet" />

            {/* ===== Header ===== */}
            <header style={{
                background: `linear-gradient(135deg, ${C.maroonDark} 0%, ${C.maroon} 60%, #9c2647 100%)`,
                color: '#fff', borderRadius: '0 0 28px 28px', boxShadow: '0 10px 40px -18px rgba(107,17,41,.35)',
            }}>
                <div style={{ maxWidth: 1180, margin: '0 auto', padding: '30px 22px 34px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontWeight: 600, letterSpacing: '.18em', textTransform: 'uppercase', fontSize: 12.5, opacity: .92 }}>
                        <span style={{ width: 9, height: 9, borderRadius: '50%', background: C.gold, boxShadow: '0 0 0 4px rgba(200,155,60,.25)' }} />
                        Báo cáo bán hàng
                    </div>
                    <h1 style={{ fontFamily: "'Playfair Display', serif", fontWeight: 600, fontSize: 'clamp(26px,4vw,38px)', margin: '14px 0 6px', lineHeight: 1.1 }}>
                        Phân tích &amp; dự báo bán hàng
                    </h1>
                    <p style={{ fontSize: 14.5, maxWidth: 640, opacity: .9, fontWeight: 300 }}>
                        Chọn khoảng ngày và chi nhánh để xem hàng bán chạy, biểu đồ, dự báo và gợi ý nhập hàng.
                    </p>
                </div>
            </header>

            <div style={{ maxWidth: 1180, margin: '0 auto', padding: '0 22px 90px' }}>

                {/* ===== Thanh lọc ngang ===== */}
                <div style={{
                    marginTop: -26, position: 'relative', zIndex: 2, background: C.white,
                    border: `1px solid ${C.line}`, borderRadius: 18, padding: '16px 20px',
                    boxShadow: '0 10px 40px -18px rgba(107,17,41,.35)',
                    display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12,
                }}>
                    <div style={{ display: 'inline-flex', flexWrap: 'wrap', background: C.pinkBg, borderRadius: 999, padding: 3, gap: 2 }}>
                        {PRESET_LABELS.map((p) => (
                            <button
                                key={p.value}
                                onClick={() => setPreset(p.value)}
                                style={{
                                    border: 'none', background: preset === p.value ? C.maroon : 'transparent',
                                    color: preset === p.value ? '#fff' : C.maroon,
                                    padding: '7px 14px', borderRadius: 999, fontSize: 12.5, fontWeight: 600, cursor: 'pointer',
                                    fontFamily: 'inherit', transition: '.15s',
                                }}
                            >
                                {p.label}
                            </button>
                        ))}
                    </div>

                    {preset === 'custom' && (
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                            <input type="datetime-local" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} style={inputSmStyle} />
                            <span style={{ color: C.inkSoft, fontSize: 13 }}>→</span>
                            <input type="datetime-local" value={customTo} onChange={(e) => setCustomTo(e.target.value)} style={inputSmStyle} />
                        </div>
                    )}

                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: C.inkSoft, marginLeft: 'auto', visibility: 'hidden' }}>
                        <span>Chi nhánh</span>
                        <input type="text" value={branchId} onChange={(e) => setBranchId(e.target.value)} style={{ ...inputSmStyle, width: 100 }} />
                    </div>

                    <button
                        onClick={chayBaoCao}
                        disabled={loading}
                        style={{
                            background: loading ? '#c8a4b0' : C.maroon, color: '#fff', border: 'none',
                            padding: '10px 22px', borderRadius: 999, fontWeight: 600, fontSize: 13.5,
                            cursor: loading ? 'default' : 'pointer', fontFamily: 'inherit', transition: '.15s',
                        }}
                    >
                        {loading ? 'Đang tải…' : 'Lọc báo cáo'}
                    </button>
                </div>

                {error && (
                    <div style={{ marginTop: 18, background: '#fff3f5', border: '1px solid #f3c4cf', color: '#8a1430', borderRadius: 12, padding: '12px 16px', fontSize: 14 }}>
                        ⚠ {error}
                    </div>
                )}

                {!data && !loading && (
                    <div style={{ marginTop: 30, textAlign: 'center', color: C.inkSoft, fontSize: 14.5, padding: '40px 0' }}>
                        Chọn khoảng ngày và bấm "Lọc báo cáo" để xem phân tích.
                    </div>
                )}

                {data && (
                    <div style={{ marginTop: 30 }}>
                        {/* Cards tổng quan */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 26 }}>
                            {[
                                { lbl: 'Số mặt hàng', val: NUM(productList.length), sub: 'sản phẩm có phát sinh' },
                                { lbl: 'Tổng số lượng bán', val: NUM(totalQty), sub: 'đơn vị trong kỳ' },
                                { lbl: 'Tổng doanh thu', val: VND(totalRev), sub: (data.orders?.length ?? 0) + ' đơn' },
                                { lbl: 'Kỳ báo cáo', val: days + ' ngày', sub: data.periodLabel || '—' },
                            ].map((c, i) => (
                                <div key={i} style={{ background: C.white, border: `1px solid ${C.line}`, borderRadius: 18, padding: '18px 20px', position: 'relative', overflow: 'hidden' }}>
                                    <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, background: C.maroon }} />
                                    <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: '.08em', color: C.inkSoft, fontWeight: 600 }}>{c.lbl}</div>
                                    <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 27, fontWeight: 600, color: C.maroon, marginTop: 6, lineHeight: 1.1 }}>{c.val}</div>
                                    <div style={{ fontSize: 12.5, color: C.inkSoft, marginTop: 3 }}>{c.sub}</div>
                                </div>
                            ))}
                        </div>

                        {/* Hàng bán chạy nhất */}
                        <div style={sectionStyle}>
                            <div style={h3Style}>Hàng bán chạy nhất <span style={tagStyle}>{sortBy === 'qty' ? 'Theo số lượng' : 'Theo doanh thu'}</span></div>
                            <div style={descStyle}>Xếp hạng sản phẩm theo số lượng hoặc doanh thu trong kỳ báo cáo.</div>
                            <div>
                                <span style={segWrapStyle}>
                                    <button style={segBtnStyle(sortBy === 'qty')} onClick={() => setSortBy('qty')}>Theo số lượng</button>
                                    <button style={segBtnStyle(sortBy === 'rev')} onClick={() => setSortBy('rev')}>Theo doanh thu</button>
                                </span>
                                <select value={topN} onChange={(e) => setTopN(Number(e.target.value))} style={selectStyle}>
                                    {[10, 15, 20, 999].map((n) => <option key={n} value={n}>{n === 999 ? 'Tất cả' : n}</option>)}
                                </select>
                            </div>
                            <div style={{ ...tblScrollStyle, marginTop: 12 }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13.5 }}>
                                    <thead><tr><th style={thStyle}>#</th><th style={thStyle}>Sản phẩm</th><th style={thStyle}>Nhóm hàng</th><th style={{ ...thStyle, textAlign: 'right' }}>Số lượng</th><th style={{ ...thStyle, textAlign: 'right' }}>Doanh thu</th><th style={{ ...thStyle, textAlign: 'right' }}>% SL</th></tr></thead>
                                    <tbody>
                                        {bestSorted.map((p, i) => (
                                            <tr key={p.pid}>
                                                <td style={tdStyle}><span style={{ display: 'inline-grid', placeItems: 'center', width: 24, height: 24, borderRadius: 7, fontWeight: 700, fontSize: 12, background: i === 0 ? C.maroon : i === 1 ? C.maroonSoft : i === 2 ? C.gold : C.pinkBg, color: i < 3 ? '#fff' : C.maroon }}>{i + 1}</span></td>
                                                <td style={tdStyle}><div style={{ fontWeight: 500 }}>{p.name}</div><div style={{ fontSize: 11.5, color: C.inkSoft }}>{p.code} · {p.unit}</div></td>
                                                <td style={{ ...tdStyle, fontSize: 11.5, color: C.maroonSoft }}>{p.cat}</td>
                                                <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 600 }}>{NUM(p.qty)}</td>
                                                <td style={{ ...tdStyle, textAlign: 'right' }}>{VND(p.rev)}</td>
                                                <td style={{ ...tdStyle, textAlign: 'right' }}>{totalQty > 0 ? ((p.qty / totalQty) * 100).toFixed(1) : '0'}%</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Biểu đồ */}
                        <div style={sectionStyle}>
                            <div style={h3Style}>Biểu đồ trực quan</div>
                            <div style={descStyle}>Biểu đồ cột: top 10 sản phẩm. Biểu đồ tròn: tỉ trọng theo nhóm hàng.</div>
                            <div>
                                <span style={segWrapStyle}>
                                    <button style={segBtnStyle(barMode === 'qty')} onClick={() => setBarMode('qty')}>Cột: số lượng</button>
                                    <button style={segBtnStyle(barMode === 'rev')} onClick={() => setBarMode('rev')}>Cột: doanh thu</button>
                                </span>
                                <span style={segWrapStyle}>
                                    <button style={segBtnStyle(pieMode === 'rev')} onClick={() => setPieMode('rev')}>Tròn: doanh thu</button>
                                    <button style={segBtnStyle(pieMode === 'qty')} onClick={() => setPieMode('qty')}>Tròn: số lượng</button>
                                </span>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1.35fr 1fr', gap: 22, marginTop: 16 }}>
                                <div>
                                    {barTop.map((p, i) => {
                                        const val = barMode === 'qty' ? p.qty : p.rev;
                                        const pct = (val / barMax) * 100;
                                        return (
                                            <div key={p.pid} style={{ marginBottom: 12 }}>
                                                <div style={{ fontSize: 13, color: C.ink, marginBottom: 4, display: 'flex', justifyContent: 'space-between' }}>
                                                    <span>{i + 1}. {short(p.name, 30)}</span>
                                                    <span style={{ fontWeight: 600 }}>{barMode === 'qty' ? NUM(val) : VND(val)}</span>
                                                </div>
                                                <div style={{ height: 7, background: C.pinkBg2, borderRadius: 6 }}>
                                                    <div style={{ height: 7, width: pct + '%', background: C.maroon, opacity: .85, borderRadius: 6 }} />
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
                                    <div style={{ width: 190, height: 190, borderRadius: '50%', background: conicGradient, position: 'relative' }}>
                                        <div style={{ position: 'absolute', inset: 38, background: '#fff', borderRadius: '50%' }} />
                                    </div>
                                    <div style={{ width: '100%' }}>
                                        {pieCats.map((c, i) => (
                                            <div key={c.name} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, marginBottom: 5 }}>
                                                <span style={{ width: 10, height: 10, borderRadius: 3, background: PAL[i % PAL.length], flexShrink: 0 }} />
                                                <span style={{ flex: 1, color: C.ink }}>{c.name}</span>
                                                <span style={{ color: C.inkSoft }}>{((c.val / pieTotal) * 100).toFixed(1)}%</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Dự báo */}
                        <div style={sectionStyle}>
                            <div style={h3Style}>Dự báo bán hàng <span style={tagStyle}>Ước tính</span></div>
                            <div style={descStyle}>Ước tính tuyến tính: giả định tốc độ bán giữ nguyên như kỳ vừa rồi. Không tính mùa vụ hay khuyến mãi.</div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', fontSize: 13, color: C.inkSoft, marginBottom: 16 }}>
                                <span>Số ngày trong kỳ:</span>
                                <input type="number" min={1} value={periodDaysInput} onChange={(e) => setPeriodDaysInput(Number(e.target.value))} style={inputSmStyle} />
                                <span>· trung bình <b style={{ color: C.maroon }}>{NUM(totalQty / days)}</b> sản phẩm/ngày</span>
                                <span style={{ marginLeft: 'auto' }}>Kỳ dự báo tuỳ chọn:</span>
                                <input type="number" min={1} value={customDays} onChange={(e) => setCustomDays(Number(e.target.value))} style={inputSmStyle} />
                                <span>ngày</span>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 16 }}>
                                {[
                                    { h: 'Dự kiến 1 tuần', q: totW, r: '≈ ' + VND((totalRev / days) * 7) },
                                    { h: 'Dự kiến 1 tháng', q: totM, r: '≈ ' + VND((totalRev / days) * 30) },
                                    { h: `Dự kiến ${customDays} ngày`, q: totC, r: '≈ ' + VND((totalRev / days) * customDays) },
                                ].map((c, i) => (
                                    <div key={i} style={{ border: `1px solid ${C.line}`, borderRadius: 16, padding: '16px 18px', background: 'linear-gradient(160deg, #fff, #fff7f9)' }}>
                                        <div style={{ fontSize: 12.5, color: C.inkSoft, textTransform: 'uppercase', fontWeight: 600, letterSpacing: '.05em' }}>{c.h}</div>
                                        <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 28, fontWeight: 600, color: C.maroon, margin: '4px 0 2px' }}>{NUM(c.q)} <span style={{ fontSize: 13, color: C.inkSoft }}>sp</span></div>
                                        <div style={{ fontSize: 13, color: C.inkSoft }}>{c.r}</div>
                                    </div>
                                ))}
                            </div>
                            <button onClick={downloadCSV} style={{ ...ghostBtnStyle, marginBottom: 12 }}>Tải dự báo (.csv)</button>
                            <div style={{ ...tblScrollStyle, maxHeight: 360 }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13.5 }}>
                                    <thead><tr><th style={thStyle}>#</th><th style={thStyle}>Sản phẩm</th><th style={{ ...thStyle, textAlign: 'right' }}>Bán/ngày</th><th style={{ ...thStyle, textAlign: 'right' }}>1 tuần</th><th style={{ ...thStyle, textAlign: 'right' }}>1 tháng</th><th style={{ ...thStyle, textAlign: 'right' }}>{customDays} ngày</th></tr></thead>
                                    <tbody>
                                        {forecastList.slice(0, 20).map((p, i) => (
                                            <tr key={p.pid}>
                                                <td style={tdStyle}>{i + 1}</td>
                                                <td style={tdStyle}><div style={{ fontWeight: 500 }}>{p.name}</div><div style={{ fontSize: 11.5, color: C.inkSoft }}>{p.code} · {p.cat}</div></td>
                                                <td style={{ ...tdStyle, textAlign: 'right' }}>{p.rate.toFixed(2)}</td>
                                                <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 600 }}>{NUM(p.w)}</td>
                                                <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 600 }}>{NUM(p.m)}</td>
                                                <td style={{ ...tdStyle, textAlign: 'right' }}>{NUM(p.rate * customDays)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* ABC & bán chậm */}
                        <div style={sectionStyle}>
                            <div style={h3Style}>Phân tích ABC &amp; hàng bán chậm <span style={tagStyle}>{abcMode === 'qty' ? 'Theo số lượng' : 'Theo doanh thu'}</span></div>
                            <div style={descStyle}>Quy tắc 80/20: nhóm A tạo phần lớn doanh thu — ưu tiên vốn, không để đứt hàng. Nhóm C bán chậm, cân nhắc xả hoặc ngừng nhập.</div>
                            <div>
                                <span style={segWrapStyle}>
                                    <button style={segBtnStyle(abcMode === 'rev')} onClick={() => setAbcMode('rev')}>ABC theo doanh thu</button>
                                    <button style={segBtnStyle(abcMode === 'qty')} onClick={() => setAbcMode('qty')}>ABC theo số lượng</button>
                                </span>
                                <span style={{ fontSize: 13, color: C.inkSoft }}>Hàng bán chậm: bán ≤ <input type="number" min={0} value={slowTh} onChange={(e) => setSlowTh(Number(e.target.value))} style={inputSmStyle} /> cái/kỳ</span>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, margin: '16px 0' }}>
                                {(['A', 'B', 'C'] as const).map((cls) => {
                                    const g = abcGroups[cls];
                                    const color = cls === 'A' ? C.maroon : cls === 'B' ? C.gold : '#9a8c90';
                                    const desc = cls === 'A' ? 'Chủ lực — ưu tiên vốn' : cls === 'B' ? 'Quan trọng vừa' : 'Bán chậm — cân nhắc xả';
                                    return (
                                        <div key={cls} style={{ border: `1px solid ${C.line}`, borderRadius: 16, padding: '16px 18px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: C.inkSoft, fontWeight: 600 }}>
                                                <span style={abcBadge(cls)}>{cls}</span>
                                                {desc}
                                            </div>
                                            <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 24, fontWeight: 600, color, margin: '6px 0 2px' }}>{g.n} <span style={{ fontFamily: "'Be Vietnam Pro', sans-serif", fontSize: 13, color: C.inkSoft }}>mặt hàng</span></div>
                                            <div style={{ fontSize: 12.5, color: C.inkSoft }}>{((g.v / abcTotal) * 100).toFixed(0)}% {abcMode === 'qty' ? 'số lượng' : 'doanh thu'}</div>
                                        </div>
                                    );
                                })}
                            </div>
                            <div style={{ ...tblScrollStyle, maxHeight: 360 }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13.5 }}>
                                    <thead><tr><th style={thStyle}>Nhóm</th><th style={thStyle}>Sản phẩm</th><th style={{ ...thStyle, textAlign: 'right' }}>Số lượng</th><th style={{ ...thStyle, textAlign: 'right' }}>Doanh thu</th><th style={{ ...thStyle, textAlign: 'right' }}>% luỹ kế</th></tr></thead>
                                    <tbody>
                                        {abcRows.map((r) => (
                                            <tr key={r.pid}>
                                                <td style={tdStyle}><span style={abcBadge(r.cls)}>{r.cls}</span></td>
                                                <td style={tdStyle}><div style={{ fontWeight: 500 }}>{r.name}</div><div style={{ fontSize: 11.5, color: C.inkSoft }}>{r.code} · {r.cat}</div></td>
                                                <td style={{ ...tdStyle, textAlign: 'right' }}>{NUM(r.qty)}</td>
                                                <td style={{ ...tdStyle, textAlign: 'right' }}>{VND(r.rev)}</td>
                                                <td style={{ ...tdStyle, textAlign: 'right' }}>{r.cumPct.toFixed(1)}%</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            <div>
                                {slowList.length === 0 ? (
                                    <div style={{ fontSize: 13, color: C.inkSoft, marginTop: 14 }}>Không có mặt hàng nào bán ≤ {slowTh} cái trong kỳ.</div>
                                ) : (
                                    <>
                                        <div style={subheadStyle}>Hàng bán chậm — {slowList.length} mặt hàng</div>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                            {slowList.map((p) => (
                                                <span key={p.pid} style={chipStyle}>{p.name} · <b>{p.qty}</b></span>
                                            ))}
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>

                        {/* Gợi ý nhập hàng */}
                        <div style={sectionStyle}>
                            <div style={h3Style}>Gợi ý nhập hàng <span style={tagStyle}>Cảnh báo hết hàng</span></div>
                            <div style={descStyle}>Nhập tồn kho hiện tại để biết còn bán được bao nhiêu ngày và cần nhập thêm bao nhiêu. Tồn kho được lưu trên trình duyệt của bạn.</div>
                            <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap', fontSize: 13, color: C.inkSoft, marginBottom: 14 }}>
                                <span>Đủ hàng cho <input type="number" min={1} value={coverDays} onChange={(e) => setCoverDays(Number(e.target.value))} style={inputSmStyle} /> ngày tới</span>
                                <span>Cảnh báo khi còn dưới <input type="number" min={1} value={alertDays} onChange={(e) => setAlertDays(Number(e.target.value))} style={inputSmStyle} /> ngày</span>
                                <button onClick={() => { setStock({}); saveStock({}); }} style={ghostBtnStyle}>Xoá tồn kho đã nhập</button>
                            </div>
                            <div style={{ ...tblScrollStyle, maxHeight: 420 }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13.5 }}>
                                    <thead><tr><th style={thStyle}>Sản phẩm</th><th style={{ ...thStyle, textAlign: 'right' }}>Bán/ngày</th><th style={{ ...thStyle, textAlign: 'right' }}>Tồn kho</th><th style={{ ...thStyle, textAlign: 'right' }}>Đủ bán</th><th style={{ ...thStyle, textAlign: 'right' }}>Cần nhập</th><th style={thStyle}>Trạng thái</th></tr></thead>
                                    <tbody>
                                        {restockList.map((p) => {
                                            const sv = stock[p.code];
                                            const hasStock = sv !== undefined && sv !== '';
                                            let cls: 'ok' | 'warn' | 'bad' | 'none' = 'none';
                                            let txt = 'Nhập tồn kho';
                                            let coverTxt = '—', needTxt = '—';
                                            if (hasStock) {
                                                const stockNum = Number(sv);
                                                const cdays = p.rate > 0 ? stockNum / p.rate : Infinity;
                                                const need = Math.max(0, Math.ceil(p.rate * coverDays - stockNum));
                                                coverTxt = p.rate > 0 ? (isFinite(cdays) ? Math.floor(cdays) + ' ngày' : '—') : '∞';
                                                needTxt = need > 0 ? NUM(need) : '0';
                                                if (p.rate <= 0) { cls = 'none'; txt = 'Không bán'; }
                                                else if (cdays <= 0) { cls = 'bad'; txt = 'Hết hàng'; }
                                                else if (cdays < alertDays) { cls = 'bad'; txt = 'Sắp hết'; }
                                                else if (cdays < alertDays * 2) { cls = 'warn'; txt = 'Cần theo dõi'; }
                                                else { cls = 'ok'; txt = 'Đủ hàng'; }
                                            }
                                            return (
                                                <tr key={p.pid}>
                                                    <td style={tdStyle}><div style={{ fontWeight: 500 }}>{p.name}</div><div style={{ fontSize: 11.5, color: C.inkSoft }}>{p.code} · {p.cat}</div></td>
                                                    <td style={{ ...tdStyle, textAlign: 'right' }}>{p.rate.toFixed(2)}</td>
                                                    <td style={{ ...tdStyle, textAlign: 'right' }}>
                                                        <input type="number" min={0} step={1} value={sv ?? ''} placeholder="—" onChange={(e) => updateStock(p.code, e.target.value)} style={{ ...inputSmStyle, width: 76, textAlign: 'right' }} />
                                                    </td>
                                                    <td style={{ ...tdStyle, textAlign: 'right' }}>{coverTxt}</td>
                                                    <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 600 }}>{needTxt}</td>
                                                    <td style={tdStyle}><span style={pillStyle(cls)}>{txt}</span></td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* So sánh 2 kỳ */}
                        <div style={sectionStyle}>
                            <div style={h3Style}>So sánh 2 kỳ báo cáo <span style={tagStyle}>Tăng / giảm</span></div>
                            <div style={descStyle}>Kỳ đang xem ở trên là <b>kỳ này</b>. Chọn khoảng ngày <b>kỳ trước</b> để xem mặt hàng nào đang lên, đang xuống.</div>
                            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 16 }}>
                                <select value={cmpPreset} onChange={(e) => setCmpPreset(e.target.value as FilterPreset)} style={selectStyle}>
                                    {PRESET_LABELS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
                                </select>
                                {cmpPreset === 'custom' && (
                                    <>
                                        <input type="datetime-local" value={cmpFrom} onChange={(e) => setCmpFrom(e.target.value)} style={inputSmStyle} />
                                        <input type="datetime-local" value={cmpTo} onChange={(e) => setCmpTo(e.target.value)} style={inputSmStyle} />
                                    </>
                                )}
                                <button onClick={chayBaoCaoCompare} disabled={cmpLoading} style={{
                                    background: cmpLoading ? '#c8a4b0' : C.maroon, color: '#fff', border: 'none', padding: '9px 20px',
                                    borderRadius: 999, fontWeight: 600, fontSize: 13, cursor: cmpLoading ? 'default' : 'pointer', fontFamily: 'inherit',
                                }}>
                                    {cmpLoading ? 'Đang tải...' : 'So sánh'}
                                </button>
                            </div>

                            {cmpData && compareRows && (
                                <>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 14, marginBottom: 16 }}>
                                        {[
                                            { lbl: 'Số lượng bán', val: NUM(totalQty), sub: 'kỳ trước ' + NUM(Object.values(cmpData.productStats || {}).reduce((s, x) => s + x.qty, 0)) },
                                            { lbl: 'Doanh thu', val: VND(totalRev), sub: 'kỳ trước ' + VND(cmpData.totalRevenue ?? 0) },
                                        ].map((c, i) => (
                                            <div key={i} style={{ background: C.white, border: `1px solid ${C.line}`, borderRadius: 18, padding: '16px 18px', position: 'relative', overflow: 'hidden' }}>
                                                <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, background: C.maroon }} />
                                                <div style={{ fontSize: 11, textTransform: 'uppercase', color: C.inkSoft, fontWeight: 600 }}>{c.lbl}</div>
                                                <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, fontWeight: 600, color: C.maroon, marginTop: 4 }}>{c.val}</div>
                                                <div style={{ fontSize: 12.5, color: C.inkSoft }}>{c.sub}</div>
                                            </div>
                                        ))}
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
                                        {[{ title: '📈 Tăng nhiều nhất', list: compareRows.up }, { title: '📉 Giảm nhiều nhất', list: compareRows.down }].map((g, gi) => (
                                            <div key={gi}>
                                                <div style={subheadStyle}>{g.title}</div>
                                                {g.list.length === 0 ? <div style={{ fontSize: 13, color: C.inkSoft }}>Không có.</div> : (
                                                    <div style={{ ...tblScrollStyle, maxHeight: 300 }}>
                                                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13.5 }}>
                                                            <thead><tr><th style={thStyle}>Sản phẩm</th><th style={{ ...thStyle, textAlign: 'right' }}>Trước</th><th style={{ ...thStyle, textAlign: 'right' }}>Này</th><th style={{ ...thStyle, textAlign: 'right' }}>Δ</th></tr></thead>
                                                            <tbody>
                                                                {g.list.map((r) => (
                                                                    <tr key={r.code}>
                                                                        <td style={tdStyle}><div style={{ fontWeight: 500 }}>{r.name}</div><div style={{ fontSize: 11.5, color: C.inkSoft }}>{r.code}</div></td>
                                                                        <td style={{ ...tdStyle, textAlign: 'right' }}>{NUM(r.qp)}</td>
                                                                        <td style={{ ...tdStyle, textAlign: 'right' }}>{NUM(r.qc)}</td>
                                                                        <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 700, color: r.dq >= 0 ? '#1f7a4d' : '#b3261e' }}>
                                                                            {r.dq >= 0 ? '+' : ''}{NUM(r.dq)}
                                                                            <div style={{ fontSize: 11 }}>{r.pct == null ? '(mới)' : (r.dq >= 0 ? '+' : '') + r.pct.toFixed(0) + '%'}</div>
                                                                        </td>
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                    {compareRows.news.length > 0 && (
                                        <div>
                                            <div style={subheadStyle}>Mặt hàng mới (chỉ có kỳ này) — {compareRows.news.length}</div>
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                                {compareRows.news.slice(0, 40).map((r) => (
                                                    <span key={r.code} style={chipStyle}>{r.name} · <b>{r.qc}</b></span>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                    {compareRows.gone.length > 0 && (
                                        <div>
                                            <div style={subheadStyle}>Không còn bán (có ở kỳ trước) — {compareRows.gone.length}</div>
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                                {compareRows.gone.slice(0, 40).map((r) => (
                                                    <span key={r.code} style={chipStyle}>{r.name} · trước {r.qp}</span>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>

                        <div style={{ textAlign: 'center', color: C.inkSoft, fontSize: 12.5, marginTop: 36 }}>
                            Báo cáo nội bộ · Phân tích &amp; dự báo bán hàng
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}