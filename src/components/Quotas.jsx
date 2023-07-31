// not here, no default set
import { testData } from './data.jsx';
import { useEffect, useRef, useState } from 'react';
import { Chart as ChartJS, ArcElement, Legend, Tooltip } from 'chart.js';
import { Pie } from 'react-chartjs-2';
import 'chartjs-adapter-date-fns';
// can rename, because it takes the default export
import computeTimes from './CalculateQuota.js'
import Table from './Table.jsx'
import Select from 'react-select';
import { Link } from "react-router-dom";



ChartJS.register(ArcElement, Tooltip, Legend);



const Quotas = ({ testData, calcStartDate, calcEndTime, quotaUnit }) => {
  /*
    const data = test_data['test_hypercube_with_pool_and_job'];
    const calcStartDate = "2021-08-03T17:10:15.000000+00:00";
    const calcEndTime = "2021-08-05T17:10:15.000000+00:00";
  
    let test_tableData = [{ unique_id: 'test', instances: 'bla', pool_labels: 'jaja', multipliers: 1, times: 17263716, comments: 'test123', fails: 0 }];
  */

  // const data = test_data['real_test_data'];
  //   const data = testData
  //   const calcStartDate = new Date("2021-01-04T17:10:15.000000+00:00");
  //   const calcEndTime = new Date("2023-03-31T17:10:15.000000+00:00");

  const dataTmp = computeTimes(testData, calcStartDate, calcEndTime, quotaUnit)
  const [ungroupedDataJobs, setUngroupedDataJobs] = useState(dataTmp.data_jobs);
  const [ungroupedDataPools, setUngroupedDataPools] = useState(dataTmp.data_pools);

  useEffect(() => {
    const dataTmp = computeTimes(testData, calcStartDate, calcEndTime, quotaUnit)
    setUngroupedDataJobs(dataTmp.data_jobs)
    setUngroupedDataPools(dataTmp.data_pools)
  }, [testData, calcStartDate, calcEndTime, quotaUnit])


  function getChartData(label, ungroupedData) {
    let groupedData = []
    let labels = []
    let cost = []
    if (label === 'usernames') {
      groupedData = GroupByUser(ungroupedData);
      labels = groupedData.map(elem => elem.user);
      cost = groupedData.map(elem => elem.cost);
    } else if (label === 'instances') {
      groupedData = GroupByInstance(ungroupedData);
      labels = groupedData.map(elem => elem.instances);
      cost = groupedData.map(elem => elem.cost);
    } else if (label === 'pool_labels') {
      groupedData = GroupByPoolLabel(ungroupedData);
      labels = groupedData.map(elem => elem.pool_labels);
      cost = groupedData.map(elem => elem.cost);
    }

    const cutOff = 20;
    if (labels.length > cutOff) {
      setTruncateWarning(current => `${current} Only the ${cutOff} most used ${label} displayed. `)
      const labelTimePairs = labels.map((label, index) => ({ label, cost: cost[index] }));

      // Sort the array of objects based on decreasing time
      labelTimePairs.sort((a, b) => b.cost - a.cost);

      // Extract the sorted labels and times separately
      labels = labelTimePairs.map(pair => pair.label);
      cost = labelTimePairs.map(pair => pair.cost);
      labels = labels.slice(0,cutOff);
      cost = cost.slice(0,cutOff)
    }

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

  const displayFieldUngrouped = useRef([
    // {
    //   field: "unique_id",
    //   column: "id",
    //   sorter: "alphabetical",
    //   displayer: String
    // },
    {
      field: "user, unique_id",
      column: "User",
      sorter: "alphabetical",
      displayer: (user, _) => user
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
      field: "instances",
      column: "Instance",
      sorter: "alphabetical",
      displayer: String
    },
    {
      field: "pool_labels",
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
      field: "multipliers",
      column: "Multiplier",
      sorter: "alphabetical",
      displayer: String
    },
    {
      field: "cost",
      column: quotaUnit,
      sorter: "numerical",
      displayer: (cost) => Intl.NumberFormat('en-US', { style: 'decimal' }).format(cost)//(cost) => cost.toFixed(2)
    }
  ])

  function swaptDisplayFieldPool(field) {
    let fieldTmp = [...field];

    const idx1 = fieldTmp.findIndex(item => item.field === 'pool_labels');
    const idx2 = fieldTmp.findIndex(item => item.field === 'instances');


    const tmp = fieldTmp[idx1];
    fieldTmp[idx1] = fieldTmp[idx2];
    fieldTmp[idx2] = tmp;
  
    return fieldTmp
  }


  const [displayFieldsJobs, setDisplayFieldsJobs] = useState(displayFieldUngrouped.current);
  const [displayFieldsPools, setDisplayFieldsPools] = useState(displayFieldUngrouped.current);

  const availableAggregateTypes = [{ value: '_', label: '_' }, { value: "username", label: 'User' }, { value: "instance", label: 'Instance' }, { value: "pool_label", label: 'Pool_label' }]

  const [selectedAggregateType, setSelectedAggregateType] = useState('_')
  const [totalUsage, setTotalUsage] = useState(0);
  const [tableDataJobs, setTableDataJobs] = useState([])
  const [tableDataPools, setTableDataPools] = useState([])
  const [userChartData, setUserChartData] = useState({ labels: ['-'], datasets: [{label: '# of Votes', data: [1], backgroundColor: ["rgba(31,120,180,0.2)"]}]})
  const [instanceChartData, setInstanceChartData] = useState({ labels: ['-'], datasets: [{label: '# of Votes', data: [1], backgroundColor: ["rgba(31,120,180,0.2)"]}]})
  const [poolLabelChartData, setPoolLabelChartData] = useState({ labels: ['-'], datasets: [{label: '# of Votes', data: [1], backgroundColor: ["rgba(31,120,180,0.2)"]}]})

  const [truncateWarning, setTruncateWarning] = useState([])

  useEffect(() => {
    if (selectedAggregateType === '_') {
      const displayFieldsTmpJob = displayFieldUngrouped.current.filter(el => !['jobs'].includes(el.field))
      let displayFieldsTmpPool = displayFieldUngrouped.current.filter(el => !['jobs', 'token,is_hypercube'].includes(el.field))
      displayFieldsTmpPool = swaptDisplayFieldPool(displayFieldsTmpPool)
      setTableDataJobs(ungroupedDataJobs)
      setTableDataPools(ungroupedDataPools)
      let sumTmp = ungroupedDataJobs.reduce((accumulator, currentValue) => accumulator + currentValue.times * currentValue.multipliers, 0)
      sumTmp += ungroupedDataPools.reduce((accumulator, currentValue) => accumulator + currentValue.times * currentValue.multipliers, 0)    
      setTotalUsage(sumTmp)
      setDisplayFieldsJobs(displayFieldsTmpJob)
      setDisplayFieldsPools(displayFieldsTmpPool)
    } else if (selectedAggregateType === 'username') {
      const displayFieldsTmpJob = displayFieldUngrouped.current.filter(el => !['instances', 'pool_labels', 'multipliers', 'token,is_hypercube'].includes(el.field))
      const displayFieldsTmpPool = displayFieldUngrouped.current.filter(el => !['instances', 'pool_labels', 'multipliers', 'token,is_hypercube'].includes(el.field))
      setTableDataJobs(GroupByUser(ungroupedDataJobs))
      setTableDataPools(GroupByUser(ungroupedDataPools))
      let sumTmp = ungroupedDataJobs.reduce((accumulator, currentValue) => accumulator + currentValue.times * currentValue.multipliers, 0)
      sumTmp += ungroupedDataPools.reduce((accumulator, currentValue) => accumulator + currentValue.times * currentValue.multipliers, 0)    
      setTotalUsage(sumTmp)
      setDisplayFieldsJobs(displayFieldsTmpJob)
      setDisplayFieldsPools(displayFieldsTmpPool)
    } else if (selectedAggregateType === 'instance') {
      const displayFieldsTmpJob = displayFieldUngrouped.current.filter(el => !['user, unique_id', 'pool_labels', 'multipliers', 'token,is_hypercube'].includes(el.field))
      const displayFieldsTmpPool = displayFieldUngrouped.current.filter(el => !['user, unique_id', 'pool_labels', 'multipliers', 'token,is_hypercube'].includes(el.field))
      setTableDataJobs(GroupByInstance(ungroupedDataJobs))
      setTableDataPools(GroupByInstance(ungroupedDataPools))
      let sumTmp = ungroupedDataJobs.reduce((accumulator, currentValue) => accumulator + currentValue.times * currentValue.multipliers, 0)
      sumTmp += ungroupedDataPools.reduce((accumulator, currentValue) => accumulator + currentValue.times * currentValue.multipliers, 0)    
      setTotalUsage(sumTmp)
      setDisplayFieldsJobs(displayFieldsTmpJob)
      setDisplayFieldsPools(displayFieldsTmpPool)
    } else if (selectedAggregateType === 'pool_label') {
      const displayFieldsTmpJob = displayFieldUngrouped.current.filter(el => !['instances', 'user, unique_id', 'multipliers', 'token,is_hypercube'].includes(el.field))
      const displayFieldsTmpPool = displayFieldUngrouped.current.filter(el => !['instances', 'user, unique_id', 'multipliers', 'token,is_hypercube'].includes(el.field))
      setTableDataJobs(GroupByPoolLabel(ungroupedDataJobs))
      setTableDataPools(GroupByPoolLabel(ungroupedDataPools))
      let sumTmp2 = ungroupedDataJobs.filter(el => el.pool_label != null).reduce((accumulator, currentValue) => accumulator + currentValue.times * currentValue.multipliers, 0)
      sumTmp2 += ungroupedDataPools.reduce((accumulator, currentValue) => accumulator + currentValue.times * currentValue.multipliers, 0)
      setTotalUsage(sumTmp2)
      setDisplayFieldsJobs(displayFieldsTmpJob)
      setDisplayFieldsPools(displayFieldsTmpPool)
    }


  }, [quotaUnit, selectedAggregateType, ungroupedDataJobs, ungroupedDataPools, displayFieldUngrouped])

  useEffect(() => {
    setTruncateWarning('')
    let chartDataTmp = getChartData('usernames', ungroupedDataJobs)
    if (chartDataTmp.labels.length === 0) {
      chartDataTmp = { labels: ['-'], datasets: [{label: '# of Votes', data: [1], backgroundColor: ["rgba(31,120,180,0.2)"]}]}
    }
    setUserChartData(chartDataTmp)
    chartDataTmp = getChartData('instances', ungroupedDataJobs)
    if (chartDataTmp.labels.length === 0) {
      chartDataTmp = { labels: ['-'], datasets: [{label: '# of Votes', data: [1], backgroundColor: ["rgba(31,120,180,0.2)"]}]}
    }
    setInstanceChartData(chartDataTmp)
    chartDataTmp = getChartData('pool_labels', ungroupedDataJobs.concat(ungroupedDataPools))
    if (chartDataTmp.labels.length === 0) {
      chartDataTmp = { labels: ['-'], datasets: [{label: '# of Votes', data: [1], backgroundColor: ["rgba(31,120,180,0.2)"]}]}
    }
    setPoolLabelChartData(chartDataTmp)

  }, [ungroupedDataJobs, ungroupedDataPools])

  return (
    <div className="App">
      <div className="form-group mt-3 mb-3">
        <label htmlFor="aggregateDropdown">
          Aggregate
        </label>
        <Select
          id="aggregateDropdown"
          isClearable={false}
          value={availableAggregateTypes.filter(type => type.value === selectedAggregateType)[0]}
          isSearchable={true}
          onChange={selected => setSelectedAggregateType(selected.value)}
          options={availableAggregateTypes}
        />
      </div>
      <h2 className="text-right">Total: {new Intl.NumberFormat('en-US', { style: 'decimal' }).format(quotaUnit === 'mults' ? totalUsage: totalUsage / 3600)} {quotaUnit} </h2>
      {truncateWarning !== '' && <div className='alert alert-warning' role='alert'>
        {truncateWarning}
      </div>}
      <div className='row'>
        <div className='col-xl-6 col-12'>
          <div className='row'>
            <div className='col-md-4 col-sm-6 col-12'>
              <h3>Users</h3>
              <Pie data={userChartData} />
            </div>
            <div className='col-md-4 col-sm-6 col-12'>
              <h3>Instances</h3>
              <Pie data={instanceChartData} />
            </div>
            <div className='col-md-4 col-sm-6 col-12'>
              <h3>Pools (With Idle)</h3>
              <Pie data={poolLabelChartData} />
            </div>
          </div>
        </div>
        <div className='col-xl-6 col-12'>
          <h3>Jobs</h3>
          <Table data={tableDataJobs}
            noDataMsg="No Usage data found"
            displayFields={displayFieldsJobs}
            isLoading={false}
            idFieldName={'token'} />
          <h3>Idle Pool Times</h3>
          <Table data={tableDataPools}
            noDataMsg="No Usage data found"
            displayFields={displayFieldsPools}
            isLoading={false}
            idFieldName={'unique_id'} />
        </div>
      </div>
    </div>
  );
}

function formatTime(milliseconds) {
  const seconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  const remainingMinutes = minutes % 60;
  const remainingSeconds = seconds % 60;

  //const new_time = `${days} days, ${remainingHours}:${remainingMinutes}:${remainingSeconds}, ${remainingMilliseconds} milliseconds`;
  const new_time = `${hours}:${remainingMinutes}:${remainingSeconds}`;

  return (
    new_time
  );
}

function GroupByUser(ungroupedData) {

  let allUsers = ungroupedData.map(elem => elem.user);

  let setOfAllUsers = [...new Set(allUsers)];

  let jobsPerUser = Array(setOfAllUsers.length).fill(0);
  let failsPerUser = Array(setOfAllUsers.length).fill(0);
  let timesPerUser = Array(setOfAllUsers.length).fill(0);
  let costPerUser = Array(setOfAllUsers.length).fill(0);

  allUsers.forEach(function (user, i) {
    jobsPerUser[setOfAllUsers.indexOf(user)] += 1
    failsPerUser[setOfAllUsers.indexOf(user)] += ungroupedData[i].fails
    timesPerUser[setOfAllUsers.indexOf(user)] += ungroupedData[i].times
    costPerUser[setOfAllUsers.indexOf(user)] += ungroupedData[i].cost
  });

  let groupedUserData = []

  // when grouped by user: 'user', 'pool_label' and 'multiplier' can't be shown anymore
  setOfAllUsers.forEach(function (elem, i) {
    groupedUserData.push({
      unique_id: ungroupedData[i].unique_id, user: elem,
      times: timesPerUser[i], fails: failsPerUser[i], jobs: jobsPerUser[i],
      cost: costPerUser[i]})
  });

  return groupedUserData
}

function GroupByInstance(ungroupedData) {

  let allInstances = ungroupedData.map(elem => elem.instances);

  let setOfAllInstances = [...new Set(allInstances)];

  let jobsPerInstances = Array(setOfAllInstances.length).fill(0);
  let failsPerInstances = Array(setOfAllInstances.length).fill(0);
  let timesPerInstances = Array(setOfAllInstances.length).fill(0);
  let costPerInstances = Array(setOfAllInstances.length).fill(0);

  allInstances.forEach(function (instance, i) {
    jobsPerInstances[setOfAllInstances.indexOf(instance)] += 1
    failsPerInstances[setOfAllInstances.indexOf(instance)] += ungroupedData[i].fails
    timesPerInstances[setOfAllInstances.indexOf(instance)] += ungroupedData[i].times
    costPerInstances[setOfAllInstances.indexOf(instance)] += ungroupedData[i].cost
  });

  let groupedInstanceData = []

  // when grouped by user: 'user', 'pool_label' and 'multiplier' can't be shown anymore
  setOfAllInstances.forEach(function (elem, i) {
    groupedInstanceData.push({
      unique_id: ungroupedData[i].unique_id, instances: elem,
      times: timesPerInstances[i], fails: failsPerInstances[i], jobs: jobsPerInstances[i],
      cost: costPerInstances[i]})
  });

  return groupedInstanceData
}

function GroupByPoolLabel(ungroupedData) {

  let allPoolLabel = ungroupedData.map(elem => elem.pool_labels);
  allPoolLabel = allPoolLabel.filter(elem => elem !== null)

  let setOfAllPoolLabel = [...new Set(allPoolLabel)];

  let jobsPerPoolLabel = Array(setOfAllPoolLabel.length).fill(0);
  let failsPerPoolLabel = Array(setOfAllPoolLabel.length).fill(0);
  let timesPerPoolLabel = Array(setOfAllPoolLabel.length).fill(0);
  let costPerPoolLabel = Array(setOfAllPoolLabel.length).fill(0);

  allPoolLabel.forEach(function (label, i) {
    jobsPerPoolLabel[setOfAllPoolLabel.indexOf(label)] += 1
    failsPerPoolLabel[setOfAllPoolLabel.indexOf(label)] += ungroupedData[i].fails
    timesPerPoolLabel[setOfAllPoolLabel.indexOf(label)] += ungroupedData[i].times
    costPerPoolLabel[setOfAllPoolLabel.indexOf(label)] += ungroupedData[i].cost
  });

  let groupedInstanceData = []

  // when grouped by user: 'user', 'pool_label' and 'multiplier' can't be shown anymore
  setOfAllPoolLabel.forEach(function (elem, i) {
    groupedInstanceData.push({
      unique_id: ungroupedData[i].unique_id,
      pool_labels: elem, times: timesPerPoolLabel[i],
      fails: failsPerPoolLabel[i], jobs: jobsPerPoolLabel[i],
      cost: costPerPoolLabel[i]})
  });

  return groupedInstanceData
}

export default Quotas;
