import { useMemo } from "react";

/**
 * LineChart — Graphique linéaire SVG responsive, multi-séries.
 * Props:
 *   series — [{ data: [{label, value}], color, gradient }]
 *   data   — Série simple (alternative) : [{label, value}]
 *   height — Hauteur du graphique
 *   color  — Couleur principale (si data simple)
 */
export function LineChart({ data = [], series = [], height = 200, color = "#1D9E75", gradient = true }) {
  const width = 480;
  const pad = { top: 20, right: 16, bottom: 30, left: 40 };
  const chartW = width - pad.left - pad.right;
  const chartH = height - pad.top - pad.bottom;

  // Normaliser : soit `data` (série unique), soit `series` (multi)
  const normalizedSeries = series.length
    ? series
    : data.length
      ? [{ data, color, gradient }]
      : [];

  const labels = normalizedSeries[0]?.data?.map(d => d.label) || [];

  const { maxVal, minVal } = useMemo(() => {
    if (!normalizedSeries.length) return { maxVal: 0, minVal: 0 };
    const all = normalizedSeries.flatMap(s => s.data.map(d => d.value));
    return { maxVal: Math.max(...all, 1), minVal: Math.min(...all, 0) };
  }, [normalizedSeries]);

  if (!normalizedSeries.length) {
    return (
      <div className="flex items-center justify-center h-50 text-gray-500 text-sm">
        Aucune donnée disponible
      </div>
    );
  }

  const buildPoints = (s) => (s.data || []).map((d, i) => ({
    x: pad.left + (i / Math.max(s.data.length - 1, 1)) * chartW,
    y: pad.top + chartH - ((d.value - minVal) / (maxVal - minVal || 1)) * chartH,
    ...d,
  }));

  const pathDFor = (pts) => pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");
  const areaDFor = (pts) => `${pathDFor(pts)} L ${pts[pts.length - 1].x} ${pad.top + chartH} L ${pts[0].x} ${pad.top + chartH} Z`;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full" preserveAspectRatio="xMidYMid meet">
      {normalizedSeries.some(s => s.gradient) && (
        <defs>
          {normalizedSeries.map((s, si) => s.gradient && (
            <linearGradient key={si} id={`line-grad-${si}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={s.color} stopOpacity="0.22" />
              <stop offset="100%" stopColor={s.color} stopOpacity="0.01" />
            </linearGradient>
          ))}
        </defs>
      )}
      {/* Grille horizontale */}
      {[0, 0.25, 0.5, 0.75, 1].map((f, i) => {
        const y = pad.top + chartH - f * chartH;
        const val = Math.round(minVal + f * (maxVal - minVal));
        return (
          <g key={i}>
            <line x1={pad.left} y1={y} x2={width - pad.right} y2={y} stroke="#1e293b" strokeWidth="1" />
            <text x={pad.left - 8} y={y + 4} textAnchor="end" fill="#64748b" fontSize="10">{val.toLocaleString("fr-FR")}</text>
          </g>
        );
      })}

      {/* Séries */}
      {normalizedSeries.map((s, si) => {
        const pts = buildPoints(s);
        if (!pts.length) return null;
        return (
          <g key={si}>
            {s.gradient && <path d={areaDFor(pts)} fill={`url(#line-grad-${si})`} />}
            <path d={pathDFor(pts)} fill="none" stroke={s.color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            {pts.map((p, i) => (
              <circle key={i} cx={p.x} cy={p.y} r="3.5" fill={s.color} stroke="#0f172a" strokeWidth="2" />
            ))}
          </g>
        );
      })}

      {/* Labels X */}
      {labels.filter((_, i) => labels.length <= 12 || i % Math.ceil(labels.length / 6) === 0 || i === labels.length - 1).map((l, i) => (
        <text key={i} x={pad.left + (i / Math.max(labels.length - 1, 1)) * chartW} y={height - 6} textAnchor="middle" fill="#64748b" fontSize="9">{l}</text>
      ))}
    </svg>
  );
}

/**
 * DonutChart — Graphique circulaire SVG.
 * Props: data={[{label, value, color}]}
 */
export function DonutChart({ data = [], size = 180, thickness = 28 }) {
  const cx = size / 2;
  const cy = size / 2;
  const r = (size - thickness) / 2;
  const total = data.reduce((s, d) => s + d.value, 0) || 1;

  const COLORS = ["#1D9E75", "#0F6E56", "#EF9F27", "#D85A30", "#475569", "#6366f1", "#06b6d4", "#d946ef"];

  let offset = 0;
  const arcs = data.map((d, i) => {
    const fraction = d.value / total;
    const angle = fraction * 360;
    const color = d.color || COLORS[i % COLORS.length];
    const startAngle = offset;
    offset += angle;
    return { label: d.label, value: d.value, fraction, color, startAngle, angle, percent: (fraction * 100).toFixed(1) };
  });

  if (!data.length) {
    return (
      <div className="flex items-center justify-center" style={{ width: size, height: size }}>
        <span className="text-gray-500 text-sm">—</span>
      </div>
    );
  }

  const polarToCart = (cx, cy, r, angleDeg) => ({
    x: cx + r * Math.cos((angleDeg - 90) * (Math.PI / 180)),
    y: cy + r * Math.sin((angleDeg - 90) * (Math.PI / 180)),
  });

  const describeArc = (startAngle, endAngle) => {
    const start = polarToCart(cx, cy, r, startAngle);
    const end = polarToCart(cx, cy, r, endAngle);
    const largeArc = endAngle - startAngle > 180 ? 1 : 0;
    return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 1 ${end.x} ${end.y}`;
  };

  return (
    <div className="flex flex-col items-center gap-3">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#1e293b" strokeWidth={thickness} />
        {arcs.map((arc, i) => {
          if (arc.angle >= 360) {
            return <circle key={i} cx={cx} cy={cy} r={r} fill="none" stroke={arc.color} strokeWidth={thickness} />;
          }
          if (arc.angle <= 0) return null;
          return (
            <path
              key={i}
              d={describeArc(arc.startAngle, arc.startAngle + arc.angle)}
              fill="none"
              stroke={arc.color}
              strokeWidth={thickness}
              strokeLinecap="round"
            />
          );
        })}
        <circle cx={cx} cy={cy} r={r - thickness / 2} fill="#0f172a" />
        <text x={cx} y={cy - 4} textAnchor="middle" fill="#f1f5f9" fontSize="22" fontWeight="700">
          {total.toLocaleString("fr-FR")}
        </text>
        <text x={cx} y={cy + 14} textAnchor="middle" fill="#64748b" fontSize="10">Total</text>
      </svg>
      <div className="flex flex-wrap gap-2 justify-center">
        {arcs.slice(0, 5).map((arc, i) => (
          <div key={i} className="flex items-center gap-1.5 text-xs">
            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: arc.color }} />
            <span className="text-gray-400">{arc.label}</span>
            <span className="text-gray-300 font-medium">{arc.percent}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Sparkline — Mini graphique linéaire pour KPI trend.
 */
export function Sparkline({ data = [], color = "#1D9E75", width = 60, height = 28 }) {
  if (!data.length) return null;
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * width},${height - ((v - min) / range) * height}`).join(" ");
  return (
    <svg width={width} height={height} className="shrink-0">
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}