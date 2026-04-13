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
  BarController,
  LineController,
  DoughnutController,
} from "chart.js";

let registered = false;

export function registerCharts() {
  // Always register — HMR/reloads can reset Chart.js state while `registered` stays true
  if (!registered) {
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
      BarController,
      LineController,
      DoughnutController,
    );
    registered = true;
  }

  Chart.defaults.font.family = "'Inter', system-ui, sans-serif";
  Chart.defaults.color = "rgba(107, 114, 128, 1)";
  Chart.defaults.plugins.tooltip.backgroundColor = "rgba(30, 30, 30, 0.95)";
  Chart.defaults.plugins.tooltip.cornerRadius = 8;
  Chart.defaults.plugins.tooltip.padding = 10;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (Chart.defaults.plugins.tooltip.titleFont as any) = { size: 11, weight: "600" };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (Chart.defaults.plugins.tooltip.bodyFont as any) = { size: 10 };
  Chart.defaults.plugins.legend.labels.usePointStyle = true;
  Chart.defaults.plugins.legend.labels.pointStyleWidth = 12;
  Chart.defaults.plugins.legend.labels.boxWidth = 8;
  Chart.defaults.plugins.legend.labels.boxHeight = 8;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (Chart.defaults.animation as any) = { duration: 400, easing: "easeOutQuart" };
}
