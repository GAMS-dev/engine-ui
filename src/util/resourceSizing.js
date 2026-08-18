const SIZING = {
  OVERSIZED: 'oversized',
  RIGHT_SIZED: 'right_sized',
  UNDERSIZED: 'undersized',
  UNAVAILABLE: 'unavailable',
};

// Below this fraction of the memory limit actually used at peak, the
// instance was given far more memory than the job needed.
const MEMORY_OVERSIZED_RATIO = 0.4;
// Above this fraction, the job ran close enough to its memory limit to risk
// being OOM-killed.
const MEMORY_UNDERSIZED_RATIO = 0.85;
// Above this fraction of wall time spent throttled, the kernel actually held
// the job back - the strongest signal that CPU was undersized.
const CPU_THROTTLE_UNDERSIZED_RATIO = 0.05;
// Below this average CPU utilization (and with negligible throttling), the
// instance was given far more CPU than the job used.
const CPU_OVERSIZED_UTILIZATION_RATIO = 0.3;

// Memory usage against its cgroup limit is a hard ceiling (the job gets
// OOM-killed if it's exceeded), so peak-vs-limit is a direct, trustworthy
// signal for how well the instance was sized.
function computeMemorySizing(resourceStats) {
  const peakKilobytes = resourceStats?.cgroup_peak_memory_kilobytes;
  const limitKilobytes = resourceStats?.cgroup_memory_limit_kilobytes;
  if (peakKilobytes == null || limitKilobytes == null || limitKilobytes <= 0) {
    return {
      status: SIZING.UNAVAILABLE,
      peakKilobytes,
      limitKilobytes,
      ratio: null,
    };
  }

  const ratio = peakKilobytes / limitKilobytes;
  let status;
  if (ratio < MEMORY_OVERSIZED_RATIO) {
    status = SIZING.OVERSIZED;
  } else if (ratio > MEMORY_UNDERSIZED_RATIO) {
    status = SIZING.UNDERSIZED;
  } else {
    status = SIZING.RIGHT_SIZED;
  }
  return { status, peakKilobytes, limitKilobytes, ratio };
}

// CPU is throttled rather than hard-capped, and a job can legitimately be
// bursty, so utilization alone is weak evidence (a job can average low CPU
// use just because it's I/O-bound, not over-provisioned). throttleRatio -
// the kernel reporting it actually held the job back - is what determines
// "undersized"; utilization is only used as the oversized/right-sized
// tiebreaker once throttling is ruled out.
function computeCpuSizing(resourceStats) {
  const usageSeconds = resourceStats?.cgroup_cpu_usage_seconds;
  const limitMillicores = resourceStats?.cgroup_cpu_limit_millicores;
  const throttledSeconds = resourceStats?.cgroup_throttled_seconds;
  const wallTimeSeconds = resourceStats?.wall_time_seconds;
  if (
    usageSeconds == null ||
    limitMillicores == null ||
    limitMillicores <= 0 ||
    throttledSeconds == null ||
    wallTimeSeconds == null ||
    wallTimeSeconds <= 0
  ) {
    return {
      status: SIZING.UNAVAILABLE,
      usageSeconds,
      limitMillicores,
      throttledSeconds,
      wallTimeSeconds,
      utilization: null,
      throttleRatio: null,
    };
  }

  const utilization =
    usageSeconds / ((limitMillicores / 1000) * wallTimeSeconds);
  const throttleRatio = throttledSeconds / wallTimeSeconds;
  let status;
  if (throttleRatio > CPU_THROTTLE_UNDERSIZED_RATIO) {
    status = SIZING.UNDERSIZED;
  } else if (utilization < CPU_OVERSIZED_UTILIZATION_RATIO) {
    status = SIZING.OVERSIZED;
  } else {
    status = SIZING.RIGHT_SIZED;
  }
  return {
    status,
    usageSeconds,
    limitMillicores,
    throttledSeconds,
    wallTimeSeconds,
    utilization,
    throttleRatio,
  };
}

export { SIZING, computeMemorySizing, computeCpuSizing };
