"use client";

import {
  Chart,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Filler,
  Tooltip,
  Legend,
  TimeScale,
  BarController,
  LineController,
  DoughnutController,
} from "chart.js";
import "chartjs-plugin-zoom";
import "chartjs-plugin-datalabels";
import { useEffect, useState } from "react";

let registered = false;

function registerCharts() {
  if (registered) return;
  registered = true;

  Chart.register(
    CategoryScale,
    LinearScale,
    BarElement,
    LineElement,
    PointElement,
    ArcElement,
    Filler,
    Tooltip,
    Legend,
    TimeScale,
    BarController,
    LineController,
    DoughnutController,
  );

  // Default config for all charts
  Chart.defaults.font.family = "'Inter', system-ui, sans-serif";
  Chart.defaults.color = "rgba(107, 114, 128, 1)";
  Chart.defaults.plugins.tooltip.backgroundColor = "rgba(30, 30, 30, 0.95)";
  Chart.defaults.plugins.tooltip.cornerRadius = 8;
  Chart.defaults.plugins.tooltip.padding = 10;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (Chart.defaults.plugins.tooltip.titleFont as any).weight = 600;
  Chart.defaults.plugins.tooltip.titleFont = { size: 11, weight: "600" } as any;
  Chart.defaults.plugins.tooltip.bodyFont = { size: 10 } as any;
  Chart.defaults.plugins.legend.labels.usePointStyle = true;
  Chart.defaults.plugins.legend.labels.pointStyleWidth = 12;
  Chart.defaults.plugins.legend.labels.boxWidth = 8;
  Chart.defaults.plugins.legend.labels.boxHeight = 8;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (Chart.defaults.animation as any).duration = 400;
  (Chart.defaults.animation as any).easing = "easeOutQuart";
}

export function ChartRegistry() {
  const [done, setDone] = useState(false);

  useEffect(() => {
    registerCharts();
    setDone(true);
  }, []);

  if (!done) return null;
  return null;
}
