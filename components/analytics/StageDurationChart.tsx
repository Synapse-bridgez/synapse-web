import { useMemo } from 'react';
import type { RollupResult } from '../../lib/analytics/rollup';

type StageDurationChartProps = {
  rollup: RollupResult;
};

export function StageDurationChart({ rollup }: StageDurationChartProps) {
  const stages = useMemo(() => rollup.stageDurations, [rollup]);

  if (stages.length === 0) {
    return <p className="analytics-empty">No stage data yet.</p>;
  }

  const max = Math.max(...stages.map((stage) => stage.averageDays), 1);

  return (
    <section className="analytics-chart">
      <h3>Average stage duration</h3>
      <ul className="analytics-bars">
        {stages.map((stage) => (
          <li key={stage.stage} className="analytics-bar-row">
            <span className="analytics-bar-label">{stage.stage}</span>
            <span
              className="analytics-bar"
              style={{ width: `${(stage.averageDays / max) * 100}%` }}
            />
            <span className="analytics-bar-value">{stage.averageDays.toFixed(1)}d</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
