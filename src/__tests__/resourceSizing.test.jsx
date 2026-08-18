import {
  SIZING,
  computeCpuSizing,
  computeMemorySizing,
} from '../util/resourceSizing';

describe('computeMemorySizing', () => {
  it('reports unavailable when peak usage is missing', () => {
    const result = computeMemorySizing({
      cgroup_peak_memory_kilobytes: null,
      cgroup_memory_limit_kilobytes: 1024,
    });
    expect(result.status).toBe(SIZING.UNAVAILABLE);
  });

  it('reports unavailable when the limit is missing', () => {
    const result = computeMemorySizing({
      cgroup_peak_memory_kilobytes: 512,
      cgroup_memory_limit_kilobytes: null,
    });
    expect(result.status).toBe(SIZING.UNAVAILABLE);
  });

  it('reports unavailable for an entirely null resourceStats object', () => {
    const result = computeMemorySizing(null);
    expect(result.status).toBe(SIZING.UNAVAILABLE);
  });

  it('reports oversized when peak usage is well below the limit', () => {
    const result = computeMemorySizing({
      cgroup_peak_memory_kilobytes: 300,
      cgroup_memory_limit_kilobytes: 1000,
    });
    expect(result.status).toBe(SIZING.OVERSIZED);
    expect(result.ratio).toBeCloseTo(0.3);
  });

  it('reports right-sized at the lower boundary', () => {
    const result = computeMemorySizing({
      cgroup_peak_memory_kilobytes: 400,
      cgroup_memory_limit_kilobytes: 1000,
    });
    expect(result.status).toBe(SIZING.RIGHT_SIZED);
  });

  it('reports right-sized at the upper boundary', () => {
    const result = computeMemorySizing({
      cgroup_peak_memory_kilobytes: 850,
      cgroup_memory_limit_kilobytes: 1000,
    });
    expect(result.status).toBe(SIZING.RIGHT_SIZED);
  });

  it('reports undersized when peak usage is close to the limit', () => {
    const result = computeMemorySizing({
      cgroup_peak_memory_kilobytes: 950,
      cgroup_memory_limit_kilobytes: 1000,
    });
    expect(result.status).toBe(SIZING.UNDERSIZED);
    expect(result.ratio).toBeCloseTo(0.95);
  });
});

describe('computeCpuSizing', () => {
  const base = {
    cgroup_cpu_usage_seconds: 10,
    cgroup_cpu_limit_millicores: 1000,
    cgroup_throttled_seconds: 0,
    wall_time_seconds: 100,
  };

  it('reports unavailable when the CPU limit is missing', () => {
    const result = computeCpuSizing({
      ...base,
      cgroup_cpu_limit_millicores: null,
    });
    expect(result.status).toBe(SIZING.UNAVAILABLE);
  });

  it('reports unavailable when wall time is missing', () => {
    const result = computeCpuSizing({ ...base, wall_time_seconds: null });
    expect(result.status).toBe(SIZING.UNAVAILABLE);
  });

  it('reports unavailable for an entirely null resourceStats object', () => {
    const result = computeCpuSizing(null);
    expect(result.status).toBe(SIZING.UNAVAILABLE);
  });

  it('reports undersized when throttling exceeds the threshold, even with low utilization', () => {
    const result = computeCpuSizing({
      ...base,
      cgroup_throttled_seconds: 10,
    });
    expect(result.throttleRatio).toBeCloseTo(0.1);
    expect(result.status).toBe(SIZING.UNDERSIZED);
  });

  it('reports oversized when throttling is negligible and utilization is low', () => {
    const result = computeCpuSizing(base);
    expect(result.utilization).toBeCloseTo(0.1);
    expect(result.status).toBe(SIZING.OVERSIZED);
  });

  it('reports right-sized when throttling is negligible and utilization is high', () => {
    const result = computeCpuSizing({
      ...base,
      cgroup_cpu_usage_seconds: 80,
    });
    expect(result.utilization).toBeCloseTo(0.8);
    expect(result.status).toBe(SIZING.RIGHT_SIZED);
  });
});
