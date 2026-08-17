import { ArcElement, Chart as ChartJS, Legend, Tooltip } from 'chart.js';
import 'chartjs-adapter-date-fns';
import { useContext, useEffect, useMemo, useState } from 'react';
import { Pie } from 'react-chartjs-2';
import { useOutletContext } from 'react-router';
import Select from './ThemedSelect';
import ClipLoader from './ThemedClipLoader';
import UserSettingsContext from '../contexts/UserSettingsContext';
import { useChartTheme } from '../util/chartTheme';
import { CHART_COLORS, withAlpha } from '../util/chartColors';
import computeTimes from '../util/calculateQuota.js';
import { formatDecimal } from '../util/util.jsx';
import { JobTokenLink } from './JobTokenLink.jsx';
import Table from './Table.jsx';
import { UserLink } from './UserLink.jsx';

ChartJS.register(ArcElement, Tooltip, Legend);

const PIE_OPTIONS = {
  maintainAspectRatio: false,
  plugins: {
    legend: {
      labels: {
        boxWidth: 10,
        boxHeight: 10,
        padding: 6,
        font: { size: 11 },
      },
    },
  },
};

const COLUMN_DEFS = {
  user: {
    field: 'user',
    column: 'User',
    sorter: 'alphabetical',
    displayer: (username) => (
      <UserLink user={{ username: username, deleted: false }} />
    ),
  },
  instance: {
    field: 'instance',
    column: 'Instance',
    sorter: 'alphabetical',
    displayer: String,
  },
  pool_label: {
    field: 'pool_label',
    column: 'Pool Label',
    sorter: 'alphabetical',
    displayer: (val) => val ?? '-',
  },
  fails: {
    field: 'fails',
    column: 'Number Crashes',
    sorter: 'numerical',
    displayer: Number,
  },
  jobs: {
    field: 'jobs',
    column: 'Number Jobs',
    sorter: 'numerical',
    displayer: Number,
  },
  times: {
    field: 'times',
    column: 'Solve Time',
    sorter: 'numerical',
    displayer: formatTime,
  },
  multiplier: {
    field: 'multiplier',
    column: 'Multiplier',
    sorter: 'numerical',
    displayer: formatDecimal,
  },
};

