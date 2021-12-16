import React, { useContext, useState, useRef, useEffect } from "react";
import { AuthContext } from "../AuthContext";
import axios from "axios";
import { calcRemainingQuota, getResponseError } from "./util";
import { OverlayTrigger, Tooltip } from "react-bootstrap";
import ClipLoader from "react-spinners/ClipLoader";
import { Server } from "react-feather";


const QuotaWidget = () => {
    const [{ server, username }] = useContext(AuthContext);

    const [showTT, setShowTT] = useState(false);
    const [data, setData] = useState([]);
    const target = useRef(null);

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
                if (!showTT) {
                    return;
                }
                if (result.data && result.data.length) {
                    const quotaRemaining = calcRemainingQuota(result.data);
                    setData([{
                        key: 'volume',
                        text: `Volume: ${quotaRemaining.volume === Infinity ? 'unlimited' : new Intl.NumberFormat('en-US', { style: 'decimal' }).format(quotaRemaining.volume / 3600) + 'h'}\n`,
                        val: quotaRemaining.volume < 10000 ? 'text-danger' : ''
                    },
                    {
                        key: 'disk',
                        text: `Disk: ${quotaRemaining.disk === Infinity ? 'unlimited' : new Intl.NumberFormat('en-US', { style: 'decimal' }).format(quotaRemaining.disk / 1e6) + 'MB'}`,
                        className: quotaRemaining.disk < 100 ? 'text-danger' : ''
                    }]);
                } else {
                    setData([{
                        key: 'volume',
                        text: 'Volume: unlimited\n',
                        val: ''
                    },
                    {
                        key: 'disk',
                        text: 'Disk: unlimited',
                        className: ''
                    }]);
                }
            }
            catch (err) {
                if (!!!axios.isCancel(err)) {
                    setData([`Problems fetching quota data. Error message: ${getResponseError(err)}`]);
                }
            }
        }
        if (showTT) {
            updateData();
        }
        return () => {
            cancelTokenSource.cancel()
        }
    }, [server, username, showTT])

    return (
        <>
            <OverlayTrigger
                placement="right"
                show={showTT}
                onToggle={show => setShowTT(show)}
                delay={{ hide: 600 }}
                overlay={
                    <Tooltip id="quota-tooltip">
                        {data ?
                            <span className="pre-line">
                                {data.map(quotaEl =>
                                    <span key={quotaEl.key}
                                        className={quotaEl.className}>
                                        {quotaEl.text}
                                    </span>)}
                            </span> :
                            <ClipLoader size={12} />}
                    </Tooltip>
                }
            >
                <span ref={target} id="quota-icon"><Server size={12} /></span>
            </OverlayTrigger>
        </>
    );
};

export default QuotaWidget;
