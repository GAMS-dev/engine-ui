import { useEffect, useRef, useState, useContext } from 'react';
import { Chart as ChartJS, ArcElement, Legend, Tooltip } from 'chart.js';
import { Pie } from 'react-chartjs-2';
import 'chartjs-adapter-date-fns';
import computeTimes from './calculateQuota.js'
import Table from './Table.jsx'
import Select from 'react-select';
import { Link } from "react-router-dom";
import { UserSettingsContext } from "./UserSettingsContext";
import { ClipLoader } from 'react-spinners';
import { UserLink } from './UserLink.jsx';

ChartJS.register(ArcElement, Tooltip, Legend);

const Quotas = ({ data, calcStartDate, calcEndTime, dataIsLoading }) => {

  const [userSettings,] = useContext(UserSettingsContext)
  const quotaConversionFactor = userSettings.quotaConversionFactor
  const quotaUnit = userSettings.quotaUnit

  const [ungroupedDataJobs, setUngroupedDataJobs] = useState([]);
  const [ungroupedDataPools, setUngroupedDataPools] = useState([]);
  const [numUser, setNumUser] = useState([]);
  const [numInstances, setNumInstances] = useState(0);
  const [numPools, setNumPools] = useState(0);
  const [numCharts, setNumCharts] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // if data, calcStartDate, calcEndTime, quotaConversionFactor changes:
  useEffect(() => {
    if (dataIsLoading) {
      return;
    }
    setIsLoading(true)
    const dataTmp = computeTimes(data, calcStartDate, calcEndTime, quotaConversionFactor)
    setUngroupedDataJobs(dataTmp.data_jobs)
    setUngroupedDataPools(dataTmp.data_pools)
    setNumUser(dataTmp.num_users)
    setNumInstances(dataTmp.num_instances)
    setNumPools(dataTmp.num_pools)

    let numChartsTmp = 0;
    numChartsTmp = (dataTmp.num_users > 1) ? numChartsTmp += 1 : numChartsTmp;
    numChartsTmp = (dataTmp.num_instances > 1) ? numChartsTmp += 1 : numChartsTmp;
    numChartsTmp = (dataTmp.num_pools > 1) ? numChartsTmp += 1 : numChartsTmp;

    setNumCharts(numChartsTmp)
    setIsLoading(false)
  }, [data, calcStartDate, calcEndTime, quotaConversionFactor, dataIsLoading])


  function getChartData(label, ungroupedData) {
    let groupedData = []
    let labels = []
    let cost = []
    if (label === 'usernames') {
      groupedData = groupByUser(ungroupedData);
      labels = groupedData.map(elem => elem.user);
      cost = groupedData.map(elem => elem.cost);
    } else if (label === 'instance') {
      groupedData = groupByInstance(ungroupedData);
      labels = groupedData.map(elem => elem.instance);
      cost = groupedData.map(elem => elem.cost);
    } else if (label === 'pool_label') {
      groupedData = groupByPoolLabel(ungroupedData);
      labels = groupedData.map(elem => elem.pool_label);
      cost = groupedData.map(elem => elem.cost);
    }

    let labelTimePairs = labels.map((label, index) => ({ label, cost: cost[index] }));

    // Sort the array of objects based on decreasing time
    labelTimePairs.sort((a, b) => b.cost - a.cost);

    const cutOff = 10;
    if (labelTimePairs.length > cutOff) {
      setTruncateWarning(current => `${current} Only the ${cutOff} most used ${label} displayed in the chart. `)
      labelTimePairs = labelTimePairs.slice(0, cutOff);
    }

    // Extract the sorted labels and times separately
    labels = labelTimePairs.map(pair => pair.label);
    cost = labelTimePairs.map(pair => pair.cost);

    return {
      labels: labels,
      datasets: [
        {
          label: '# of Votes',
          data: cost,
          backgroundColor: ["rgba(31,120,180,0.2)", "rgba(51,160,44,0.2)",
            "rgba(227,26,28,0.2)", "rgba(255,127,0,0.2)",
            "rgba(106,61,154,0.2)", "rgba(177,89,40,0.2)",
            "rgba(249,185,183,0.2)", "rgba(173,169,183,0.2)",
            "rgba(102,16,31,0.2)", "rgba(196,90,179,0.2)",
            "rgba(27,231,255,0.2)", "rgba(76,159,112,0.2)",
            "rgba(240,247,87,0.2)", "rgba(158,109,66,0.2)",
            "rgba(8,103,136,0.2)", "rgba(224,202,60,0.2)",
            "rgba(186,151,144,0.2)", "rgba(235,69,17,0.2)",
            "rgba(155,93,229,0.2)", "rgba(71,250,26,0.2)"],
        },
      ],
    }
  }

  const displayFieldJobsUngrouped = useRef([
    {
      field: "user",
      column: "User",
      sorter: "alphabetical",
      displayer: (user) =>
        <UserLink user={user} />
    },
    {
      field: "token,is_hypercube",
      column: "Job token",
      displayer: (name, job_count) => <>
        {job_count === true ? <Link to={`/jobs/hc:${name}`}>{name}
          <sup>
            <span className="badge badge-pill badge-primary ml-1">HC</span>
          </sup></Link> :
          <Link to={`/jobs/${name}`}>{name}</Link>}
      </>
    },
    {
      field: "instance",
      column: "Instance",
      sorter: "alphabetical",
      displayer: String
    },
    {
      field: "pool_label",
      column: "Pool Label",
      sorter: "alphabetical",
      displayer: (pool_label) => pool_label == null ? '-' : pool_label
    },
    {
      field: "fails",
      column: "Number Crashes",
      sorter: "numerical",
      displayer: Number
    },
    {
      field: "jobs",
      column: "Number Jobs",
      sorter: "numerical",
      displayer: Number
    },
    {
      field: "times",
      column: "Solve Time",
      sorter: "numerical",
      displayer: formatTime
    },
    {
      field: "multiplier",
      column: "Multiplier",
      sorter: "numerical",
      displayer: (mult) => Intl.NumberFormat('en-US', { style: 'decimal' }).format(mult)
    },
    {
      field: "cost",
      column: quotaUnit,
      sorter: "numerical",
      displayer: (cost) => Intl.NumberFormat('en-US', { style: 'decimal' }).format(cost)
    }
  ])

  const displayFieldPoolsUngrouped = useRef([
    {
      field: "user",
      column: "User",
      sorter: "alphabetical",
      displayer: (user) =>
        <UserLink user={user} />
    },
    {
      field: "pool_label",
      column: "Pool Label",
      sorter: "alphabetical",
      displayer: (pool_label) => pool_label == null ? '-' : pool_label
    },
    {
      field: "instance",
      column: "Instance",
      sorter: "alphabetical",
      displayer: String
    },
    {
      field: "fails",
      column: "Number Crashes",
      sorter: "numerical",
      displayer: Number
    },
    {
      field: "jobs",
      column: "Number Pools",
      sorter: "alphabetical",
      displayer: String
    },
    {
      field: "times",
      column: "Solve Time",
      sorter: "numerical",
      displayer: formatTime
    },
    {
      field: "multiplier",
      column: "Multiplier",
      sorter: "numerical",
      displayer: (mult) => Intl.NumberFormat('en-US', { style: 'decimal' }).format(mult)
    },
    {
      field: "cost",
      column: quotaUnit,
      sorter: "numerical",
      displayer: (cost) => Intl.NumberFormat('en-US', { style: 'decimal' }).format(cost)
    }
  ])


  const [displayFieldsJobs, setDisplayFieldsJobs] = useState(displayFieldJobsUngrouped.current);
  const [displayFieldsPools, setDisplayFieldsPools] = useState(displayFieldPoolsUngrouped.current);

  const availableAggregateTypes = [{ value: '_', label: '_' }, { value: "username", label: 'User' }, { value: "instance", label: 'Instance' }, { value: "pool_label", label: 'Pool Label' }]

  const [selectedAggregateType, setSelectedAggregateType] = useState(availableAggregateTypes[1].value)
  const [totalUsage, setTotalUsage] = useState(0);
  const [tableDataJobs, setTableDataJobs] = useState([])
  const [tableDataPools, setTableDataPools] = useState([])
  const [userChartData, setUserChartData] = useState({ labels: ['-'], datasets: [{ label: '# of Votes', data: [1], backgroundColor: ["rgba(31,120,180,0.2)"] }] })
  const [instanceChartData, setInstanceChartData] = useState({ labels: ['-'], datasets: [{ label: '# of Votes', data: [1], backgroundColor: ["rgba(31,120,180,0.2)"] }] })
  const [poolLabelChartData, setPoolLabelChartData] = useState({ labels: ['-'], datasets: [{ label: '# of Votes', data: [1], backgroundColor: ["rgba(31,120,180,0.2)"] }] })

  const [truncateWarning, setTruncateWarning] = useState("")

  useEffect(() => {
    if (selectedAggregateType === '_') {
      const displayFieldsTmpJob = displayFieldJobsUngrouped.current.filter(el => !['jobs'].includes(el.field))
      const displayFieldsTmpPool = displayFieldPoolsUngrouped.current.filter(el => !['jobs'].includes(el.field))
      setTableDataJobs(ungroupedDataJobs)
      setTableDataPools(ungroupedDataPools)
      let sumTmp = ungroupedDataJobs.reduce((accumulator, currentValue) => accumulator + currentValue.cost, 0)
      sumTmp += ungroupedDataPools.reduce((accumulator, currentValue) => accumulator + currentValue.cost, 0)
      setTotalUsage(sumTmp)
      setDisplayFieldsJobs(displayFieldsTmpJob)
      setDisplayFieldsPools(displayFieldsTmpPool)
    } else if (selectedAggregateType === 'username') {
      const displayFieldsTmpJob = displayFieldJobsUngrouped.current.filter(el => !['instance', 'pool_label', 'multiplier', 'token,is_hypercube'].includes(el.field))
      const displayFieldsTmpPool = displayFieldPoolsUngrouped.current.filter(el => !['instance', 'pool_label', 'multiplier'].includes(el.field))
      setTableDataJobs(groupByUser(ungroupedDataJobs))
      setTableDataPools(groupByUser(ungroupedDataPools))
      let sumTmp = ungroupedDataJobs.reduce((accumulator, currentValue) => accumulator + currentValue.cost, 0)
      sumTmp += ungroupedDataPools.reduce((accumulator, currentValue) => accumulator + currentValue.cost, 0)
      setTotalUsage(sumTmp)
      setDisplayFieldsJobs(displayFieldsTmpJob)
      setDisplayFieldsPools(displayFieldsTmpPool)
    } else if (selectedAggregateType === 'instance') {
      const displayFieldsTmpJob = displayFieldJobsUngrouped.current.filter(el => !['user', 'pool_label', 'multiplier', 'token,is_hypercube'].includes(el.field))
      const displayFieldsTmpPool = displayFieldPoolsUngrouped.current.filter(el => !['user', 'pool_label', 'multiplier'].includes(el.field))
      setTableDataJobs(groupByInstance(ungroupedDataJobs))
      setTableDataPools(groupByInstance(ungroupedDataPools))
      let sumTmp = ungroupedDataJobs.reduce((accumulator, currentValue) => accumulator + currentValue.cost, 0)
      sumTmp += ungroupedDataPools.reduce((accumulator, currentValue) => accumulator + currentValue.cost, 0)
      setTotalUsage(sumTmp)
      setDisplayFieldsJobs(displayFieldsTmpJob)
      setDisplayFieldsPools(displayFieldsTmpPool)
    } else if (selectedAggregateType === 'pool_label') {
      const displayFieldsTmpJob = displayFieldJobsUngrouped.current.filter(el => !['instance', 'user', 'multiplier', 'token,is_hypercube'].includes(el.field))
      const displayFieldsTmpPool = displayFieldPoolsUngrouped.current.filter(el => !['instance', 'user', 'multiplier'].includes(el.field))
      setTableDataJobs(groupByPoolLabel(ungroupedDataJobs))
      setTableDataPools(groupByPoolLabel(ungroupedDataPools))
      let sumTmp2 = ungroupedDataJobs.filter(el => el.pool_label != null).reduce((accumulator, currentValue) => accumulator + currentValue.cost, 0)
      sumTmp2 += ungroupedDataPools.reduce((accumulator, currentValue) => accumulator + currentValue.cost, 0)
      setTotalUsage(sumTmp2)
      setDisplayFieldsJobs(displayFieldsTmpJob)
      setDisplayFieldsPools(displayFieldsTmpPool)
    }

  }, [quotaUnit, selectedAggregateType, ungroupedDataJobs, ungroupedDataPools, displayFieldJobsUngrouped, displayFieldPoolsUngrouped, totalUsage])

  useEffect(() => {
    setTruncateWarning('')
    let chartDataTmp = {};
    if (numUser > 1) {
      chartDataTmp = getChartData('usernames', ungroupedDataJobs.concat(ungroupedDataPools))
      setUserChartData(chartDataTmp)
    }

    if (numInstances > 1) {
      chartDataTmp = getChartData('instance', ungroupedDataJobs.concat(ungroupedDataPools))
      setInstanceChartData(chartDataTmp)
    }

    if (numPools > 1) {
      chartDataTmp = getChartData('pool_label', ungroupedDataJobs.concat(ungroupedDataPools))
      setPoolLabelChartData(chartDataTmp)
    }

  }, [ungroupedDataJobs, ungroupedDataPools, numUser, numInstances, numPools])

  return (
    <div className="App">
      <div className="form-group mt-3 mb-3">
        <label htmlFor="aggregateDropdownInput">
          Aggregate
        </label>
        <Select
          id="aggregateDropdown"
          inputId="aggregateDropdownInput"
          isClearable={false}
          value={availableAggregateTypes.find(type => type.value === selectedAggregateType)}
          isSearchable={true}
          onChange={selected => setSelectedAggregateType(selected.value)}
          options={availableAggregateTypes}
        />
      </div>
      {isLoading ? (
        <ClipLoader />
      ) : (
        <>
          <h2 className="text-end">Total: {new Intl.NumberFormat('en-US', { style: 'decimal' }).format(totalUsage)} {quotaUnit} </h2>
          {truncateWarning !== '' && <div className='alert alert-warning' role='alert'>
            {truncateWarning}
          </div>}
          <div className='row'>
            {(numCharts > 0) ? (
              <div className={'col-xl-' + ((numCharts === 3) ? '12' : '3') + ' col-lg-3 col-md-12 col-12'}>
                <div className='row'>
                  {(numUser > 1) ? (
                    <div className={'col-xl-' + ((numCharts === 3) ? '4' : '12') +
                      ' col-lg-12 col-md-6 col-sm-' + (12 / numCharts).toString() + ' col-12'}>
                      <h3>Users</h3>
                      <Pie data={userChartData} />
                    </div>
                  ) : null}
                  {(numInstances > 1) ? (
                    <div className={'col-xl-' + ((numCharts === 3) ? '4' : '12') +
                      ' col-lg-12 col-md-6 col-sm-' + (12 / numCharts).toString() + ' col-12'}>
                      <h3>Instances</h3>
                      <Pie data={instanceChartData} />
                    </div>
                  ) : null}
                  {(numPools > 1) ? (
                    <div className={'col-xl-' + ((numCharts === 3) ? '4' : '12') +
                      ' col-lg-12 col-md-6 col-sm-' + (12 / numCharts).toString() + ' col-12'}>
                      <h3>Pools *</h3>
                      <Pie data={poolLabelChartData} />
                    </div>
                  ) : null}
                </div>
              </div>
            ) : null}
            <div className={'col-xl-' + ((numCharts === 3) ? '12' : ((numCharts > 0) ? '9' : '12')) +
              ' col-lg-' + (((numCharts > 0) ? '9' : '12')) + ' col-md-12 col-12'}>
              <h3>Jobs</h3>
              <div data-testid="tableJobs" >
                <Table data={tableDataJobs}
                  noDataMsg="No Usage data found"
                  displayFields={displayFieldsJobs}
                  isLoading={false}
                  idFieldName={'unique_id'} />
              </div>
              <h3>Idle Pool Times</h3>
              <div data-testid="tableIdlePool" >
                <Table data={tableDataPools}
                  noDataMsg="No Usage data found"
                  displayFields={displayFieldsPools}
                  isLoading={false}
                  idFieldName={'unique_id'} />
              </div>
            </div>
          </div>
          {(numPools > 1) ? (
            <div>* includes Idle Times</div>
          ) : null}
        </>)}
    </div>
  );
}