const Quotas = () => {
  const {
    data,
    startDate: calcStartDate,
    endDate: calcEndTime,
  } = useOutletContext();
  useChartTheme();
  const [userSettings] = useContext(UserSettingsContext);
  const quotaFormattingFn = userSettings.quotaFormattingFn;

  const [ungroupedDataJobs, setUngroupedDataJobs] = useState([]);
  const [ungroupedDataPools, setUngroupedDataPools] = useState([]);
  const [numUser, setNumUser] = useState([]);
  const [numInstances, setNumInstances] = useState(0);
  const [numPools, setNumPools] = useState(0);
  const [numCharts, setNumCharts] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // if data, calcStartDate, calcEndTime changes:
  useEffect(() => {
    setIsLoading(true);
    const dataTmp = computeTimes(data, calcStartDate, calcEndTime);
    setUngroupedDataJobs(dataTmp.data_jobs);
    setUngroupedDataPools(dataTmp.data_pools);
    setNumUser(dataTmp.num_users);
    setNumInstances(dataTmp.num_instances);
    setNumPools(dataTmp.num_pools);

    let numChartsTmp = 0;

    if (dataTmp.num_users > 1) numChartsTmp++;
    if (dataTmp.num_instances > 1) numChartsTmp++;
    if (dataTmp.num_pools > 1) numChartsTmp++;

    setNumCharts(numChartsTmp);
    setIsLoading(false);
  }, [data, calcStartDate, calcEndTime]);

  function getChartData(label, ungroupedData) {
    let groupedData;
    let labels = [];
    let cost = [];
    if (label === 'usernames') {
      groupedData = groupByUser(ungroupedData);
      labels = groupedData.map((elem) => elem.user);
      cost = groupedData.map((elem) => elem.cost);
    } else if (label === 'instance') {
      groupedData = groupByInstance(ungroupedData);
      labels = groupedData.map((elem) => elem.instance);
      cost = groupedData.map((elem) => elem.cost);
    } else if (label === 'pool_label') {
      groupedData = groupByPoolLabel(ungroupedData);
      labels = groupedData.map((elem) => elem.pool_label);
      cost = groupedData.map((elem) => elem.cost);
    }

    let labelTimePairs = labels.map((label, index) => ({
      label,
      cost: cost[index],
    }));

    // Sort the array of objects based on decreasing time
    labelTimePairs.sort((a, b) => b.cost - a.cost);

    const cutOff = CHART_COLORS.length;
    if (labelTimePairs.length > cutOff) {
      setTruncateWarning(
        (current) =>
          `${current} Only the ${cutOff} most used ${label} displayed in the chart. `,
      );
      labelTimePairs = labelTimePairs.slice(0, cutOff);
    }

    // Extract the sorted labels and times separately
    labels = labelTimePairs.map((pair) => pair.label);
    cost = labelTimePairs.map((pair) => pair.cost);

    return {
      labels: labels,
      datasets: [
        {
          label: '# of Votes',
          data: cost,
          backgroundColor: CHART_COLORS.map((color) => withAlpha(color, 0.85)),
        },
      ],
    };
  }

  const displayFieldJobsUngrouped = useMemo(
    () => [
      COLUMN_DEFS.user,
      {
        field: 'token,is_hypercube',
        column: 'Job token',
        displayer: (name, is_hypercube) => (
          <JobTokenLink
            name={name}
            type={is_hypercube ? 'hypercube_result' : 'standard'}
          />
        ),
      },
      COLUMN_DEFS.instance,
      COLUMN_DEFS.pool_label,
      COLUMN_DEFS.fails,
      COLUMN_DEFS.jobs,
      COLUMN_DEFS.times,
      COLUMN_DEFS.multiplier,
      {
        field: 'cost',
        column: 'Cost',
        sorter: 'numerical',
        displayer: quotaFormattingFn,
      },
    ],
    [quotaFormattingFn],
  );

  const displayFieldPoolsUngrouped = useMemo(
    () => [
      COLUMN_DEFS.user,
      COLUMN_DEFS.pool_label,
      COLUMN_DEFS.instance,
      COLUMN_DEFS.fails,
      {
        field: 'jobs',
        column: 'Number Pools',
        sorter: 'numerical',
        displayer: Number,
      },
      {
        field: 'times',
        column: 'Idle Time',
        sorter: 'numerical',
        displayer: formatTime,
      },
      COLUMN_DEFS.multiplier,
      {
        field: 'cost',
        column: 'Cost',
        sorter: 'numerical',
        displayer: quotaFormattingFn,
      },
    ],
    [quotaFormattingFn],
  );

  const [displayFieldsJobs, setDisplayFieldsJobs] = useState(
    displayFieldJobsUngrouped,
  );
  const [displayFieldsPools, setDisplayFieldsPools] = useState(
    displayFieldPoolsUngrouped,
  );

  const availableAggregateTypes = [
    { value: '_', label: '_' },
    { value: 'username', label: 'User' },
    { value: 'instance', label: 'Instance' },
    { value: 'pool_label', label: 'Pool Label' },
  ];

  const [selectedAggregateType, setSelectedAggregateType] = useState(
    availableAggregateTypes[1].value,
  );
  const [totalUsage, setTotalUsage] = useState(0);
  const [tableDataJobs, setTableDataJobs] = useState([]);
  const [tableDataPools, setTableDataPools] = useState([]);
  const [userChartData, setUserChartData] = useState({
    labels: ['-'],
    datasets: [
      {
        label: '# of Votes',
        data: [1],
        backgroundColor: [withAlpha(CHART_COLORS[0], 0.85)],
      },
    ],
  });
  const [instanceChartData, setInstanceChartData] = useState({
    labels: ['-'],
    datasets: [
      {
        label: '# of Votes',
        data: [1],
        backgroundColor: [withAlpha(CHART_COLORS[0], 0.85)],
      },
    ],
  });
  const [poolLabelChartData, setPoolLabelChartData] = useState({
    labels: ['-'],
    datasets: [
      {
        label: '# of Votes',
        data: [1],
        backgroundColor: [withAlpha(CHART_COLORS[0], 0.85)],
      },
    ],
  });

  const [truncateWarning, setTruncateWarning] = useState('');

  useEffect(() => {
    if (selectedAggregateType === '_') {
      const displayFieldsTmpJob = displayFieldJobsUngrouped.filter(
        (el) => !['jobs'].includes(el.field),
      );
      const displayFieldsTmpPool = displayFieldPoolsUngrouped.filter(
        (el) => !['jobs'].includes(el.field),
      );
      setTableDataJobs(ungroupedDataJobs);
      setTableDataPools(ungroupedDataPools);
      let sumTmp = ungroupedDataJobs.reduce(
        (accumulator, currentValue) => accumulator + currentValue.cost,
        0,
      );
      sumTmp += ungroupedDataPools.reduce(
        (accumulator, currentValue) => accumulator + currentValue.cost,
        0,
      );
      setTotalUsage(sumTmp);
      setDisplayFieldsJobs(displayFieldsTmpJob);
      setDisplayFieldsPools(displayFieldsTmpPool);
    } else if (selectedAggregateType === 'username') {
      const displayFieldsTmpJob = displayFieldJobsUngrouped.filter(
        (el) =>
          ![
            'instance',
            'pool_label',
            'multiplier',
            'token,is_hypercube',
          ].includes(el.field),
      );
      const displayFieldsTmpPool = displayFieldPoolsUngrouped.filter(
        (el) => !['instance', 'pool_label', 'multiplier'].includes(el.field),
      );
      setTableDataJobs(groupByUser(ungroupedDataJobs));
      setTableDataPools(groupByUser(ungroupedDataPools));
      let sumTmp = ungroupedDataJobs.reduce(
        (accumulator, currentValue) => accumulator + currentValue.cost,
        0,
      );
      sumTmp += ungroupedDataPools.reduce(
        (accumulator, currentValue) => accumulator + currentValue.cost,
        0,
      );
      setTotalUsage(sumTmp);
      setDisplayFieldsJobs(displayFieldsTmpJob);
      setDisplayFieldsPools(displayFieldsTmpPool);
    } else if (selectedAggregateType === 'instance') {
      const displayFieldsTmpJob = displayFieldJobsUngrouped.filter(
        (el) =>
          !['user', 'pool_label', 'multiplier', 'token,is_hypercube'].includes(
            el.field,
          ),
      );
      const displayFieldsTmpPool = displayFieldPoolsUngrouped.filter(
        (el) => !['user', 'pool_label', 'multiplier'].includes(el.field),
      );
      setTableDataJobs(groupByInstance(ungroupedDataJobs));
      setTableDataPools(groupByInstance(ungroupedDataPools));
      let sumTmp = ungroupedDataJobs.reduce(
        (accumulator, currentValue) => accumulator + currentValue.cost,
        0,
      );
      sumTmp += ungroupedDataPools.reduce(
        (accumulator, currentValue) => accumulator + currentValue.cost,
        0,
      );
      setTotalUsage(sumTmp);
      setDisplayFieldsJobs(displayFieldsTmpJob);
      setDisplayFieldsPools(displayFieldsTmpPool);
    } else if (selectedAggregateType === 'pool_label') {
      const displayFieldsTmpJob = displayFieldJobsUngrouped.filter(
        (el) =>
          !['instance', 'user', 'multiplier', 'token,is_hypercube'].includes(
            el.field,
          ),
      );
      const displayFieldsTmpPool = displayFieldPoolsUngrouped.filter(
        (el) => !['instance', 'user', 'multiplier'].includes(el.field),
      );
      setTableDataJobs(groupByPoolLabel(ungroupedDataJobs));
      setTableDataPools(groupByPoolLabel(ungroupedDataPools));
      let sumTmp2 = ungroupedDataJobs
        .filter((el) => el.pool_label != null)
        .reduce(
          (accumulator, currentValue) => accumulator + currentValue.cost,
          0,
        );
      sumTmp2 += ungroupedDataPools.reduce(
        (accumulator, currentValue) => accumulator + currentValue.cost,
        0,
      );
      setTotalUsage(sumTmp2);
      setDisplayFieldsJobs(displayFieldsTmpJob);
      setDisplayFieldsPools(displayFieldsTmpPool);
    }
  }, [
    selectedAggregateType,
    ungroupedDataJobs,
    ungroupedDataPools,
    displayFieldJobsUngrouped,
    displayFieldPoolsUngrouped,
  ]);

  useEffect(() => {
    setTruncateWarning('');
    let chartDataTmp;
    if (numUser > 1) {
      chartDataTmp = getChartData(
        'usernames',
        ungroupedDataJobs.concat(ungroupedDataPools),
      );
      setUserChartData(chartDataTmp);
    }

    if (numInstances > 1) {
      chartDataTmp = getChartData(
        'instance',
        ungroupedDataJobs.concat(ungroupedDataPools),
      );
      setInstanceChartData(chartDataTmp);
    }

    if (numPools > 1) {
      chartDataTmp = getChartData(
        'pool_label',
        ungroupedDataJobs.concat(ungroupedDataPools),
      );
      setPoolLabelChartData(chartDataTmp);
    }
  }, [ungroupedDataJobs, ungroupedDataPools, numUser, numInstances, numPools]);

  return (
    <div className="App">
      <div className="row align-items-end mb-2">
        <div className="form-group mt-2 mb-2 col-md-4 col-lg-3 col-12">
          <label htmlFor="aggregateDropdownInput">Aggregate</label>
          <Select
            id="aggregateDropdown"
            inputId="aggregateDropdownInput"
            isClearable={false}
            value={availableAggregateTypes.find(
              (type) => type.value === selectedAggregateType,
            )}
            isSearchable={true}
            onChange={(selected) => setSelectedAggregateType(selected.value)}
            options={availableAggregateTypes}
          />
        </div>
        {!isLoading && (
          <div className="col-md-8 col-lg-9 col-12 mt-2 mb-2 d-flex justify-content-md-end">
            <div className="usage-total-card">
              <h2 className="usage-total-value">
                Total: {quotaFormattingFn(totalUsage)}{' '}
              </h2>
              <p className="usage-total-hint">
                This total is an estimate. Actual cost may be higher.
              </p>
            </div>
          </div>
        )}
      </div>
      {isLoading ? (
        <ClipLoader />
      ) : (
        <>
          {truncateWarning !== '' && (
            <div className="alert alert-warning" role="alert">
              {truncateWarning}
            </div>
          )}
          <div className="row">
            {numCharts > 0 ? (
              <div
                className={
                  'col-xl-' +
                  (numCharts === 3 ? '12' : '3') +
                  ' col-lg-3 col-md-12 col-12'
                }
              >
                <div className="row">
                  {numUser > 1 ? (
                    <div
                      className={
                        'col-xl-' +
                        (numCharts === 3 ? '4' : '12') +
                        ' col-lg-12 col-md-6 col-sm-' +
                        (12 / numCharts).toString() +
                        ' col-12 mb-2'
                      }
                    >
                      <div className="chart-card">
                        <h3 className="chart-card-title">Users</h3>
                        <div className="chart-card-canvas">
                          <Pie data={userChartData} options={PIE_OPTIONS} />
                        </div>
                      </div>
                    </div>
                  ) : null}
                  {numInstances > 1 ? (
                    <div
                      className={
                        'col-xl-' +
                        (numCharts === 3 ? '4' : '12') +
                        ' col-lg-12 col-md-6 col-sm-' +
                        (12 / numCharts).toString() +
                        ' col-12 mb-2'
                      }
                    >
                      <div className="chart-card">
                        <h3 className="chart-card-title">Instances</h3>
                        <div className="chart-card-canvas">
                          <Pie data={instanceChartData} options={PIE_OPTIONS} />
                        </div>
                      </div>
                    </div>
                  ) : null}
                  {numPools > 1 ? (
                    <div
                      className={
                        'col-xl-' +
                        (numCharts === 3 ? '4' : '12') +
                        ' col-lg-12 col-md-6 col-sm-' +
                        (12 / numCharts).toString() +
                        ' col-12 mb-2'
                      }
                    >
                      <div className="chart-card">
                        <h3 className="chart-card-title">Pools *</h3>
                        <div className="chart-card-canvas">
                          <Pie
                            data={poolLabelChartData}
                            options={PIE_OPTIONS}
                          />
                        </div>
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            ) : null}
            <div
              className={
                'col-xl-' +
                (numCharts === 3 ? '12' : numCharts > 0 ? '9' : '12') +
                ' col-lg-' +
                (numCharts > 0 ? '9' : '12') +
                ' col-md-12 col-12'
              }
            >
              <h5 className="usage-section-title">Jobs</h5>
              <div data-testid="tableJobs">
                <Table
                  data={tableDataJobs}
                  noDataMsg="No Usage data found"
                  displayFields={displayFieldsJobs}
                  isLoading={false}
                  idFieldName={'unique_id'}
                />
              </div>
              <h5 className="usage-section-title mt-3">Idle Pool Times</h5>
              <div data-testid="tableIdlePool">
                <Table
                  data={tableDataPools}
                  noDataMsg="No Usage data found"
                  displayFields={displayFieldsPools}
                  isLoading={false}
                  idFieldName={'unique_id'}
                />
              </div>
            </div>
          </div>
          {numPools > 1 ? (
            <div className="text-body-secondary small">
              * includes Idle Times
            </div>
          ) : null}
        </>
      )}
    </div>
  );
};

function formatTime(milliseconds) {
  const seconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  const remainingMinutes = minutes % 60;
  const remainingSeconds = seconds % 60;

  const new_time = `${hours}:${remainingMinutes}:${remainingSeconds}`;

  return new_time;
}

function groupByUser(ungroupedData) {
  let allUsers = ungroupedData.map((elem) => elem.user);

  let setOfAllUsers = [...new Set(allUsers)];

  let groupedUserData = setOfAllUsers.map((user) => {
    let userJobs = ungroupedData.filter((elem) => elem.user === user);
    userJobs = userJobs.reduce((acc) => acc + 1, 0);

    let userFails = ungroupedData.filter((elem) => elem.user === user);
    userFails = userFails.reduce((acc, elem) => acc + elem.fails, 0);

    let userTimes = ungroupedData.filter((elem) => elem.user === user);
    userTimes = userTimes.reduce((acc, elem) => acc + elem.times, 0);

    let userCost = ungroupedData.filter((elem) => elem.user === user);
    userCost = userCost.reduce((acc, elem) => acc + elem.cost, 0);

    // Find the first matching element to get 'unique_id'
    let firstMatchingElem = ungroupedData.find((elem) => elem.user === user);

    return {
      unique_id: firstMatchingElem.unique_id,
      user: user,
      times: userTimes,
      fails: userFails,
      jobs: userJobs,
      cost: userCost,
    };
  });

  return groupedUserData;
}

function groupByInstance(ungroupedData) {
  let allInstances = ungroupedData.map((elem) => elem.instance);

  let setOfAllInstances = [...new Set(allInstances)];

  let groupedInstanceData = setOfAllInstances.map((instance) => {
    let instanceJobs = ungroupedData.filter(
      (elem) => elem.instance === instance,
    );
    instanceJobs = instanceJobs.reduce((acc) => acc + 1, 0);

    let instanceFails = ungroupedData.filter(
      (elem) => elem.instance === instance,
    );
    instanceFails = instanceFails.reduce((acc, elem) => acc + elem.fails, 0);

    let instanceTimes = ungroupedData.filter(
      (elem) => elem.instance === instance,
    );
    instanceTimes = instanceTimes.reduce((acc, elem) => acc + elem.times, 0);

    let instanceCost = ungroupedData.filter(
      (elem) => elem.instance === instance,
    );
    instanceCost = instanceCost.reduce((acc, elem) => acc + elem.cost, 0);

    // Find the first matching element to get 'unique_id'
    let firstMatchingElem = ungroupedData.find(
      (elem) => elem.instance === instance,
    );

    return {
      unique_id: firstMatchingElem.unique_id,
      instance: instance,
      times: instanceTimes,
      fails: instanceFails,
      jobs: instanceJobs,
      cost: instanceCost,
    };
  });

  return groupedInstanceData;
}

function groupByPoolLabel(ungroupedData) {
  let allPoolLabel = ungroupedData.map((elem) => elem.pool_label);
  allPoolLabel = allPoolLabel.filter((elem) => elem !== null);

  let setOfAllPoolLabels = [...new Set(allPoolLabel)];

  let groupedPoolData = setOfAllPoolLabels.map((pool_label) => {
    let poolJobs = ungroupedData.filter(
      (elem) => elem.pool_label === pool_label,
    );
    poolJobs = poolJobs.reduce((acc) => acc + 1, 0);

    let poolFails = ungroupedData.filter(
      (elem) => elem.pool_label === pool_label,
    );
    poolFails = poolFails.reduce((acc, elem) => acc + elem.fails, 0);

    let poolTimes = ungroupedData.filter(
      (elem) => elem.pool_label === pool_label,
    );
    poolTimes = poolTimes.reduce((acc, elem) => acc + elem.times, 0);

    let poolCost = ungroupedData.filter(
      (elem) => elem.pool_label === pool_label,
    );
    poolCost = poolCost.reduce((acc, elem) => acc + elem.cost, 0);

    // Find the first matching element to get 'unique_id'
    let firstMatchingElem = ungroupedData.find(
      (elem) => elem.pool_label === pool_label,
    );

    return {
      unique_id: firstMatchingElem.unique_id,
      pool_label: pool_label,
      times: poolTimes,
      fails: poolFails,
      jobs: poolJobs,
      cost: poolCost,
    };
  });

  return groupedPoolData;
}

export default Quotas;
