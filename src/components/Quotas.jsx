// not here, no default set
import { testData } from './data.jsx';
import { useEffect, useState } from 'react';
// can rename, because it takes the default export
import computeTimes from './CalculateQuota.js'
import Table from './Table.jsx'
import Select from 'react-select'; 
import {Link} from "react-router-dom";



const Quotas = ({testData, calcStartDate, calcEndTime}) => {
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

const dataTmp = computeTimes(testData, calcStartDate, calcEndTime)
const [ungroupedDataJobs, setUngroupedDataJobs] = useState(dataTmp.data_jobs);
const [ungroupedDataPools, setUngroupedDataPools] = useState(dataTmp.data_pools);

useEffect(() => {
    const dataTmp = computeTimes(testData, calcStartDate, calcEndTime)
    setUngroupedDataJobs(dataTmp.data_jobs)
    setUngroupedDataPools(dataTmp.data_pools)
 }, [testData, calcStartDate, calcEndTime])


 const [metric, setMetric] = useState('mults')

 const displayFieldUngrouped = [
    // {
    //   field: "unique_id",
    //   column: "id",
    //   sorter: "alphabetical",
    //   displayer: String
    // },
    {
      field: "user",
      column: "User",
      sorter: "alphabetical",
      displayer: String
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
      displayer: (pool_label) => pool_label == null? '-': pool_label
    },
    {
        field: "times",
        column: "Solve Time",
        sorter: "numerical",
        displayer: formatTime
      },
      {
        field: "fails",
        column: "Number Fails",
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
      field: "multipliers",
      column: "Multiplier",
      sorter: "alphabetical",
      displayer: String
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
    }
  ]


  const [displayFieldsJobs, setDisplayFieldsJobs] = useState(displayFieldUngrouped);
  const [displayFieldsPools, setDisplayFieldsPools] = useState(displayFieldUngrouped);

  const availableAggregateTypes = [{value: '_', label: '_'}, {value: "username", label: 'User'}, {value: "instance", label: 'Instance'}, {value: "pool_label", label: 'Pool_label'}]
  const availableMetrics = [{value: 'mults', label: 'mults'}, {value: 'multh', label: 'multh'}]

  const [selectedAggregateType, setSelectedAggregateType] = useState('_')
  const [totalUsage, setTotalUsage] = useState(0);
  const [tableDataJobs, setTableDataJobs] = useState([])
  const [tableDataPools, setTableDataPools] = useState([])

  let sumTmp = 0
  sumTmp = ungroupedDataJobs.reduce((accumulator, currentValue) => accumulator + currentValue.times * currentValue.multipliers, 0)
  sumTmp += ungroupedDataPools.reduce((accumulator, currentValue) => accumulator + currentValue.times * currentValue.multipliers, 0)

  useEffect(()=> {
    if (selectedAggregateType === '_') {
      const displayFieldsTmpPool = displayFieldUngrouped.filter(el => !['token,is_hypercube'].includes(el.field))
      setTableDataJobs(ungroupedDataJobs)
      setTableDataPools(ungroupedDataPools)
      setTotalUsage(sumTmp)
      setDisplayFieldsJobs(displayFieldUngrouped)
      setDisplayFieldsPools(displayFieldsTmpPool)
    } else if (selectedAggregateType === 'username') {
      const displayFieldsTmpJob = displayFieldUngrouped.filter(el => !['instances', 'pool_labels', 'multipliers', 'token,is_hypercube'].includes(el.field))
      const displayFieldsTmpPool = displayFieldUngrouped.filter(el => !['instances', 'pool_labels', 'multipliers', 'token,is_hypercube'].includes(el.field))
      setTableDataJobs(GroupByUser(ungroupedDataJobs))
      setTableDataPools(GroupByUser(ungroupedDataPools))
      setTotalUsage(sumTmp)
      setDisplayFieldsJobs(displayFieldsTmpJob)
      setDisplayFieldsPools(displayFieldsTmpPool)
    } else if  (selectedAggregateType === 'instance') {
      const displayFieldsTmpJob = displayFieldUngrouped.filter(el => !['user', 'pool_labels', 'multipliers', 'token,is_hypercube'].includes(el.field))
      const displayFieldsTmpPool = displayFieldUngrouped.filter(el => !['user', 'pool_labels', 'multipliers', 'token,is_hypercube'].includes(el.field))
      setTableDataJobs(GroupByInstance(ungroupedDataJobs))
      setTableDataPools(GroupByInstance(ungroupedDataPools))
      setTotalUsage(sumTmp)
      setDisplayFieldsJobs(displayFieldsTmpJob)
      setDisplayFieldsPools(displayFieldsTmpPool)
    } else if (selectedAggregateType === 'pool_label') {
      const displayFieldsTmpJob = displayFieldUngrouped.filter(el => !['instances', 'user', 'multipliers', 'token,is_hypercube'].includes(el.field))
      const displayFieldsTmpPool = displayFieldUngrouped.filter(el => !['instances', 'user', 'multipliers', 'token,is_hypercube'].includes(el.field))
      setTableDataJobs(GroupByPoolLabel(ungroupedDataJobs))
      setTableDataPools(GroupByPoolLabel(ungroupedDataPools))
      sumTmp = ungroupedDataJobs.filter(el => el.pool_label != null).reduce((accumulator, currentValue) => accumulator + currentValue.times * currentValue.multipliers, 0)
      sumTmp += ungroupedDataPools.reduce((accumulator, currentValue) => accumulator + currentValue.times * currentValue.multipliers, 0)
      setTotalUsage(sumTmp)
      setDisplayFieldsJobs(displayFieldsTmpJob)
      setDisplayFieldsPools(displayFieldsTmpPool)
    }
    
  }, [selectedAggregateType, ungroupedDataJobs, ungroupedDataPools])

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
      <div className="form-group mt-3 mb-3">
          <label htmlFor="aggregateDropdown">
              Metric
          </label>
          <Select
              id="aggregateDropdown"
              isClearable={false}
              value={availableMetrics.filter(type => type.value === metric)[0]}
              isSearchable={true}
              onChange={selected => setMetric(selected.value)}
              options={availableMetrics}
          />
      </div>
      <h2 className="text-right">Total: {new Intl.NumberFormat('en-US', { style: 'decimal' }).format(totalUsage)} {metric} </h2>
      <h3>Jobs</h3>
      <Table data={tableDataJobs}
        noDataMsg="No Usage data found"
        displayFields={displayFieldsJobs}
        sortedAsc={false}
        isLoading={false}
        sortedCol="helper_col"
        idFieldName={'helper_col'} />
      <h3>Idle Pool Times</h3>
      <Table data={tableDataPools}
        noDataMsg="No Usage data found"
        displayFields={displayFieldsPools}
        sortedAsc={false}
        isLoading={false}
        sortedCol="helper_col"
        idFieldName={'helper_col'} />
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
    let FailsPerUser = Array(setOfAllUsers.length).fill(0);
    let TimesPerUser = Array(setOfAllUsers.length).fill(0);
  
    allUsers.forEach(function (user, i) {
      jobsPerUser[setOfAllUsers.indexOf(user)] += 1
      FailsPerUser[setOfAllUsers.indexOf(user)] += ungroupedData[i].fails
      TimesPerUser[setOfAllUsers.indexOf(user)] += ungroupedData[i].times
    });
  
    let groupedUserData = []
  
    // when grouped by user: 'user', 'pool_label' and 'multiplier' can't be shown anymore
    setOfAllUsers.forEach(function (elem, i) {
      groupedUserData.push({ unique_id: ungroupedData[i].unique_id, user: elem,  
        times: TimesPerUser[i], fails: FailsPerUser[i], jobs: jobsPerUser[i]})
    });
    
    return groupedUserData
}