function formatTime(milliseconds) {
  const seconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  const remainingMinutes = minutes % 60;
  const remainingSeconds = seconds % 60;

  const new_time = `${hours}:${remainingMinutes}:${remainingSeconds}`;

  return (
    new_time
  );
}

function groupByUser(ungroupedData) {

  let allUsers = ungroupedData.map(elem => elem.user);

  let setOfAllUsers = [...new Set(allUsers)];

  let groupedUserData = setOfAllUsers.map(user => {
    let userJobs = ungroupedData.filter(elem => elem.user === user)
    userJobs = userJobs.reduce((acc) => acc + 1, 0);

    let userFails = ungroupedData.filter(elem => elem.user === user)
    userFails = userFails.reduce((acc, elem) => acc + elem.fails, 0);

    let userTimes = ungroupedData.filter(elem => elem.user === user)
    userTimes = userTimes.reduce((acc, elem) => acc + elem.times, 0);

    let userCost = ungroupedData.filter(elem => elem.user === user)
    userCost = userCost.reduce((acc, elem) => acc + elem.cost, 0);

    // Find the first matching element to get 'unique_id'
    let firstMatchingElem = ungroupedData.find(elem => elem.user === user);

    return {
      unique_id: firstMatchingElem.unique_id,
      user: user,
      times: userTimes,
      fails: userFails,
      jobs: userJobs,
      cost: userCost
    };
  });

  return groupedUserData
}

