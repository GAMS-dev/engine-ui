import axios from "axios";
import JSZip from "jszip";
import { Layers } from "react-feather";

const getResponseError = err => {
    if (!navigator.onLine) {
        return "You are not connected to the internet."
    }
    if (err.response && err.response.data && err.response.data.message) {
        return err.response.data.message
    }
    return err.message
}

const zipAsync = filesToZip => {
    if (!JSZip.support.blob) {
        throw EvalError("Your browser does not support zipping files. Please zip the files first and try to upload the zip archive instead.");
    }
    if (filesToZip.length > 200) {
        throw EvalError("Engine UI does not support uploading more than 200 individual files! Please zip the files first and try to upload the zip archive instead.");
    }
    let accumulatedFileSize = 0;
    for (let i = 0; i < filesToZip.length; i++) {
        accumulatedFileSize += filesToZip[i].size;
    }
    if (accumulatedFileSize > 10e6) {
        throw EvalError("Engine UI does not support uploading individual files larger than 10MB. Please zip the files first and try uploading the zip archive instead.");
    }
    const dataZip = new JSZip();
    for (let i = 0; i < filesToZip.length; i++) {
        const f = filesToZip[i];
        dataZip.file(f.name, f);
    }
    return dataZip.generateAsync({ type: "blob", platform: "UNIX" },
        function updateCallback(metadata) {
            console.log(metadata.percent.toFixed(2) + " %");
        });
}
const isActiveJob = (status) => status < 10 && (status === -2 || status === -10 || status >= 0)

const calcRemainingQuotaInternal = (quotaObj, quotaKey, usedKey, noQuotaVal = Infinity) =>
    Math.min(...quotaObj
        .map(el => (el[quotaKey] == null ? noQuotaVal : el[quotaKey]) - el[usedKey]))

const calcRemainingQuota = (data, noQuotaVal = Infinity) => ({
    volume: calcRemainingQuotaInternal(data, "volume_quota", "volume_used", noQuotaVal),
    disk: calcRemainingQuotaInternal(data, "disk_quota", "disk_used", noQuotaVal)
})
const mergeSortedArrays = (arraysToMerge, comparisonFunction) => {
    const mergeInner = (arrL, arrR, comparisonFunction) => {
        if (arrR == null) {
            return arrL;
        }
        const arrLen = arrL.length + arrR.length;
        const retArr = new Array(arrLen);
        let ptrL = 0;
        let ptrR = 0;
        while (ptrL + ptrR < arrLen) {
            if (ptrL < arrL.length && (ptrR === arrR.length || comparisonFunction(arrL[ptrL], arrR[ptrR]) <= 0)) {
                retArr[ptrL + ptrR] = arrL[ptrL];
                ptrL++;
            } else {
                retArr[ptrL + ptrR] = arrR[ptrR];
                ptrR++;
            }
        }
        return retArr;
    }
    if (arraysToMerge.length === 0) {
        return [];
    }
    while (arraysToMerge.length > 1) {
        let arrTmp = [];
        for (let i = 0; i < arraysToMerge.length; i += 2) {
            arrTmp.push(mergeInner(arraysToMerge[i], arraysToMerge[i + 1], comparisonFunction));
        }
        arraysToMerge = arrTmp;
    }
    return arraysToMerge[0];
}

const formatFileSize = (fileSize) => {
    if (fileSize < 1e6) {
        return `${(fileSize / 1e3).toFixed(2)}KB`;
    }
    if (fileSize < 1e9) {
        return `${(fileSize / 1e6).toFixed(2)}MB`;
    }
    return `${(fileSize / 1e9).toFixed(2)}GB`;
}

const getInstanceData = async (server, username) => {
    const instanceData = await axios.get(`${server}/usage/instances/${encodeURIComponent(username)}`);
    const availableInstancesTmp = instanceData.data.instances_available
        .sort((a, b) => ('' + a.label).localeCompare(b.label));
    return {
        instances: availableInstancesTmp, default: instanceData.data.default_instance?.label,
        rawResourceRequestsAllowed: instanceData.data.instances_inherited_from == null,
        inheritedFrom: instanceData.data.instances_inherited_from,
        defaultInheritedFrom: instanceData.data.default_inherited_from
    }
}
const formatInstancesSelectInput = (instances) => {
    const formatLabel = (instance) => (
        `${instance.label} (${instance.cpu_request} vCPU, ${new Intl.NumberFormat('en-US', { style: 'decimal' }).format(instance.memory_request)} MiB RAM, ${instance.multiplier}x)`
    )
    return instances
        .filter(instance => instance.pool_cancelling !== true)
        .map(instance => ({
            value: instance.label,
            label: instance.is_pool === true ? (
                <>
                    <Layers size={12} />
                    <span style={{ paddingLeft: "5px" }}>{formatLabel(instance)}</span>
                </>
            ) : formatLabel(instance)
        }))
        .sort((a, b) => ('' + a.label).localeCompare(b.label))
}
export { zipAsync, isActiveJob, getResponseError, calcRemainingQuota, mergeSortedArrays, formatFileSize, getInstanceData, formatInstancesSelectInput }
