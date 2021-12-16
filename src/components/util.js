import JSZip from "jszip";

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
export { zipAsync, isActiveJob, getResponseError, calcRemainingQuota }
