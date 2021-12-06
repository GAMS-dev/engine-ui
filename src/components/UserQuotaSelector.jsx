import React, { useState } from "react";
import { useEffect } from "react";

const UserQuotaSelector = ({ quotas, setQuotas }) => {
    const [quotaParallel, setQuotaParallel] = useState(quotas && quotas.parallel ? quotas.parallel : '');
    const [validQuotaParallel, setValidQuotaParallel] = useState(true);
    const [quotaVolume, setQuotaVolume] = useState(quotas && quotas.volume ? quotas.volume : '');
    const [validQuotaVolume, setValidQuotaVolume] = useState(true);
    const [quotaDisk, setQuotaDisk] = useState(quotas && quotas.disk ? quotas.disk : '');
    const [validQuotaDisk, setValidQuotaDisk] = useState(true);

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

    return <>
        <div className="form-group">
            <label htmlFor="quotaParallel">
                Parallel Quota (weighted parallel jobs)
            </label>
            <input
                type="number"
                className={`form-control${validQuotaParallel ? '' : ' is-invalid'}`}
                id="quotaParallel"
                step="any"
                value={quotaParallel}
                onChange={e => {
                    if (!e.target.value) {
                        setValidQuotaParallel(true);
                        setQuotaParallel('');
                        return;
                    }
                    const val = parseFloat(e.target.value);
                    if (isNaN(val) || !isFinite(val) || val < 0) {
                        setValidQuotaParallel(false);
                        setQuotaParallel(val);
                        return;
                    }
                    setValidQuotaParallel(true);
                    setQuotaParallel(val);
                }}
            />
        </div>
        <div className="form-group">
            <label htmlFor="quotaVolume">
                Volume Quota (weighted job seconds)
            </label>
            <input
                type="number"
                className={`form-control${validQuotaVolume ? '' : ' is-invalid'}`}
                id="quotaVolume"
                step="any"
                value={quotaVolume}
                onChange={e => {
                    if (!e.target.value) {
                        setValidQuotaVolume(true);
                        setQuotaVolume('');
                        return;
                    }
                    const val = parseFloat(e.target.value);
                    if (isNaN(val) || !isFinite(val) || val < 0) {
                        setValidQuotaVolume(false);
                        setQuotaVolume(val);
                        return;
                    }
                    setValidQuotaVolume(true);
                    setQuotaVolume(val);
                }}
            />
        </div>
        <div className="form-group">
            <label htmlFor="quotaDisk">
                Disk Space Quota (in MB)
            </label>
            <input
                type="number"
                className={`form-control${validQuotaDisk ? '' : ' is-invalid'}`}
                id="quotaDisk"
                value={quotaDisk ? quotaDisk / 1e6 : ''}
                onChange={e => {
                    if (!e.target.value) {
                        setValidQuotaDisk(true);
                        setQuotaDisk('');
                        return;
                    }
                    const val = parseInt(e.target.value);
                    if (isNaN(val) || !isFinite(val) || val < 0) {
                        setValidQuotaDisk(false);
                        setQuotaDisk(val * 1e6);
                        return;
                    }
                    setValidQuotaDisk(true);
                    setQuotaDisk(val * 1e6);
                }}
            />
        </div>
    </>
}

export default UserQuotaSelector;