function groupByInstance(ungroupedData) {

  let allInstances = ungroupedData.map(elem => elem.instance);

  let setOfAllInstances = [...new Set(allInstances)];

  let groupedInstanceData = setOfAllInstances.map(instance => {
    let instanceJobs = ungroupedData.filter(elem => elem.instance === instance)
    instanceJobs = instanceJobs.reduce((acc) => acc + 1, 0);

    let instanceFails = ungroupedData.filter(elem => elem.instance === instance)
    instanceFails = instanceFails.reduce((acc, elem) => acc + elem.fails, 0);

    let instanceTimes = ungroupedData.filter(elem => elem.instance === instance)
    instanceTimes = instanceTimes.reduce((acc, elem) => acc + elem.times, 0);

    let instanceCost = ungroupedData.filter(elem => elem.instance === instance)
    instanceCost = instanceCost.reduce((acc, elem) => acc + elem.cost, 0);

    // Find the first matching element to get 'unique_id'
    let firstMatchingElem = ungroupedData.find(elem => elem.instance === instance);

    return {
      unique_id: firstMatchingElem.unique_id,
      instance: instance,
      times: instanceTimes,
      fails: instanceFails,
      jobs: instanceJobs,
      cost: instanceCost
    };
  });

  return groupedInstanceData
}

