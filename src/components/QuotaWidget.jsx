import React, { useContext, useState, useEffect } from "react";
import { AuthContext } from "../AuthContext";
import axios from "axios";
import { calcRemainingQuota, formatFileSize, getResponseError } from "./util";
import ClipLoader from "react-spinners/ClipLoader";
import { Cpu, HardDrive } from "react-feather";
import { quotaWarningThresholds } from "./constants";
import { UserSettingsContext } from "./UserSettingsContext";


const QuotaWidget = ({ isVisible, className }) => {
    const [userSettings,] = useContext(UserSettingsContext)
    const [{ server, username }] = useContext(AuthContext);

    const [data, setData] = useState([]);

    useEffect(() => {
        const cancelTokenSource = axios.CancelToken.source();
        const updateData = async () => {
            try {
                const result = await axios({
                    url: `${server}/usage/quota`,
                    method: "GET",
                    params: { username: username },
                    cancelToken: cancelTokenSource.token
                });
                if (result.data && result.data.length) {
                    const quotaRemaining = calcRemainingQuota(result.data);
                    const quotaFormatted = {
                        volume: quotaRemaining.volume / userSettings.quotaConversionFactor,
                        disk: formatFileSize(quotaRemaining.disk),
                        unitVolume: userSettings.quotaUnit,
                    }
                    quotaFormatted.volume = `${new Intl.NumberFormat('en-US', { style: 'decimal' }).format(quotaFormatted.volume)}${quotaFormatted.unitVolume}`;
                    setData([{
                        key: 'volume',
                        title: 'Volume quota',
                        icon: <Cpu size={14} />,
                        text: `: ${quotaRemaining.volume === Infinity ? 'unlimited' : quotaFormatted.volume}\n`,
                        className: quotaRemaining.volume < quotaWarningThresholds.volume ? 'text-danger' : ''
                    },
                    {
                        key: 'disk',
                        title: 'Disk quota',
                        icon: <HardDrive size={14} />,
                        text: `: ${quotaRemaining.disk === Infinity ? 'unlimited' : quotaFormatted.disk}`,
                        className: quotaRemaining.disk < quotaWarningThresholds.disk ? 'text-danger' : ''
                    }]);
                } else {
                    setData([{
                        key: 'volume',
                        title: 'Volume quota',
                        icon: <Cpu size={14} />,
                        text: ': unlimited\n',
                        val: ''
                    },
                    {
                        key: 'disk',
                        title: 'Disk quota',
                        icon: <HardDrive size={14} />,
                        text: ': unlimited',
                        className: ''
                    }]);
                }
            }
            catch (err) {
                if (!axios.isCancel(err)) {
                    setData([`Problems fetching quota data. Error message: ${getResponseError(err)}`]);
                }
            }
        }
        if (isVisible !== false) {
            updateData();
        }
        return () => {
            cancelTokenSource.cancel()
        }
    }, [server, username, isVisible, userSettings])

    return (data ?
        <span className="pre-line">
            <small className={`${className == null ? '' : className} pb-0`}>Quotas:</small>
            {data.map(quotaEl =>
                <span key={quotaEl.key}
                    className={`${className == null ? '' : className} ${quotaEl.className}`}
                    title={quotaEl.title}>
                    {quotaEl.icon}{quotaEl.text}
                </span>)}
        </span> :
        <ClipLoader size={12} />)
};

export default QuotaWidget;