function GroupByInstance(ungroupedData) {

    let allInstances = ungroupedData.map(elem => elem.instances);

    let setOfAllInstances = [...new Set(allInstances)];

    let jobsPerInstances = Array(setOfAllInstances.length).fill(0);
    let failsPerInstances = Array(setOfAllInstances.length).fill(0);
    let timesPerInstances = Array(setOfAllInstances.length).fill(0);
  
    allInstances.forEach(function (user, i) {
      jobsPerInstances[setOfAllInstances.indexOf(user)] += 1
      failsPerInstances[setOfAllInstances.indexOf(user)] += ungroupedData[i].fails
      timesPerInstances[setOfAllInstances.indexOf(user)] += ungroupedData[i].times
    });
  
    let groupedInstanceData = []
  
    // when grouped by user: 'user', 'pool_label' and 'multiplier' can't be shown anymore
    setOfAllInstances.forEach(function (elem, i) {
        groupedInstanceData.push({ unique_id: ungroupedData[i].unique_id, instances: elem, 
        times: timesPerInstances[i], fails: failsPerInstances[i], jobs: jobsPerInstances[i]})
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
  
    allPoolLabel.forEach(function (user, i) {
      jobsPerPoolLabel[setOfAllPoolLabel.indexOf(user)] += 1
      failsPerPoolLabel[setOfAllPoolLabel.indexOf(user)] += ungroupedData[i].fails
      timesPerPoolLabel[setOfAllPoolLabel.indexOf(user)] += ungroupedData[i].times
    });
  
    let groupedInstanceData = []
  
    // when grouped by user: 'user', 'pool_label' and 'multiplier' can't be shown anymore
    setOfAllPoolLabel.forEach(function (elem, i) {
        groupedInstanceData.push({ unique_id: ungroupedData[i].unique_id,
        pool_labels: elem, times: timesPerPoolLabel[i], 
        fails: failsPerPoolLabel[i], jobs: jobsPerPoolLabel[i]})
    });
    
    return groupedInstanceData
}


export default Quotas;
