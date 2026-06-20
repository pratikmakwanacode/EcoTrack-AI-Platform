'use client';

import React from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { EcoLog } from '@/components/DashboardTab';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface TrendChartProps {
  logs: EcoLog[];
  acHours: number;
  drivingReduction: number;
  plantBasedDays: number;
}

export default function TrendChart({ logs, acHours, drivingReduction, plantBasedDays }: TrendChartProps) {
  // Prepare chart dataset
  const projectedData = [...logs].reverse().map(log => {
    const electricitySavedKwh = Math.min(log.electricity, acHours * 1.5 * 30.5);
    const electricitySavings = electricitySavedKwh * 0.85;

    const travelSavings = (drivingReduction / 100) * log.travel * 0.2;

    let dietSavings = 0;
    if (log.diet === 'Non-Vegetarian') {
      dietSavings = plantBasedDays * ((250 - 100) / 7);
    } else if (log.diet === 'Vegetarian') {
      dietSavings = plantBasedDays * ((150 - 100) / 7);
    }

    const monthlySavings = electricitySavings + travelSavings + dietSavings;
    const annualSavings = Math.round(monthlySavings * 12);
    return Math.max(0, log.calculatedScore - annualSavings);
  });

  const chartData = {
    labels: [...logs].reverse().map(log => log.date),
    datasets: [
      {
        fill: true,
        label: 'Actual Footprint (kg CO₂/yr)',
        data: [...logs].reverse().map(log => log.calculatedScore),
        borderColor: '#10b981', // Mint/Emerald
        backgroundColor: 'rgba(16, 185, 129, 0.05)',
        tension: 0.3,
        pointBackgroundColor: '#059669',
        pointBorderColor: '#ffffff',
        pointHoverRadius: 6,
        borderWidth: 2
      },
      {
        fill: false,
        label: 'Projected Footprint (kg CO₂/yr)',
        data: projectedData,
        borderColor: '#3b82f6', // Blue
        backgroundColor: 'transparent',
        borderDash: [6, 4],
        tension: 0.3,
        pointBackgroundColor: '#2563eb',
        pointBorderColor: '#ffffff',
        pointHoverRadius: 6,
        borderWidth: 2
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'top' as const,
        labels: {
          color: '#cbd5e1',
          font: {
            size: 11,
            weight: 'bold' as const
          },
          boxWidth: 12,
          usePointStyle: true,
          pointStyle: 'circle'
        }
      },
      tooltip: {
        padding: 10,
        backgroundColor: '#0f172a',
        titleColor: '#ffffff',
        bodyColor: '#e2e8f0',
        usePointStyle: true,
      }
    },
    scales: {
      y: {
        grid: {
          color: 'rgba(255, 255, 255, 0.08)',
        },
        ticks: {
          color: '#94a3b8',
          font: { size: 10 }
        }
      },
      x: {
        grid: {
          display: false,
        },
        ticks: {
          color: '#94a3b8',
          font: { size: 10 }
        }
      }
    }
  };

  return (
    <div className="h-64 w-full relative">
      <Line data={chartData} options={chartOptions} />
    </div>
  );
}
