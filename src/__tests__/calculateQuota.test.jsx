import getComputationTimes from '../util/calculateQuota.js';

const HOUR = 60 * 60 * 1000;

const calcStart = new Date('2026-01-01T00:00:00.000000+00:00');
const calcEnd = new Date('2026-01-01T05:00:00.000000+00:00');

const makeJob = ({
  username = 'job_user',
  token = 'job_token',
  submitted = '2026-01-01T01:00:00.000000+00:00',
  finished = '2026-01-01T02:00:00.000000+00:00',
  times = [
    {
      start: '2026-01-01T01:00:00.000000+00:00',
      finish: '2026-01-01T02:00:00.000000+00:00',
    },
  ],
  instance = 'instance_1',
  multiplier = 3,
} = {}) => ({
  username,
  token,
  submitted,
  finished,
  times,
  labels: { instance, multiplier },
});

const makeHypercube = ({
  username = 'hc_user',
  token = 'hc_token',
  submitted = '2026-01-01T01:00:00.000000+00:00',
  finished = '2026-01-01T02:00:00.000000+00:00',
  jobTimes = [
    {
      start: '2026-01-01T01:00:00.000000+00:00',
      finish: '2026-01-01T02:00:00.000000+00:00',
    },
  ],
  instance = 'instance_1',
  multiplier = 3,
} = {}) => ({
  username,
  token,
  submitted,
  finished,
  labels: { instance, multiplier },
  jobs: [{ times: jobTimes }],
});

const makePool = ({
  label = 'pool_1',
  owner = 'pool_owner',
  instance = 'pool_instance',
  multiplierIdle = 1,
  createdAt = '2026-01-01T00:00:00.000000+00:00',
  deletedAt = null,
  times = [
    {
      start: '2026-01-01T00:00:00.000000+00:00',
      finish: '2026-01-01T01:00:00.000000+00:00',
      worker_id: 'worker1',
    },
  ],
} = {}) => ({
  label,
  owner: { username: owner },
  instance: { label: instance, multiplier_idle: multiplierIdle },
  created_at: createdAt,
  deleted_at: deletedAt,
  times,
});

const emptyData = () => ({
  job_usage: [],
  pool_usage: [],
  hypercube_job_usage: [],
});

