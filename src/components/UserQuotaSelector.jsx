import axios from "axios";
import React, { useState } from "react";
import { useContext } from "react";
import { useEffect } from "react";
import { Button } from "react-bootstrap";
import { AuthContext } from "../AuthContext";
import { AlertContext } from "./Alert";
import { calcRemainingQuota, getResponseError } from "./util";
import { UserSettingsContext } from "./UserSettingsContext";

const UserQuotaSelector = ({ quotas, quotaData, userToEdit, setQuotas }) => {
    const [{ server, roles, username }] = useContext(AuthContext);
    const [, setAlertMsg] = useContext(AlertContext);
    const [userSettings] = useContext(UserSettingsContext);
    const [quotaParallel, setQuotaParallel] = useState(quotas != null && quotas.parallel != null ? quotas.parallel : '');
    const [validQuotaParallel, setValidQuotaParallel] = useState(true);
    const [quotaVolume, setQuotaVolume] = useState(quotas != null && quotas.volume != null ? quotas.volume / userSettings.quotaConversionFactor : '');
    const [validQuotaVolume, setValidQuotaVolume] = useState(true);
    const [quotaDisk, setQuotaDisk] = useState(quotas != null && quotas.disk != null ? quotas.disk : '');
    const [maxQuotas, setMaxQuotas] = useState({ parallel: 0, volume: 0, disk: 0 });
    const [maxQuotasInitialized, setMaxQuotasInitialized] = useState(false);
    const [quotaDataInternal, setQuotaDataInternal] = useState(quotaData);
    const [remainingLive, setRemainingLive] = useState(null);
    const [validQuotaDisk, setValidQuotaDisk] = useState(true);

    useEffect(() => {
        if (quotas != null) {
            setQuotaParallel(quotas.parallel);
            setQuotaVolume(quotas.volume);
            setQuotaDisk(quotas.disk);
        }
    }, [quotas])

    const getBindingQuotas = (quotaArray) => {
        const maxQuotasTmp = { parallel_quota: Infinity, volume_quota: Infinity, disk_quota: Infinity };
        quotaArray.forEach(quotaObj => {
            ['parallel_quota', 'volume_quota', 'disk_quota'].forEach(quotaKey => {
                if (quotaObj[quotaKey] != null && maxQuotasTmp[quotaKey] > quotaObj[quotaKey]) {
                    maxQuotasTmp[quotaKey] = quotaObj[quotaKey];
                }
            });
        });
        return maxQuotasTmp;
    }

    useEffect(() => {
        if (userToEdit != null) {
            const maxQuotasTmp = getBindingQuotas(quotaData.filter(quotaObj => quotaObj.username !== userToEdit));
            setMaxQuotas({
                parallel: maxQuotasTmp.parallel_quota,
                volume: maxQuotasTmp.volume_quota / userSettings.quotaConversionFactor,
                disk: maxQuotasTmp.disk_quota / 1e6
            });
            setMaxQuotasInitialized(true);
            return;
        }
        const fetchQuotas = async () => {
            try {
                const resQuotas = await axios.get(`${server}/usage/quota`, {
                    params: { username: username }
                });
                setQuotaDataInternal(resQuotas.data);
                if (resQuotas.data.length > 0) {
                    const maxQuotasTmp = getBindingQuotas(resQuotas.data);
                    setMaxQuotas({
                        parallel: maxQuotasTmp.parallel_quota,
                        volume: maxQuotasTmp.volume_quota / userSettings.quotaConversionFactor,
                        disk: maxQuotasTmp.disk_quota / 1e6
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
    }, [server, username, quotaData, userToEdit, roles, setAlertMsg, userSettings]);

    useEffect(() => {
        if (quotas == null || maxQuotasInitialized !== true) {
            return;
        }
        const isValidQuota = (quota, maxQuota) => {
            if (quota == null || quota === '') {
                return true;
            }
            const quotaFloat = parseFloat(quota);
            return !isNaN(quotaFloat) && isFinite(quotaFloat) && quotaFloat >= 0 && quotaFloat <= maxQuota;
        }
        setValidQuotaParallel(isValidQuota(quotas.parallel, maxQuotas.parallel));
        setValidQuotaDisk(isValidQuota(quotas.disk, maxQuotas.disk * 1e6));
        setValidQuotaVolume(isValidQuota(quotas.volume, maxQuotas.volume * userSettings.quotaConversionFactor));
    }, [quotas, maxQuotas, maxQuotasInitialized, userSettings])

    useEffect(() => {
        if (validQuotaParallel && validQuotaVolume && validQuotaDisk) {
            setQuotas({
                parallel: quotaParallel === '' ? null : quotaParallel,
                disk: quotaDisk === '' ? null : quotaDisk,
                volume: quotaVolume === '' ? null : quotaVolume * userSettings.quotaConversionFactor
            })
        } else {
            setQuotas(null)
        }
    }, [validQuotaParallel, validQuotaVolume, validQuotaDisk,
        quotaParallel, quotaDisk, quotaVolume, setQuotas, userSettings])

    useEffect(() => {
        if (quotaDataInternal == null) {
            return;
        }
        const newDiskQuota = quotas == null || quotas.disk == null ? Infinity : quotas.disk;
        const newVolumeQuota = quotas == null || quotas.volume == null ? Infinity : quotas.volume;
        let quotaDataNew = JSON.parse(JSON.stringify(quotaDataInternal));
        if (quotaDataNew.filter(quotaObj => quotaObj.username === userToEdit).length === 0) {
            quotaDataNew = [{ disk_quota: null, disk_used: 0, volume_quota: null, volume_used: 0 }].concat(quotaDataNew);
        }
        if (quotaDataNew != null && quotaDataNew.length > 0) {
            quotaDataNew[0].disk_quota = newDiskQuota;
            quotaDataNew[0].volume_quota = newVolumeQuota;
        }
        const quotaRemaining = calcRemainingQuota(quotaDataNew);
        setRemainingLive({
            disk: new Intl.NumberFormat('en-US', { style: 'decimal' }).format(Math.min(maxQuotas.disk, quotaRemaining.disk / 1e6)),
            volume: new Intl.NumberFormat('en-US', { style: 'decimal' }).format(Math.min(maxQuotas.volume, quotaRemaining.volume / userSettings.quotaConversionFactor))
        })
    }, [quotaDataInternal, userToEdit, quotas, maxQuotas, userSettings])

    return <>
        <div className="mb-3">
            <label htmlFor="quotaParallel">
                Parallel Quota (in {userSettings.multiplierUnit})
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
        <div className="mb-3">
            <label htmlFor="quotaVolume">
                Volume Quota (in {userSettings.quotaUnit})
                {isFinite(maxQuotas.volume) && <Button
                    onClick={() => {
                        setQuotaVolume(maxQuotas.volume);
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
                    value={quotaVolume === '' ? '' : quotaVolume}
                    onChange={e => {
                        if (e.target.value == null || e.target.value === '') {
                            setValidQuotaVolume(true);
                            setQuotaVolume('');
                            return;
                        }
                        const val = parseFloat(e.target.value);
                        if (isNaN(val) || !isFinite(val) || val < 0 || val > maxQuotas.volume) {
                            setValidQuotaVolume(false);
                            setQuotaVolume(val);
                            return;
                        }
                        setValidQuotaVolume(true);
                        setQuotaVolume(val);
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
        <div className="mb-3">
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
