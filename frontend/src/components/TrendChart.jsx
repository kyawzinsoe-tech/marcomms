import React, { useRef, useEffect } from 'react';
import { formatNumber } from '../utils/formatters';

export function TrendChart({ entries, reportMonth }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    const width = Math.max(300, rect.width);
    const height = 240;

    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    const [year, month] = reportMonth.split('-').map(Number);
    const daysInMonth = new Date(year, month, 0).getDate();

    // Group usage by day
    const usageByDay = {};
    entries.forEach((e) => {
      if (!e.date) return;
      const day = Number(e.date.slice(8, 10));
      usageByDay[day] = (usageByDay[day] || 0) + Number(e.tokens || 0);
    });

    const values = Array.from({ length: daysInMonth }, (_, i) => usageByDay[i + 1] || 0);
    const maxValue = Math.max(...values, 10);

    const padding = { left: 45, right: 20, top: 20, bottom: 35 };
    const plotWidth = width - padding.left - padding.right;
    const plotHeight = height - padding.top - padding.bottom;

    ctx.clearRect(0, 0, width, height);

    // Draw horizontal grid lines & Y-axis labels
    const gridSteps = 4;
    ctx.strokeStyle = '#f1f5f9';
    ctx.lineWidth = 1;
    ctx.fillStyle = '#94a3b8';
    ctx.font = '11px Inter, sans-serif';
    ctx.textAlign = 'right';

    for (let i = 0; i <= gridSteps; i++) {
      const y = padding.top + (plotHeight * i) / gridSteps;
      const labelVal = Math.round(maxValue * (1 - i / gridSteps));

      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(width - padding.right, y);
      ctx.stroke();

      ctx.fillText(formatNumber(labelVal), padding.left - 8, y + 4);
    }

    // Draw X-axis day labels (every 5 days and last day)
    ctx.textAlign = 'center';
    for (let d = 1; d <= daysInMonth; d++) {
      if (d === 1 || d % 5 === 0 || d === daysInMonth) {
        const x = padding.left + ((d - 1) / (daysInMonth - 1)) * plotWidth;
        ctx.fillText(`d${d}`, x, height - 12);
      }
    }

    // Points coordinate calculation
    const points = values.map((val, idx) => ({
      x: padding.left + (idx / (daysInMonth - 1)) * plotWidth,
      y: padding.top + plotHeight - (val / maxValue) * plotHeight,
      val
    }));

    if (points.length === 0) return;

    // Draw Area Gradient under the line
    ctx.beginPath();
    ctx.moveTo(points[0].x, padding.top + plotHeight);
    points.forEach((pt) => ctx.lineTo(pt.x, pt.y));
    ctx.lineTo(points[points.length - 1].x, padding.top + plotHeight);
    ctx.closePath();

    const areaGradient = ctx.createLinearGradient(0, padding.top, 0, padding.top + plotHeight);
    areaGradient.addColorStop(0, 'rgba(99, 102, 241, 0.25)');
    areaGradient.addColorStop(1, 'rgba(99, 102, 241, 0.0)');
    ctx.fillStyle = areaGradient;
    ctx.fill();

    // Draw Main Line
    ctx.beginPath();
    points.forEach((pt, idx) => {
      if (idx === 0) ctx.moveTo(pt.x, pt.y);
      else ctx.lineTo(pt.x, pt.y);
    });
    ctx.strokeStyle = '#6366f1';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Draw active data points
    points.forEach((pt) => {
      if (pt.val > 0) {
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 4.5, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
        ctx.strokeStyle = '#6366f1';
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    });
  }, [entries, reportMonth]);

  return (
    <div className="chart-container">
      <canvas ref={canvasRef} className="chart-canvas" />
    </div>
  );
}
