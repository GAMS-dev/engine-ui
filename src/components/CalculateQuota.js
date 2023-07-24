function getComputationTimes(data, calcstartTimeInput, calcEndTimeInput) {
    const calcstartTime = calcstartTimeInput
    const calcEndTime = calcEndTimeInput

    // extract the three different job types
    const dataJobUsage = data['job_usage']==null?[]:data['job_usage'];
    const dataPoolUsage = data['pool_usage']==null?[]:data['pool_usage'];
    const dataHypercube = data['hypercube_job_usage']==null?[]:data['hypercube_job_usage'];

    // first extract all the pool infos, to later check if an individual job was part of a pool
    let PoolLabels = dataPoolUsage.map(pool => pool['label']);
    let poolInstances = dataPoolUsage.map(pool => pool['instance']['label']);
    let poolOwners = dataPoolUsage.map(pool => pool['owner']);

    // only need the idle multiplier from the pools
    // for the jobs use the multiplier from the jop instance
    let PoolMultipliersIdle = dataPoolUsage.map(pool => pool['instance']['multiplier_idle']);

    // contains for every pool a list of the times of every worker
    // each element of the individual lists is a dictionary
    let PoolTimes = dataPoolUsage.map(pool => pool['times']);

    let CommentPool = Array(PoolLabels.length).fill('This is the idle pool time. ');
    let FailsPool = Array(PoolLabels.length).fill(0);
    let isIdlePool =  Array(PoolLabels.length).fill(true);
    let tokenPool =  Array(PoolLabels.length).fill('');

    // check if workers failed, for this collect all worker_id's for each pool
    // if there are multiple entries for the same id, only keep the last one 
    // the number of fails is saved as a comment and as an actual number, 
    // to later easily compute the total number of fails
    PoolTimes.forEach(function (pool, i) {
        // extract the worker_id for each timeframe
        let workers = pool.map(time => time['worker_id']);
        const workersWithoutDuplicates = [...new Set(workers)];
        workersWithoutDuplicates.forEach(function(worker) {
            // need to save count for the comment, because it changes after the duplicates are deleted
            const count = workers.filter(el => el === worker).length;
            // if a worker failed set the start time of the last occurence of this worker to the first start time
            if (count > 1) {
                // get indices of the same worker
                let indices = [];
                for (let idx = 0; idx < workers.length; idx++) {
                    if (workers[idx] === worker) {
                        indices.push(idx);
                    }
                }
                // change the start time of the current worker to the start of it's first occurence
                PoolTimes[i][indices[indices.length - 1]].start = PoolTimes[i][indices[0]].start;
                // Now remove all other occurences from PoolTimes
                indices = indices.slice(0, -1);
                // remove all elements in PoolTimes and pool_workers
                PoolTimes[i] = PoolTimes[i].filter(function(time, idx) {
                    return !indices.includes(idx);
                });
                workers = workers.filter(function(worker_id, idx) {
                    return !indices.includes(idx);
                });

                CommentPool[i] = CommentPool[i].concat(`${worker} failed ${count - 1} times. `);
                FailsPool[i] = count - 1
            }
        });
    });

    // compute the whole time workers existed on the pool (and didn't fail because those workers are already removed)
    PoolTimes.forEach(function (pool, i) {
        let totalWorkerTime = 0;
        pool.forEach(function(times) {
            let startTime = new Date(times['start']);
            let finishTime = calcEndTime;
            // check if the worker is still running
            if (times['finish'] != null) {
                finishTime = new Date(times['finish']);
            }
            else if (dataPoolUsage[i]['deleted_at'] != null){
                finishTime = new Date( dataPoolUsage[i]['deleted_at']);
                CommentPool[i] =  CommentPool[i].concat('There is no finish time, but the job was finished!!');
            }
            else {
                finishTime = calcEndTime;
                CommentPool[i] =  CommentPool[i].concat(`A worker on ${PoolLabels[i]} is still running. `);
            }
            // only include the parts of the worker times that are in the given timeframe
            if (startTime >= calcstartTime && finishTime <= calcEndTime) {
                totalWorkerTime += finishTime - startTime;
            } else if (calcstartTime <= finishTime && finishTime <= calcEndTime) {
                totalWorkerTime += finishTime - calcstartTime;
            } else if (calcstartTime <= startTime && startTime <= calcEndTime) {
                totalWorkerTime += calcEndTime - startTime;
            } else if (startTime <= calcstartTime && calcEndTime <= finishTime) {
                totalWorkerTime += calcEndTime - calcstartTime;
            }
        });
                
        // if no worker of the pool was in the timeframe the timedelta is zero!
        PoolTimes[i] = totalWorkerTime
    });

    // only needed to later exclude pools, that didn't had a worker in the timeframe
    // if timedelta = 0 this will return False, else set to True 
    let includedPools = PoolTimes.map(item => Boolean(item));

    // collect the instances and the corresponding multipliers
    let instances = dataJobUsage.map(row => row['labels']['instance']);

    let multipliers = dataJobUsage.map(row => row['labels']['multiplier']);
    let times = dataJobUsage.map(row => row['times']);

    let users = dataJobUsage.map(row => row['username']);

    let token = dataJobUsage.map(row => row['token']);

    // used to later only take the instances for jobs that are in the timeframe
    let includedItems = Array(dataJobUsage.length).fill(false);

    let comments = Array(dataJobUsage.length).fill('');
    let fails = Array(dataJobUsage.length).fill(0);
    let isIdle = Array(dataJobUsage.length).fill(false);

    // extract the hypercube informations an add them to the job list
    let hypercubeInstances = [];
    let hypercubeMultipliers = [];
    let hypercubeTimes = [];
    let hypercubeUsers = [];
    let hypercubeToken = [];
    let isHypercube = Array(dataJobUsage.length).fill(false);

    // go over every hypercube in the data
    dataHypercube.forEach(function(hypercube) {
        // save the label and  mutliplier of the current hypercupe to add them to the job list
        let currentInstance = hypercube['labels']['instance'];
        let currentMultiplier = hypercube['labels']['multiplier'];
        let currentUser = hypercube['username'];
        let currentToken = hypercube['token']
        // go over every job of each hypercube to collect the times 
        // and append the instances/multipliers/time list, 
        // to later just concatenate this with the other job list
        // this way also the check if its a pool job will be performed
        hypercube['jobs'].forEach(function(job) {
            hypercubeInstances.push(currentInstance);
            hypercubeMultipliers.push(currentMultiplier);
            hypercubeTimes.push(job['times']);
            hypercubeUsers.push(currentUser);
            hypercubeToken.push(currentToken);
            isHypercube.push(true);
        });
    });

    const hypercubeIncludedItems = Array(hypercubeInstances.length).fill(false);
    const hypercubeComments = Array(hypercubeInstances.length).fill('This job was part of a hypercube. ');
    const hypercubeFails = Array(hypercubeInstances.length).fill(0);
    const hypercubeIsIdle = Array(hypercubeInstances.length).fill(false);

    instances = instances.concat(hypercubeInstances);
    multipliers = multipliers.concat(hypercubeMultipliers);
    times = times.concat(hypercubeTimes);
    includedItems = includedItems.concat(hypercubeIncludedItems);
    comments = comments.concat(hypercubeComments);
    fails = fails.concat(hypercubeFails);
    users = users.concat(hypercubeUsers);
    isIdle = isIdle.concat(hypercubeIsIdle);
    token = token.concat(hypercubeToken);

    // will also report the corresponding given pool_label
    // is None for jobs not run on a pool
    const jobPoolLabels = Array(instances.length).fill(null);

    // needed to later check to which pool a pool_job corresponds
    let jobStartTimes = dataJobUsage.map(job => new Date(job['submitted']));
    const jobHypercubeStartTimes = dataHypercube.map(job => new Date(job['submitted']));
    jobStartTimes = jobStartTimes.concat(jobHypercubeStartTimes);
       
    // check which jobs are in the timeframe and compute their run time
    times.forEach(function(time, i) {
        if (time.length !== 0){
            // always take the last element, so it also works if the job crashed before
            let startTime = new Date(time[time.length - 1]['start']);
            // check if the job is still running
            let finishTime = calcEndTime;
            if (time[time.length - 1]['finish']) {
                finishTime = new Date(time[time.length - 1]['finish']);
            }
            else if(dataJobUsage[i]['finished'] != null){
                finishTime = new Date(dataJobUsage[i]['finished'])
                comments[i] =  comments[i].concat('There is no finish time, but the job was finished!!')
            }
            else{
                finishTime = calcEndTime;
                comments[i] =  comments[i].concat('The job is still running. ');
            }           
            // check if the whole job was run in the timeframe
            if (startTime >= calcstartTime && finishTime <= calcEndTime) {
                times[i] = finishTime - startTime;
                includedItems[i] = true;
            }            
            // or if it finished during the timeframe
            else if (calcstartTime <= finishTime && finishTime <= calcEndTime) {
                times[i] = finishTime - calcstartTime;
                includedItems[i] = true;
                comments[i] += 'Finished in the given timeframe, but started earlier. ';
            }
            // or finally if it started during the timeframe
            else if (calcstartTime <= startTime && startTime <= calcEndTime) {
                times[i] = calcEndTime - startTime;
                includedItems[i] = true;
                comments[i] += 'Started in the given timeframe, but is not finished yet. ';
            }
            // or if it ran over the whole timeframe
            else if (startTime <= calcstartTime && calcEndTime <= finishTime) {
                times[i] = calcEndTime - calcstartTime;
                includedItems[i] = true;
                comments[i] += 'Job ran longer than the timeframe. ';
            }        
            // no else case needed! All other times get discarded
            // add debugg option:
            // if debug=True this case should not happen, because no job outside of the timeframe
            // should be in the json object
            else {
                console.error('Found job outside of the timeframe, even though this should not happen!');
            }

            fails[i] = time.length - 1;
            if (time.length > 1){
                comments[i] = comments[i].concat(`The job failed ${time.length - 1} times. `);
            }
        }
    });

    // get existing times for the pools
    const poolCreated = dataPoolUsage.map(pool => new Date(pool['created_at']));
    const poolDeleted = dataPoolUsage.map(pool => pool['deleted_at']);

    poolDeleted.forEach(function(time, i){
        if (time == null){
            poolDeleted[i] = calcEndTime;
        }
        else{
            poolDeleted[i] = new Date(poolDeleted[i]);
        }
    });
                    
    // substract the jobs corresponding to a pool from the PoolTimes to get the idle time
    times.forEach(function(time, i) {
        if (includedItems[i]) {
            if (PoolLabels.includes(instances[i])){
                // get indices of the pool_label
                let indices = [];
                for (let idx = 0; idx < PoolLabels.length; idx++) {
                  if (instances[i] === PoolLabels[idx]) {
                    indices.push(idx);
                  }
                }
                indices.forEach(function(index) {
                    // find the corresponding pool, if no pool fits the job is processed as a normal job
                    if (poolCreated[index] <= jobStartTimes[i] && jobStartTimes[i] <= poolDeleted[index]) {
                        PoolTimes[index] -= times[i];
                        comments[i] += 'This job ran on a pool. ';
                        jobPoolLabels[i] = instances[i];
                        instances[i] = poolInstances[index];
                    }
                });        
            }
        }
    });       

    // add the pool times at the end of the data
    instances = instances.concat(poolInstances);
    poolInstances = jobPoolLabels.concat(PoolLabels);
    multipliers = multipliers.concat(PoolMultipliersIdle);
    times = times.concat(PoolTimes);
    comments = comments.concat(CommentPool);
    fails = fails.concat(FailsPool);
    includedItems = includedItems.concat(includedPools);
    users = users.concat(poolOwners);
    isIdle = isIdle.concat(isIdlePool);
    isHypercube = isHypercube.concat(Array(PoolLabels.length).fill(false))
    token = token.concat(tokenPool);

    // only take the elements corresponding to jobs/pools in the timeframe
    instances = instances.filter((_, i) => includedItems[i]);
    poolInstances = poolInstances.filter((_, i) => includedItems[i]);
    multipliers = multipliers.filter((_, i) => includedItems[i]);
    times = times.filter((_, i) => includedItems[i]);
    comments = comments.filter((_, i) => includedItems[i]);
    fails = fails.filter((_, i) => includedItems[i]);
    users = users.filter((_, i) => includedItems[i]);
    isIdle = isIdle.filter((_, i) => includedItems[i]);
    isHypercube = isHypercube.filter((_, i) => includedItems[i]);
    token = token.filter((_, i) => includedItems[i]);

    const calcTimes = {
        'users': users,
        'instances': instances,
        'pool_labels': poolInstances,
        'multipliers': multipliers,
        'times': times,
        'comments': comments,
        'fails': fails,
        'is_idle': isIdle,
        'is_hypercube': isHypercube,
        'token': token
        }
    
          // split into jobs and idle pool time
  let calcTimesJobs = {
    'users': [],
    'instances': [],
    'pool_labels': [],
    'multipliers': [],
    'times': [],
    'comments': [],
    'fails': [],
    'is_hypercube': [],
    'token': []
    }

  let calcTimesPools = {
    'users': [],
    'instances': [],
    'pool_labels': [],
    'multipliers': [],
    'times': [],
    'comments': [],
    'fails': [],
    'is_hypercube': [],
    'token': []
    }

  calcTimes.is_idle.forEach(function (elem, i) {
    if (!elem) {
      calcTimesJobs.users.push(calcTimes.users[i])
      calcTimesJobs.instances.push(calcTimes.instances[i])
      calcTimesJobs.pool_labels.push(calcTimes.pool_labels[i])
      calcTimesJobs.multipliers.push(calcTimes.multipliers[i])
      calcTimesJobs.times.push(calcTimes.times[i])
      calcTimesJobs.comments.push(calcTimes.comments[i])
      calcTimesJobs.fails.push(calcTimes.fails[i])
      calcTimesJobs.is_hypercube.push(calcTimes.is_hypercube[i])
      calcTimesJobs.token.push(calcTimes.token[i])
    }
    else {
      calcTimesPools.users.push(calcTimes.users[i])
      calcTimesPools.instances.push(calcTimes.instances[i])
      calcTimesPools.pool_labels.push(calcTimes.pool_labels[i])
      calcTimesPools.multipliers.push(calcTimes.multipliers[i])
      calcTimesPools.times.push(calcTimes.times[i])
      calcTimesPools.comments.push(calcTimes.comments[i])
      calcTimesPools.fails.push(calcTimes.fails[i])
      calcTimesPools.is_hypercube.push(calcTimes.is_hypercube[i])
      calcTimesPools.token.push(calcTimes.token[i])
    }
  })

  const uniqueId = Array.from(Array(calcTimes.instances.length).keys()).map(el => `el_${el}`);

  let ungroupedDataJobs = []
  let ungroupedDataPools = []

  calcTimesJobs['instances'].forEach(function (elem, i) {
    ungroupedDataJobs.push({ uniqueId: uniqueId[i], user: calcTimesJobs.users[i], instances: elem, 
      pool_labels: calcTimesJobs.pool_labels[i], multipliers: calcTimesJobs.multipliers[i].toString(), 
      times: calcTimesJobs.times[i], comments: calcTimesJobs.comments[i], fails: calcTimesJobs.fails[i], 
      jobs: '1', is_hypercube: calcTimesJobs.is_hypercube[i], token: calcTimesJobs.token[i]})
  });



  calcTimesPools['instances'].forEach(function (elem, i) {
    ungroupedDataPools.push({ unique_id: uniqueId[i], user: calcTimesPools.users[i], instances: elem, 
      pool_labels: calcTimesPools.pool_labels[i], multipliers: calcTimesPools.multipliers[i].toString(), 
      times: calcTimesPools.times[i], comments: calcTimesPools.comments[i], fails: calcTimesPools.fails[i], 
      jobs: '1', is_hypercube: calcTimesPools.is_hypercube[i], token: calcTimesPools.token[i]})
  });

  const result = {
    'data_jobs': ungroupedDataJobs,
    'data_pools': ungroupedDataPools
  }

    return (
        result
    )
}

export default getComputationTimes
