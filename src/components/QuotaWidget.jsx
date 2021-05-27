import React, { useContext, useState, useRef, useEffect } from "react";
import { AuthContext } from "../AuthContext";
import axios from "axios";
import { getResponseError } from "./util";
import { OverlayTrigger, Tooltip } from "react-bootstrap";
import ClipLoader from "react-spinners/ClipLoader";
import { Server } from "react-feather";


const QuotaWidget = () => {
    const [{ server, username }] = useContext(AuthContext);

    const [showTT, setShowTT] = useState(false);
    const [data, setData] = useState([]);
    const target = useRef(null);

    useEffect(() => {
        const updateData = async () => {
            try {
                const result = await axios.get(
                    `${server}/usage/quota`,
                    { params: { username: username } }
                );
                if (result.data && result.data.length) {
                    const volumeLeft = Math.min(...result.data
                        .map(el => (el.volume_quota == null ? Infinity : el.volume_quota) - el.volume_used));
                    const diskLeft = Math.min(...result.data
                        .map(el => Math.round(((el.disk_quota == null ? Infinity : el.disk_quota) - el.disk_used) / 1e4) / 100));
                    setData([{
                        key: 'volume',
                        text: `Volume: ${volumeLeft === Infinity ? 'unlimited' : volumeLeft}\n`,
                        val: volumeLeft < 10000 ? 'text-danger' : ''
                    },
                    {
                        key: 'disk',
                        text: `Disk: ${diskLeft === Infinity ? 'unlimited' : diskLeft + 'MB'}`,
                        className: diskLeft < 100 ? 'text-danger' : ''
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
                setData([`Problems fetching quota data. Error message: ${getResponseError(err)}`]);
            }
        }
        if (showTT) {
            updateData();
        }
    }, [server, username, showTT])

    return (
        <>
            <OverlayTrigger
                placement="right"
                show={showTT}
                onToggle={() => setShowTT(!showTT)}
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
