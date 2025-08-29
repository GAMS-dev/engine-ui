function getComputationTimes(data, calcStartTime, calcEndTime, quotaConversionFactor) {
    const debug = false

    // extract the three different job types
    const dataJobUsage = data['job_usage'] == null ? [] : data['job_usage'];
    const dataPoolUsage = data['pool_usage'] == null ? [] : data['pool_usage'];
    const dataHypercube = data['hypercube_job_usage'] == null ? [] : data['hypercube_job_usage'];

    // first extract all the pool infos, to later check if an individual job was part of a pool
    // only need the idle multiplier from the pools
    // for the jobs use the multiplier from the jop instance
    let dataPoolUsageNEW = dataPoolUsage.map(pool => (
        {
            pool_label: pool['label'],
            instance: pool['instance']['label'],
            user: pool['owner']['username'],
            multiplier: pool['instance']['multiplier_idle'],
            times: pool['times'],
            fails: 0,
            included: false,
            created_at: new Date(pool['created_at']),
            deleted_at: pool['deleted_at'] == null ? calcEndTime : new Date(pool['deleted_at'])
        }
    ));

    // check if workers failed, if so keep the first start time and set the finish time
    // to the last occurence of that particular worker
    // simultaneously keep track of the number of fails
    dataPoolUsageNEW = dataPoolUsageNEW.map((pool) => {
        const workerTimes = {};
        pool['times'].forEach((workerStats) => {
            // if a worker_id has already been added to workerTimes, update finish time
            if (workerTimes.hasOwnProperty(workerStats['worker_id'])) {
                workerTimes[workerStats['worker_id']]['finish'] = workerStats['finish'];
                pool.fails += 1;
            } else {
                workerTimes[workerStats['worker_id']] = workerStats;
            }
            // no return, because times gets overwritten at the end, otherwise it would produce duplicates
        });
        pool['times'] = Object.values(workerTimes);
        return pool;
    });

    // compute the whole time workers existed on the pool
    // (and didn't fail because those workers are already removed)
    dataPoolUsageNEW = dataPoolUsageNEW.map((pool, i) => {
        pool['times'] = pool['times'].reduce(function (accumulator, times) {
            let startTime = new Date(times['start']);
            let finishTime = calcEndTime;
            // check if the worker is still running
            if (times['finish'] != null) {
                finishTime = new Date(times['finish']);
            }
            else if (dataPoolUsage[i]['deleted_at'] != null) {
                finishTime = new Date(dataPoolUsage[i]['deleted_at']);
                if (debug) console.log('There is no finish time, but the job was finished!!');
            }
            else {
                finishTime = calcEndTime;
                if (debug) console.log(`A worker on ${pool['pool_label']} is still running. `);
            }
            // only include the parts of the worker times that are in the given timeframe
            if (startTime >= calcStartTime && finishTime <= calcEndTime) {
                return accumulator + (finishTime - startTime);
            }
            // both can't be inside anymore, so check which one is outside, or if both are outside
            else if (calcStartTime <= finishTime && finishTime <= calcEndTime) {
                return accumulator + (finishTime - calcStartTime);
            }
            else if (calcStartTime <= startTime && startTime <= calcEndTime) {
                return accumulator + (calcEndTime - startTime);
            }
            else if (startTime <= calcStartTime && calcEndTime <= finishTime) {
                return accumulator + (calcEndTime - calcStartTime);
            }
            return accumulator
        }, 0);
        return pool
    })

    // if a pool now has no time, it wasn't active during the timeframe
    dataPoolUsageNEW = dataPoolUsageNEW.filter((pool) => pool['times'] !== 0)

    // extract the necessary job data
    let dataJobUsageNEW = dataJobUsage.map(job => {
        return {
            instance: job?.labels?.instance??'default',
            user: job['username'],
            multiplier: job?.labels?.multiplier??1,
            times: job['times'],
            fails: 0,
            pool_label: null,
            included: false,
            start_time: new Date(job['submitted']),
            token: job['token'],
            is_hypercube: false
        }
    });

    // Use map to transform each hypercube into an array of job objects
    // flatten it so its no loner ordered by hypercubes
    // this way it can just be conbined with the job list (depth one always is enough here)
    let dataHypercubeNEW = dataHypercube.flatMap(function (hypercube) {
        // Map each job to a new object containing the relevant information
        return hypercube['jobs'].map((job) => (
            {
                instance: hypercube['labels']['instance'],
                user: hypercube['username'],
                multiplier: hypercube['labels']['multiplier'],
                times: job['times'],
                fails: 0,
                pool_label: null,
                included: false,
                start_time: new Date(hypercube['submitted']),
                token: hypercube['token'],
                is_hypercube: true
            }
        ));

    });

    dataJobUsageNEW = dataJobUsageNEW.concat(dataHypercubeNEW)

    // check which jobs are in the timeframe and compute their run time
    dataJobUsageNEW = dataJobUsageNEW.map((job, i) => {
        if (job['times'].length !== 0) {
            job['fails'] += job['times'].length - 1;
            // always take the last element, so it also works if the job crashed before
            let startTime = new Date(job['times'][job['times'].length - 1]['start']);
            // check if the job is still running
            let finishTime = calcEndTime;
            if (job['times'][job['times'].length - 1]['finish']) {
                finishTime = new Date(job['times'][job['times'].length - 1]['finish']);
            }
            else if (dataJobUsage[i]['finished'] != null) {
                finishTime = new Date(dataJobUsage[i]['finished'])
                if (debug) console.log('There is no finish time, but the job was finished!!')
            }
            else {
                finishTime = calcEndTime;
                if (debug) console.log('The job is still running. ');
            }

            // check if the whole job was run in the timeframe
            if (startTime >= calcStartTime && finishTime <= calcEndTime) {
                job['included'] = true;
                job['times'] = finishTime - startTime;
            }
            // or if it finished during the timeframe
            else if (calcStartTime <= finishTime && finishTime <= calcEndTime) {
                job['included'] = true;
                job['times'] = finishTime - calcStartTime;
            }
            // or finally if it started during the timeframe
            else if (calcStartTime <= startTime && startTime <= calcEndTime) {
                job['included'] = true;
                job['times'] = calcEndTime - startTime;
            }
            // or if it ran over the whole timeframe
            else if (startTime <= calcStartTime && calcEndTime <= finishTime) {
                job['included'] = true;
                job['times'] = calcEndTime - calcStartTime;
            }
            // add debugg option:
            // if debug=True this case should not happen, because no job outside of the timeframe
            // should be in the json object
            else {
                if (debug) console.error('Found job outside of the timeframe, even though this should not happen!');
                job['times'] = 0
            }
        }
        // jobs that where canceld while the instance was generated
        else {
            job['included'] = true;
            job['times'] = 0;
        }
        return job
    });

    // substract the jobs corresponding to a pool (depends on label and timing)
    // so that the totalWorkerTime is substracted by the actual run time
    // and only the idle time is left
    dataJobUsageNEW = dataJobUsageNEW.map((job) => {
        if (job['included']) {
            // find the corresponding pool, if no pool fits the job is processed as a normal job
            const index = dataPoolUsageNEW.findIndex(pool => pool['pool_label'] === job['instance'] &&
                (pool['created_at'] <= job['start_time'] && job['start_time'] <= pool['deleted_at']))
            if (index !== -1) {
                dataPoolUsageNEW[index]['times'] -= job['times'];
                job['pool_label'] = job['instance'];
                job['instance'] = dataPoolUsageNEW[index]['instance']
            }
        }
        return job
    });

    // pools are already filtered
    dataJobUsageNEW = dataJobUsageNEW.filter((job) => job['included'])

    dataJobUsageNEW = dataJobUsageNEW.map((job, i) => {
        job['unique_id'] = `el_${i}`;
        job['jobs'] = '1';
        job['cost'] = (job['times'] * job['multiplier']) / 1000;
        job['cost'] = job['cost'] / quotaConversionFactor;
        return job
    })

    dataPoolUsageNEW = dataPoolUsageNEW.map((pool, i) => {
        pool['unique_id'] = `el_${i}`;
        pool['jobs'] = '1';
        pool['cost'] = pool['times'] * pool['multiplier'] / 1000;
        pool['cost'] = pool['cost'] / quotaConversionFactor;
        return pool
    })

    const numberUsers = new Set(dataJobUsageNEW.concat(dataPoolUsageNEW).map(elem => elem.user)).size;
    const numberInstances = new Set(dataJobUsageNEW.concat(dataPoolUsageNEW).map(elem => elem.instance)).size;

    const numberPools = new Set(dataPoolUsageNEW.map(elem => elem.pool_label)).size;

    const result = {
        'data_jobs': dataJobUsageNEW,
        'data_pools': dataPoolUsageNEW,
        'num_users': numberUsers,
        'num_instances': numberInstances,
        'num_pools': numberPools
    }

    return (result)
}

export default getComputationTimes
