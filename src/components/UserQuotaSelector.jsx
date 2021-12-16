import axios from "axios";
import React, { useState } from "react";
import { useContext } from "react";
import { useEffect } from "react";
import { Button } from "react-bootstrap";
import { AuthContext } from "../AuthContext";
import { AlertContext } from "./Alert";
import { calcRemainingQuota, getResponseError } from "./util";

const UserQuotaSelector = ({ quotas, quotaRemaining, quotaCurrent, setQuotas }) => {
    const [{ server, roles, username }] = useContext(AuthContext);
    const [, setAlertMsg] = useContext(AlertContext);
    const [quotaParallel, setQuotaParallel] = useState(quotas && quotas.parallel ? quotas.parallel : '');
    const [validQuotaParallel, setValidQuotaParallel] = useState(true);
    const [quotaVolume, setQuotaVolume] = useState(quotas && quotas.volume ? quotas.volume : '');
    const [validQuotaVolume, setValidQuotaVolume] = useState(true);
    const [quotaDisk, setQuotaDisk] = useState(quotas && quotas.disk ? quotas.disk : '');
    const [maxQuotas, setMaxQuotas] = useState({ parallel: 0, volume: 0, disk: 0 });
    const [maxQuotasInitialized, setMaxQuotasInitialized] = useState(false);
    const [remainingLive, setRemainingLive] = useState(null);
    const [validQuotaDisk, setValidQuotaDisk] = useState(true);

    useEffect(() => {
        const fetchQuotas = async () => {
            try {
                const resQuotas = await axios.get(`${server}/usage/quota`, {
                    params: { username: username }
                });
                if (resQuotas.status !== 200) {
                    setAlertMsg("Problems while retrieving user quotas. Please try again later.");
                    return;
                }
                const myQuotas = resQuotas.data.filter(quotaObj => quotaObj.username === username);
                if (myQuotas.length > 0) {
                    const myRemainingQuotas = calcRemainingQuota(myQuotas);
                    setMaxQuotas({
                        parallel: myQuotas[0].parallel_quota == null ? Infinity : myQuotas[0].parallel_quota,
                        volume: myRemainingQuotas.volume / 3600,
                        disk: myRemainingQuotas.disk / 1e6
                    });
                    setMaxQuotasInitialized(true);
                } else {
                    setMaxQuotas({ parallel: Infinity, volume: Infinity, disk: Infinity });
                    setMaxQuotasInitialized(true);
                }
            } catch (err) {
                setAlertMsg(`Problems while retrieving user quotas. Error message: ${getResponseError(err)}.`);
            }
        }
        if (roles.includes('admin')) {
            setMaxQuotas({ parallel: Infinity, volume: Infinity, disk: Infinity });
            setMaxQuotasInitialized(true);
        } else {
            fetchQuotas();
        }
    }, [server, username, roles, setAlertMsg]);

    useEffect(() => {
        if (quotas == null || maxQuotasInitialized !== true) {
            return;
        }
        const isValidQuota = (quota, maxQuota) => {
            const quotaFloat = parseFloat(quota);
            return !isNaN(quotaFloat) && isFinite(quotaFloat) && quotaFloat >= 0 && quotaFloat <= maxQuota;
        }
        setValidQuotaParallel(isValidQuota(quotas.parallel, maxQuotas.parallel));
        setValidQuotaDisk(isValidQuota(quotas.disk, maxQuotas.disk * 1e6));
        setValidQuotaVolume(isValidQuota(quotas.volume, maxQuotas.volume * 3600));
    }, [quotas, maxQuotas, maxQuotasInitialized])

    useEffect(() => {
        if (validQuotaParallel && validQuotaVolume && validQuotaDisk) {
            setQuotas({
                parallel: quotaParallel === '' ? null : quotaParallel,
                disk: quotaDisk === '' ? null : quotaDisk,
                volume: quotaVolume === '' ? null : quotaVolume
            })
        } else {
            setQuotas(null)
        }
    }, [validQuotaParallel, validQuotaVolume, validQuotaDisk,
        quotaParallel, quotaDisk, quotaVolume, setQuotas])

    useEffect(() => {
        if (quotaRemaining == null) {
            return;
        }
        const newDiskQuota = quotas == null || quotas.disk == null ? Infinity : quotas.disk;
        const newVolumeQuota = quotas == null || quotas.volume == null ? Infinity : quotas.volume;
        const currentDiskQuota = isFinite(quotaCurrent.disk) ? quotaCurrent.disk : 0;
        const currentVolumeQuota = isFinite(quotaCurrent.volume) ? quotaCurrent.volume : 0;
        setRemainingLive({
            disk: new Intl.NumberFormat('en-US', { style: 'decimal' }).format(Math.min(maxQuotas.disk, (quotaRemaining.disk + newDiskQuota - currentDiskQuota) / 1e6)),
            volume: new Intl.NumberFormat('en-US', { style: 'decimal' }).format(Math.min(maxQuotas.volume, (quotaRemaining.volume + newVolumeQuota - currentVolumeQuota) / 3600))
        })
    }, [quotaRemaining, quotaCurrent, quotas, maxQuotas])

    return <>
        <div className="form-group">
            <label htmlFor="quotaParallel">
                Parallel Quota (weighted parallel jobs)
                {isFinite(maxQuotas.parallel) && <Button
                    onClick={() => {
                        setQuotaParallel(maxQuotas.parallel);
                        setValidQuotaParallel(true);
                    }}
                    size="sm"
                    variant="link">
                    Set to max
                </Button>}
            </label>
            <div className="input-group">
                <input
                    type="number"
                    className={`form-control${validQuotaParallel ? '' : ' is-invalid'}`}
                    id="quotaParallel"
                    step="any"
                    min="0"
                    max={isFinite(maxQuotas.parallel) ? maxQuotas.parallel : ''}
                    value={quotaParallel}
                    onChange={e => {
                        if (!e.target.value) {
                            setValidQuotaParallel(true);
                            setQuotaParallel('');
                            return;
                        }
                        const val = parseFloat(e.target.value);
                        if (isNaN(val) || !isFinite(val) || val < 0 || val > maxQuotas.parallel) {
                            setValidQuotaParallel(false);
                            setQuotaParallel(val);
                            return;
                        }
                        setValidQuotaParallel(true);
                        setQuotaParallel(val);
                    }}
                />
                <div className="input-group-append">
                    <span className="input-group-text">
                        max: {new Intl.NumberFormat('en-US', { style: 'decimal' }).format(maxQuotas.parallel)}
                    </span>
                </div>
            </div>
        </div>
        <div className="form-group">
            <label htmlFor="quotaVolume">
                Volume Quota (weighted job hours)
                {isFinite(maxQuotas.volume) && <Button
                    onClick={() => {
                        setQuotaVolume(maxQuotas.volume * 3600);
                        setValidQuotaVolume(true);
                    }}
                    size="sm"
                    variant="link">
                    Set to max
                </Button>}
            </label>
            <div className="input-group">
                <input
                    type="number"
                    className={`form-control${validQuotaVolume ? '' : ' is-invalid'}`}
                    id="quotaVolume"
                    step="any"
                    min="0"
                    max={isFinite(maxQuotas.volume) ? maxQuotas.volume : ''}
                    value={quotaVolume === '' ? '' : Math.round(quotaVolume / 3.6) / 1000}
                    onChange={e => {
                        if (e.target.value == null || e.target.value === '') {
                            setValidQuotaVolume(true);
                            setQuotaVolume('');
                            return;
                        }
                        const val = parseFloat(e.target.value);
                        if (isNaN(val) || !isFinite(val) || val < 0 || val > maxQuotas.volume) {
                            setValidQuotaVolume(false);
                            setQuotaVolume(val * 3600);
                            return;
                        }
                        setValidQuotaVolume(true);
                        setQuotaVolume(val * 3600);
                    }}
                />
                <div className="input-group-append">
                    <span className="input-group-text">
                        {(remainingLive != null ? `remaining: ${remainingLive.volume}, ` : '') +
                            `max: ${new Intl.NumberFormat('en-US', { style: 'decimal' }).format(maxQuotas.volume)}`}
                    </span>
                </div>
            </div>
        </div>
        <div className="form-group">
            <label htmlFor="quotaDisk">
                Disk Space Quota (in MB)
                {isFinite(maxQuotas.disk) && <Button
                    onClick={() => {
                        setQuotaDisk(maxQuotas.disk * 1e6);
                        setValidQuotaDisk(true);
                    }}
                    size="sm"
                    variant="link">
                    Set to max
                </Button>}
            </label>
            <div className="input-group">
                <input
                    type="number"
                    className={`form-control${validQuotaDisk ? '' : ' is-invalid'}`}
                    id="quotaDisk"
                    step="any"
                    value={quotaDisk === '' ? '' : Math.round(quotaDisk / 1e3) / 1000}
                    min="0"
                    max={isFinite(maxQuotas.disk) ? maxQuotas.disk : '100000000'}
                    onChange={e => {
                        if (e.target.value == null || e.target.value === '') {
                            setValidQuotaDisk(true);
                            setQuotaDisk('');
                            return;
                        }
                        const val = parseFloat(e.target.value);
                        if (isNaN(val) || !isFinite(val) || val < 0 || val > maxQuotas.disk) {
                            setValidQuotaDisk(false);
                            setQuotaDisk(val * 1e6);
                            return;
                        }
                        setValidQuotaDisk(true);
                        setQuotaDisk(val * 1e6);
                    }}
                />
                <div className="input-group-append">
                    <span className="input-group-text">
                        {(remainingLive != null ? `remaining: ${remainingLive.disk}, ` : '') +
                            `max: ${new Intl.NumberFormat('en-US', { style: 'decimal' }).format(maxQuotas.disk)}`}
                    </span>
                </div>
            </div>
        </div>
    </>
}

export default UserQuotaSelector;
