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
    if (accumulatedFileSize > 10e7) {
        throw EvalError("Engine UI does not support uploading individual files larger than 100MB. Please zip the files first and try uploading the zip archive instead.");
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
const getQuotaWarningMessage = (quotaWarningData, quotaUnit, quotaConversionFactor) => {
    const remainingQuota = calcRemainingQuota(quotaWarningData);
    const remainingVolumeStr = `${new Intl.NumberFormat('en-US', { style: 'decimal' }).format(remainingQuota.volume/quotaConversionFactor)} ${quotaUnit}`
    const remainingDiskStr = formatFileSize(remainingQuota.disk);
      return <><strong>Quota warning</strong>
          {Number.isFinite(remainingQuota.volume) ? <div>Remaining <span className="fst-italic">volume</span> quota: {remainingVolumeStr}</div> : <></>}
          {Number.isFinite(remainingQuota.disk) ? <>Remaining <span className="fst-italic">disk</span> quota: {remainingDiskStr}</>: <></>}
    </>
}
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
    const instancePoolDataPromise = axios.get(`${server}/usage/pools/${encodeURIComponent(username)}`);
    const instanceDataPromise = axios.get(`${server}/usage/instances/${encodeURIComponent(username)}`);
    const defaultInstanceDataPromise = axios.get(`${server}/usage/instances/${encodeURIComponent(username)}/default`);
    const defaultInstanceData = await defaultInstanceDataPromise;
    const instanceData = await instanceDataPromise;
    const instancePoolData = await instancePoolDataPromise;
    const availableInstancesTmp = instanceData.data.instances_available
        .concat(instancePoolData.data.instance_pools_available.map(
            el => {
                const newEl = el;
                newEl['is_pool'] = true;
                return newEl;
            }
        ))
        .sort((a, b) => ('' + a.label).localeCompare(b.label));
    return {
        instances: availableInstancesTmp, default: defaultInstanceData.data.default_instance?.label,
        rawResourceRequestsAllowed: instanceData.data.instances_inherited_from == null,
        inheritedFrom: instanceData.data.instances_inherited_from,
        defaultInheritedFrom: defaultInstanceData.data.default_inherited_from
    }
}
const formatInstancesSelectInput = (instances, multiplierUnit) => {
    const formatLabel = (label, instance) => (
        `${label} (${instance.cpu_request} vCPU, ${new Intl.NumberFormat('en-US', { style: 'decimal' }).format(instance.memory_request)} MiB RAM, ${new Intl.NumberFormat('en-US', { style: 'decimal' }).format(instance.multiplier)}${multiplierUnit})`
    )
    return instances
        .filter(instance => instance.cancelling !== true)
        .map(instance => ({
            value: instance.label,
            multiplier: instance.multiplier,
            label: instance.is_pool === true ? (
                <>
                    <Layers size={12} />
                    <span style={{ paddingLeft: "5px" }}>{formatLabel(instance.label, instance.instance)}</span>
                </>
            ) : formatLabel(instance.label, instance)
        }))
        .sort((a, b) => ('' + a.label).localeCompare(b.label))
}
const formatDurationString = (duration) => {
  if (duration > 3600) {
    return `${new Intl.NumberFormat('en-US', { style: 'decimal' }).format(duration / 3600)}h`
  }
  return `${new Intl.NumberFormat('en-US', { style: 'decimal' }).format(duration)}s`
}
const getEventsString = (events, parameterized_events) => {
    let eventsStr = events == null ? '' : events.join(',');
    if (parameterized_events?.length > 0) {
        eventsStr += (eventsStr === '' ? '' : ',') +
            parameterized_events.map(el => `${el.event}=${el.parameters.join(',')}`).join(',')
    }
    return eventsStr;
}
const urlB64ToUint8Array = (base64String) => {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
        .replace(/-/g, '+')
        .replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}
const getRandomInt = (max) => {
    return Math.floor(Math.random() * max);
}
const isMobileDevice = function () {
    let check = false;
    (function (a) { if (/(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows ce|xda|xiino|android|ipad|playbook|silk/i.test(a) || /1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw-(n|u)|c55\/|capi|ccwa|cdm-|cell|chtm|cldc|cmd-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc-s|devi|dica|dmob|do(c|p)o|ds(12|-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(-|_)|g1 u|g560|gene|gf-5|g-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd-(m|p|t)|hei-|hi(pt|ta)|hp( i|ip)|hs-c|ht(c(-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i-(20|go|ma)|i230|iac( |-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|-[a-w])|libw|lynx|m1-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|-([1-8]|c))|phil|pire|pl(ay|uc)|pn-2|po(ck|rt|se)|prox|psio|pt-g|qa-a|qc(07|12|21|32|60|-[2-7]|i-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h-|oo|p-)|sdk\/|se(c(-|0|1)|47|mc|nd|ri)|sgh-|shar|sie(-|m)|sk-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h-|v-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl-|tdg-|tel(i|m)|tim-|t-mo|to(pl|sh)|ts(70|m-|m3|m5)|tx-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas-|your|zeto|zte-/i.test(a.substr(0, 4))) check = true; })(navigator.userAgent || navigator.vendor || window.opera);
    return check;
};
export {
    zipAsync, isActiveJob, getResponseError, calcRemainingQuota, mergeSortedArrays,
    formatFileSize, getInstanceData, formatInstancesSelectInput, getEventsString,
    urlB64ToUint8Array, getRandomInt, isMobileDevice, getQuotaWarningMessage,
    formatDurationString
}
