import { memo, useMemo } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { Project } from '../types';
import { getDailyActivity, DailyActivity } from '../utils/UserStats';
import { formatDuration } from '../utils/TimeUtils';
import './ActivityCalendar.css';

interface Props {
  projects: Project[];
}

interface TooltipPayload {
  active?: boolean;
  payload?: { payload: DailyActivity }[];
}

function CustomTooltip({ active, payload }: TooltipPayload) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="activity-tooltip">
      <div className="activity-tooltip-date">{d.label}</div>
      <div className="activity-tooltip-time">
        {d.seconds > 0 ? formatDuration(d.seconds) : 'No activity'}
      </div>
    </div>
  );
}

function getScale(maxSeconds: number): {
  label: string;
  convert: (s: number) => number;
  format: (v: number) => string;
} {
  if (maxSeconds < 60) return {
    label: 'Seconds',
    convert: (s) => s,
    format: (v) => `${Math.round(v)}s`,
  };
  if (maxSeconds < 3600) return {
    label: 'Minutes',
    convert: (s) => Math.round((s / 60) * 10) / 10,
    format: (v) => `${v}m`,
  };
  return {
    label: 'Hours',
    convert: (s) => Math.round((s / 3600) * 100) / 100,
    format: (v) => `${v}h`,
  };
}

const ActivityCalendar = memo(function ActivityCalendar({ projects }: Props) {
  const rawData = useMemo(() => getDailyActivity(projects, 84), [projects]);
  const maxSeconds = useMemo(() => Math.max(...rawData.map(d => d.seconds), 0), [rawData]);
  const scale = useMemo(() => getScale(maxSeconds), [maxSeconds]);
  const data = useMemo(
    () => rawData.map(d => ({ ...d, value: scale.convert(d.seconds) })),
    [rawData, scale]
  );

  const weekStartIndices = useMemo(() => {
    const indices = new Set<number>();
    let firstSundayIndex = -1;
    for (let i = 0; i < data.length; i++) {
      if (new Date(data[i].date).getDay() === 0) {
        if (firstSundayIndex === -1) firstSundayIndex = i;
        indices.add(i);
      }
    }
    // Only show the first-point label when the first Sunday is far enough away to avoid overlap
    if (firstSundayIndex < 0 || firstSundayIndex > 4) indices.add(0);
    return indices;
  }, [data]);

  return (
    <div className="activity-calendar">
      <ResponsiveContainer width="100%" height={360}>
        <LineChart data={data} margin={{ top: 8, right: 16, bottom: 24, left: 16 }}>
          <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fill: 'var(--text-light)', fontSize: 12 }}
            tickLine={false}
            axisLine={{ stroke: 'var(--border)' }}
            interval={0}
            tickFormatter={(_, index) => weekStartIndices.has(index) ? data[index]?.label ?? '' : ''}
            label={{ value: 'Date', position: 'insideBottom', offset: -12, fill: 'var(--text-light)', fontSize: 13 }}
          />
          <YAxis
            tick={{ fill: 'var(--text-light)', fontSize: 12 }}
            tickLine={false}
            axisLine={false}
            tickFormatter={scale.format}
            label={{ value: scale.label, angle: -90, position: 'insideLeft', dx: -12, fill: 'var(--text-light)', fontSize: 13 }}
            width={56}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'var(--border)' }} isAnimationActive={false} />
          <Line
            type="monotone"
            dataKey="value"
            isAnimationActive={false}
            stroke="var(--primary)"
            strokeWidth={1.5}
            dot={false}
            activeDot={{ r: 4, fill: 'var(--primary)', strokeWidth: 0 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
});

export default ActivityCalendar;
