import {
  SIZING,
  computeCpuSizing,
  computeMemorySizing,
} from '../util/resourceSizing';
import { formatDecimal, formatDurationString } from '../util/util';

const BADGE_VARIANT = {
  [SIZING.OVERSIZED]: 'info',
  [SIZING.RIGHT_SIZED]: 'success',
  [SIZING.UNDERSIZED]: 'danger',
  [SIZING.UNAVAILABLE]: 'secondary',
};

const BADGE_LABEL = {
  [SIZING.OVERSIZED]: 'Oversized',
  [SIZING.RIGHT_SIZED]: 'Well-sized',
  [SIZING.UNDERSIZED]: 'Undersized',
  [SIZING.UNAVAILABLE]: 'Not available',
};

function formatKilobytes(kilobytes) {
  if (kilobytes == null) {
    return 'unknown';
  }
  if (kilobytes < 1024) {
    return `${formatDecimal(kilobytes)} KB`;
  }
  if (kilobytes < 1024 * 1024) {
    return `${formatDecimal(Math.round(kilobytes / 1024))} MB`;
  }
  return `${formatDecimal(Math.round(kilobytes / (1024 * 1024)))} GB`;
}

function formatPercent(ratio) {
  if (ratio == null) {
    return 'unknown';
  }
  return `${formatDecimal(Math.round(ratio * 1000) / 10)}%`;
}

function getMemoryTooltip(memorySizing) {
  if (memorySizing.status === SIZING.UNAVAILABLE) {
    return 'Not enough data was recorded to judge memory sizing for this job.';
  }
  const usage = `Peak usage: ${formatKilobytes(memorySizing.peakKilobytes)} of ${formatKilobytes(memorySizing.limitKilobytes)} available (${formatPercent(memorySizing.ratio)}).`;
  const advice = {
    [SIZING.OVERSIZED]:
      'This job used much less memory than it was given - a smaller instance would likely be enough.',
    [SIZING.UNDERSIZED]:
      'This job came close to its memory limit and risks being killed for running out of memory. Consider a larger instance.',
    [SIZING.RIGHT_SIZED]: 'Memory usage was well matched to the instance.',
  }[memorySizing.status];
  return `${usage} ${advice}`;
}

function getCpuTooltip(cpuSizing) {
  if (cpuSizing.status === SIZING.UNAVAILABLE) {
    return 'Not enough data was recorded to judge CPU sizing for this job.';
  }
  const usage = `CPU time used: ${formatDecimal(Math.round(cpuSizing.usageSeconds))}s over ${formatDurationString(cpuSizing.wallTimeSeconds)} of wall time (${formatPercent(cpuSizing.utilization)} of the ${formatDecimal(cpuSizing.limitMillicores / 1000)} vCPU limit). Throttled for ${formatDecimal(Math.round(cpuSizing.throttledSeconds))}s (${formatPercent(cpuSizing.throttleRatio)} of wall time).`;
  const advice = {
    [SIZING.OVERSIZED]:
      'This job used much less CPU than it was given - a smaller instance would likely be enough.',
    [SIZING.UNDERSIZED]:
      'The job was held back by CPU throttling. Consider a larger instance.',
    [SIZING.RIGHT_SIZED]: 'CPU usage was well matched to the instance.',
  }[cpuSizing.status];
  return `${usage} ${advice}`;
}

const InstanceSizingBadges = ({ resourceStats }) => {
  const memorySizing = computeMemorySizing(resourceStats);
  const cpuSizing = computeCpuSizing(resourceStats);

  return (
    <div className="d-flex flex-wrap gap-1">
      <span
        className={`badge bg-${BADGE_VARIANT[memorySizing.status]}`}
        title={getMemoryTooltip(memorySizing)}
      >
        {`Memory: ${BADGE_LABEL[memorySizing.status]}`}
      </span>
      <span
        className={`badge bg-${BADGE_VARIANT[cpuSizing.status]}`}
        title={getCpuTooltip(cpuSizing)}
      >
        {`CPU: ${BADGE_LABEL[cpuSizing.status]}`}
      </span>
    </div>
  );
};

export default InstanceSizingBadges;
