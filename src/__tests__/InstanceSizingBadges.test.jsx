import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import InstanceSizingBadges from '../components/InstanceSizingBadges';

describe('InstanceSizingBadges', () => {
  it('shows well-sized badges when usage fits comfortably within limits', () => {
    render(
      <InstanceSizingBadges
        resourceStats={{
          cgroup_peak_memory_kilobytes: 600,
          cgroup_memory_limit_kilobytes: 1000,
          cgroup_cpu_usage_seconds: 80,
          cgroup_cpu_limit_millicores: 1000,
          cgroup_throttled_seconds: 0,
          wall_time_seconds: 100,
        }}
      />,
    );
    expect(screen.getByText('Memory: Well-sized')).toBeInTheDocument();
    expect(screen.getByText('CPU: Well-sized')).toBeInTheDocument();
  });

  it('flags undersized memory and CPU with a warning badge', () => {
    render(
      <InstanceSizingBadges
        resourceStats={{
          cgroup_peak_memory_kilobytes: 950,
          cgroup_memory_limit_kilobytes: 1000,
          cgroup_cpu_usage_seconds: 10,
          cgroup_cpu_limit_millicores: 1000,
          cgroup_throttled_seconds: 10,
          wall_time_seconds: 100,
        }}
      />,
    );
    expect(screen.getByText('Memory: Undersized')).toBeInTheDocument();
    expect(screen.getByText('CPU: Undersized')).toBeInTheDocument();
  });

  it('flags oversized memory and CPU when usage is far below the limit', () => {
    render(
      <InstanceSizingBadges
        resourceStats={{
          cgroup_peak_memory_kilobytes: 100,
          cgroup_memory_limit_kilobytes: 1000,
          cgroup_cpu_usage_seconds: 5,
          cgroup_cpu_limit_millicores: 1000,
          cgroup_throttled_seconds: 0,
          wall_time_seconds: 100,
        }}
      />,
    );
    expect(screen.getByText('Memory: Oversized')).toBeInTheDocument();
    expect(screen.getByText('CPU: Oversized')).toBeInTheDocument();
  });

  it('shows "Not available" when individual resource stats are None', () => {
    render(
      <InstanceSizingBadges
        resourceStats={{
          cgroup_peak_memory_kilobytes: null,
          cgroup_memory_limit_kilobytes: null,
          cgroup_cpu_usage_seconds: null,
          cgroup_cpu_limit_millicores: null,
          cgroup_throttled_seconds: null,
          wall_time_seconds: null,
        }}
      />,
    );
    expect(screen.getByText('Memory: Not available')).toBeInTheDocument();
    expect(screen.getByText('CPU: Not available')).toBeInTheDocument();
  });

  it('keeps one decimal for non-whole memory sizes, matching the percentage', async () => {
    const user = userEvent.setup();
    render(
      <InstanceSizingBadges
        resourceStats={{
          cgroup_peak_memory_kilobytes: 1.5 * 1024 * 1024,
          cgroup_memory_limit_kilobytes: 2 * 1024 * 1024,
          cgroup_cpu_usage_seconds: 80,
          cgroup_cpu_limit_millicores: 1000,
          cgroup_throttled_seconds: 0,
          wall_time_seconds: 100,
        }}
      />,
    );
    await user.hover(screen.getByText(/^Memory:/));
    expect(await screen.findByRole('tooltip')).toHaveTextContent(
      'Peak usage: 1.5GiB of 2.0GiB available (75%).',
    );
  });
});