function groupByPoolLabel(ungroupedData) {

  let allPoolLabel = ungroupedData.map(elem => elem.pool_label);
  allPoolLabel = allPoolLabel.filter(elem => elem !== null)

  let setOfAllPoolLabels = [...new Set(allPoolLabel)];

  let groupedPoolData = setOfAllPoolLabels.map(pool_label => {
    let poolJobs = ungroupedData.filter(elem => elem.pool_label === pool_label)
    poolJobs = poolJobs.reduce((acc) => acc + 1, 0);

    let poolFails = ungroupedData.filter(elem => elem.pool_label === pool_label)
    poolFails = poolFails.reduce((acc, elem) => acc + elem.fails, 0);

    let poolTimes = ungroupedData.filter(elem => elem.pool_label === pool_label)
    poolTimes = poolTimes.reduce((acc, elem) => acc + elem.times, 0);

    let poolCost = ungroupedData.filter(elem => elem.pool_label === pool_label)
    poolCost = poolCost.reduce((acc, elem) => acc + elem.cost, 0);

    // Find the first matching element to get 'unique_id'
    let firstMatchingElem = ungroupedData.find(elem => elem.pool_label === pool_label);

    return {
      unique_id: firstMatchingElem.unique_id,
      pool_label: pool_label,
      times: poolTimes,
      fails: poolFails,
      jobs: poolJobs,
      cost: poolCost
    };
  });

  return groupedPoolData
}

export default Quotas;
