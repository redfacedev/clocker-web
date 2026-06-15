import { memo, useMemo } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { Project } from '../types';
import { LocalStorage } from '../utils/LocalStorage';
import { getDurationSeconds, isActive, formatDuration } from '../utils/TimeUtils';
import './ProjectTimeBarChart.css';

interface Props {
  projects: Project[];
  logSyncVersion: number;
}

interface ChartEntry {
  name: string;
  seconds: number;
  value: number;
}

interface TooltipPayload {
  active?: boolean;
  payload?: { payload: ChartEntry }[];
}

function getScale(maxSeconds: number): {
  label: string;
  convert: (s: number) => number;
  format: (v: number) => string;
} {
  if (maxSeconds < 60) return {
    label: 'Seconds',
    convert: (s) => Math.round(s),
    format: (v) => `${Math.round(v)}s`,
  };
  if (maxSeconds < 3600) return {
    label: 'Minutes',
    convert: (s) => Math.round((s / 60) * 10) / 10,
    format: (v) => `${Math.round(v * 10) / 10}m`,
  };
  return {
    label: 'Hours',
    convert: (s) => Math.round((s / 3600) * 10) / 10,
    format: (v) => `${Math.round(v * 10) / 10}h`,
  };
}

function CustomTooltip({ active, payload }: TooltipPayload) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="project-bar-tooltip">
      <div className="project-bar-tooltip-name">{d.name}</div>
      <div className="project-bar-tooltip-time">
        {d.seconds > 0 ? formatDuration(d.seconds) : 'No time logged'}
      </div>
    </div>
  );
}

const ProjectTimeBarChart = memo(function ProjectTimeBarChart({ projects, logSyncVersion }: Props) {
  const data = useMemo(() => {
    return projects
      .map(project => {
        const logs = LocalStorage.loadLogs(project.id);
        const seconds = logs.reduce((sum, log) => {
          if (isActive(log)) return sum + Math.floor((new Date().getTime() - log.startTime.getTime()) / 1000);
          return sum + getDurationSeconds(log.startTime, log.endTime);
        }, 0);
        return { name: project.name, seconds };
      })
      .sort((a, b) => b.seconds - a.seconds);
  }, [projects, logSyncVersion]);

  const maxSeconds = useMemo(() => Math.max(...data.map(d => d.seconds), 0), [data]);
  const scale = useMemo(() => getScale(maxSeconds), [maxSeconds]);

  const chartData = useMemo(
    () => data.map(d => ({ ...d, value: scale.convert(d.seconds) })),
    [data, scale]
  );

  const yMax = maxSeconds > 0 ? Math.ceil(scale.convert(maxSeconds) * 1.2) : 1;

  if (projects.length === 0) {
    return (
      <div className="project-bar-chart project-bar-chart-empty">
        <p>No projects yet</p>
      </div>
    );
  }

  return (
    <div className="project-bar-chart">
      <ResponsiveContainer width="100%" height={360}>
        <BarChart data={chartData} margin={{ top: 8, right: 16, bottom: 24, left: 16 }}>
          <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="name"
            tick={{ fill: 'var(--text-light)', fontSize: 12 }}
            tickLine={false}
            axisLine={{ stroke: 'var(--border)' }}
            interval={0}
            tickFormatter={(name: string) => name.length > 11 ? name.slice(0, 10) + '…' : name}
            label={{ value: 'Project', position: 'insideBottom', offset: -12, fill: 'var(--text-light)', fontSize: 13 }}
          />
          <YAxis
            tick={{ fill: 'var(--text-light)', fontSize: 12 }}
            tickLine={false}
            axisLine={false}
            tickFormatter={scale.format}
            domain={[0, yMax]}
            tickCount={5}
            allowDecimals={false}
            label={{ value: scale.label, angle: -90, position: 'insideLeft', dx: -12, fill: 'var(--text-light)', fontSize: 13 }}
            width={56}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--bg-light)', opacity: 0.5 }} isAnimationActive={false} />
          <Bar
            dataKey="value"
            fill="var(--primary)"
            radius={[4, 4, 0, 0]}
            isAnimationActive={false}
            maxBarSize={64}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
});

export default ProjectTimeBarChart;