describe('getComputationTimes', () => {
  describe('still-running hypercube jobs (regression for crash fix)', () => {
    it('does not throw for a still-running hypercube job with no other jobs present', () => {
      const data = {
        ...emptyData(),
        hypercube_job_usage: [
          makeHypercube({
            finished: null,
            jobTimes: [
              { start: '2026-01-01T01:00:00.000000+00:00', finish: null },
            ],
          }),
        ],
      };

      let result;
      expect(() => {
        result = getComputationTimes(data, calcStart, calcEnd);
      }).not.toThrow();

      // falls back to calcEnd since neither the last times entry nor the
      // hypercube itself has a finish time
      expect(result.data_jobs).toHaveLength(1);
      expect(result.data_jobs[0].times).toBe(4 * HOUR);
    });

    it('does not throw when a still-running hypercube job is combined with regular jobs (index-shift case)', () => {
      // dataJobUsageNEW.concat(dataHypercubeNEW) puts this hypercube entry
      // at an index beyond dataJobUsage.length; the original bug indexed
      // back into dataJobUsage using that shifted index and crashed.
      const data = {
        ...emptyData(),
        job_usage: [makeJob(), makeJob({ token: 'job_token_2' })],
        hypercube_job_usage: [
          makeHypercube({
            finished: null,
            jobTimes: [
              { start: '2026-01-01T01:00:00.000000+00:00', finish: null },
            ],
          }),
        ],
      };

      expect(() => getComputationTimes(data, calcStart, calcEnd)).not.toThrow();
    });

    it('uses the hypercube finished timestamp when only the last run attempt lacks a finish time', () => {
      const data = {
        ...emptyData(),
        hypercube_job_usage: [
          makeHypercube({
            finished: '2026-01-01T03:00:00.000000+00:00',
            jobTimes: [
              { start: '2026-01-01T01:00:00.000000+00:00', finish: null },
            ],
          }),
        ],
      };

      const result = getComputationTimes(data, calcStart, calcEnd);

      expect(result.data_jobs).toHaveLength(1);
      expect(result.data_jobs[0].times).toBe(2 * HOUR);
    });

    it('does not throw for a still-running hypercube job matched onto an active pool', () => {
      const data = {
        job_usage: [],
        hypercube_job_usage: [
          makeHypercube({
            finished: null,
            instance: 'pool_1',
            jobTimes: [
              { start: '2026-01-01T01:00:00.000000+00:00', finish: null },
            ],
          }),
        ],
        pool_usage: [
          makePool({
            deletedAt: null,
            times: [
              {
                start: '2026-01-01T00:00:00.000000+00:00',
                finish: null,
                worker_id: 'worker1',
              },
            ],
          }),
        ],
      };

      let result;
      expect(() => {
        result = getComputationTimes(data, calcStart, calcEnd);
      }).not.toThrow();

      expect(result.data_jobs[0].pool_label).toBe('pool_1');
      // pool idle time = total worker time (5h) minus the job's run time (4h)
      expect(result.data_pools[0].times).toBe(1 * HOUR);
    });
  });

  describe('regular (non-hypercube) jobs', () => {
    it('computes run time for a completed job fully inside the timeframe', () => {
      const data = {
        ...emptyData(),
        job_usage: [makeJob()],
      };

      const result = getComputationTimes(data, calcStart, calcEnd);

      expect(result.data_jobs).toHaveLength(1);
      expect(result.data_jobs[0].times).toBe(1 * HOUR);
      expect(result.data_jobs[0].cost).toBe((1 * HOUR * 3) / 1000);
      expect(result.data_jobs[0].is_hypercube).toBe(false);
    });

    it('falls back to calcEnd for a still-running job with no finished field', () => {
      const data = {
        ...emptyData(),
        job_usage: [
          makeJob({
            finished: null,
            times: [
              { start: '2026-01-01T01:00:00.000000+00:00', finish: null },
            ],
          }),
        ],
      };

      const result = getComputationTimes(data, calcStart, calcEnd);

      expect(result.data_jobs[0].times).toBe(4 * HOUR);
    });

    it('counts crashes and only uses the last run attempt for a restarted job', () => {
      const data = {
        ...emptyData(),
        job_usage: [
          makeJob({
            times: [
              {
                start: '2026-01-01T01:00:00.000000+00:00',
                finish: '2026-01-01T01:30:00.000000+00:00',
              },
              {
                start: '2026-01-01T01:30:00.000000+00:00',
                finish: '2026-01-01T02:00:00.000000+00:00',
              },
            ],
          }),
        ],
      };

      const result = getComputationTimes(data, calcStart, calcEnd);

      expect(result.data_jobs[0].fails).toBe(1);
      expect(result.data_jobs[0].times).toBe(0.5 * HOUR);
    });

    it('marks jobs canceled before running (no times entries) as included with zero time', () => {
      const data = {
        ...emptyData(),
        job_usage: [makeJob({ times: [] })],
      };

      const result = getComputationTimes(data, calcStart, calcEnd);

      expect(result.data_jobs[0].included).toBe(true);
      expect(result.data_jobs[0].times).toBe(0);
    });
  });

  describe('pools', () => {
    it('falls back to calcEnd for a still-active pool worker', () => {
      const data = {
        ...emptyData(),
        pool_usage: [
          makePool({
            deletedAt: null,
            times: [
              {
                start: '2026-01-01T00:00:00.000000+00:00',
                finish: null,
                worker_id: 'worker1',
              },
            ],
          }),
        ],
      };

      const result = getComputationTimes(data, calcStart, calcEnd);

      expect(result.data_pools).toHaveLength(1);
      expect(result.data_pools[0].times).toBe(5 * HOUR);
    });

    it('deduplicates repeated worker entries and counts crashes', () => {
      const data = {
        ...emptyData(),
        pool_usage: [
          makePool({
            times: [
              {
                start: '2026-01-01T00:00:00.000000+00:00',
                finish: null,
                worker_id: 'worker1',
              },
              {
                start: '2026-01-01T00:00:00.000000+00:00',
                finish: '2026-01-01T02:00:00.000000+00:00',
                worker_id: 'worker1',
              },
            ],
          }),
        ],
      };

      const result = getComputationTimes(data, calcStart, calcEnd);

      expect(result.data_pools[0].fails).toBe(1);
      expect(result.data_pools[0].times).toBe(2 * HOUR);
    });

    it('excludes pools with no worker activity inside the timeframe', () => {
      const data = {
        ...emptyData(),
        pool_usage: [
          makePool({
            times: [
              {
                start: '2025-01-01T00:00:00.000000+00:00',
                finish: '2025-01-01T01:00:00.000000+00:00',
                worker_id: 'worker1',
              },
            ],
          }),
        ],
      };

      const result = getComputationTimes(data, calcStart, calcEnd);

      expect(result.data_pools).toHaveLength(0);
    });

    it('subtracts a matched job from the pool idle time', () => {
      const data = {
        job_usage: [
          makeJob({
            instance: 'pool_1',
            times: [
              {
                start: '2026-01-01T01:00:00.000000+00:00',
                finish: '2026-01-01T02:00:00.000000+00:00',
              },
            ],
          }),
        ],
        hypercube_job_usage: [],
        pool_usage: [
          makePool({
            times: [
              {
                start: '2026-01-01T00:00:00.000000+00:00',
                finish: '2026-01-01T05:00:00.000000+00:00',
                worker_id: 'worker1',
              },
            ],
          }),
        ],
      };

      const result = getComputationTimes(data, calcStart, calcEnd);

      expect(result.data_jobs[0].pool_label).toBe('pool_1');
      expect(result.data_jobs[0].instance).toBe('pool_instance');
      // pool ran 5h total, minus the 1h job that ran on it
      expect(result.data_pools[0].times).toBe(4 * HOUR);
    });
  });

  describe('aggregate counts', () => {
    it('counts distinct users, instances and pool labels', () => {
      const data = {
        job_usage: [
          makeJob({ username: 'user_a', instance: 'instance_a' }),
          makeJob({
            username: 'user_b',
            token: 'job_token_2',
            instance: 'instance_b',
          }),
        ],
        hypercube_job_usage: [],
        pool_usage: [makePool({ label: 'pool_1', owner: 'user_a' })],
      };

      const result = getComputationTimes(data, calcStart, calcEnd);

      expect(result.num_users).toBe(2);
      expect(result.num_instances).toBe(3);
      expect(result.num_pools).toBe(1);
    });
  });
});
