import React, { useState, useEffect, useRef, useReducer } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import { Activity } from "react-feather";
import Modal from "react-bootstrap/Modal";
import { getResponseError } from "./util";
import Button from "react-bootstrap/Button";

function entryCacheReducer(state, action) {
    if (state[action.key] == null) {
        state[action.key] = action.value;
    } else {
        state[action.key] += action.value;
    }
    return state;
}

const StreamEntryView = props => {
    const [showStreamEntry, setShowStreamEntry] = useState(false);

    const contentTextarea = useRef(null);
    const { streamEntry, isStdOut, server, setRefreshJob } = props;
    const [errorMsg, setErrorMsg] = useState("");
    const [refresh, setRefresh] = useState(0);
    const [entryCache, setEntryCache] = useReducer(entryCacheReducer, {});
    const [scrollToBottom, setScrollToBottom] = useState(true);
    const { token } = useParams();

    useEffect(() => {
        if (!showStreamEntry) {
            return;
        }
        const fetchStreamEntry = async () => {
            let seReq
            try {
                seReq = await axios.delete(
                    isStdOut ? `${server}/jobs/${encodeURIComponent(token)}/unread-logs` :
                        `${server}/jobs/${encodeURIComponent(token)}/stream-entry`,
                    isStdOut ? {} : { params: { entry_name: streamEntry } }
                )
            } catch (err) {
                if (err.response.status === 308) {
                    setRefreshJob(refresh => refresh + 1);
                } else {
                    setErrorMsg(`A problem occurred while retrieving the stream entry. Error message: ${getResponseError(err)}`);
                }
            }
            const entryValTmp = seReq.data[isStdOut ? "message" : "entry_value"];
            setErrorMsg('');
            if (entryValTmp !== '') {
                setEntryCache({ key: streamEntry, value: entryValTmp });
                setRefresh(curr => curr + 1);
            }
        }
        fetchStreamEntry();
        const streamEntryTimer = setInterval(() => {
            fetchStreamEntry();
        }, 1500);
        return () => {
            clearInterval(streamEntryTimer);
        }
    }, [server, token, isStdOut, streamEntry, showStreamEntry, setRefreshJob]);

    useEffect(() => {
        if (showStreamEntry && scrollToBottom) {
            contentTextarea.current.scrollTop = contentTextarea.current.scrollHeight;
        }
    }, [showStreamEntry, refresh, scrollToBottom])
    return (
        <>
            <button className="btn btn-sm btn-warning" onClick={() => setShowStreamEntry(true)}>
                <Activity size={18} />
            </button>
            <Modal show={showStreamEntry} onHide={() => setShowStreamEntry(false)} size="lg">
                <Modal.Header closeButton>
                    <Modal.Title>{streamEntry}</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <div className="invalid-feedback" style={{ display: errorMsg !== "" ? "block" : "none" }}>
                        {errorMsg}
                    </div>
                    <textarea
                        className="form-control text-monospace"
                        style={{ fontSize: "9pt" }}
                        rows="15"
                        value={entryCache[streamEntry]}
                        ref={contentTextarea}
                        readOnly
                    ></textarea>
                    <div className="form-check">
                        <input type="checkbox"
                            className="form-check-input"
                            checked={scrollToBottom}
                            onChange={e => setScrollToBottom(e.target.checked)}
                            id="scrollToBottom" />
                        <label className="form-check-label" htmlFor="scrollToBottom">Update</label>
                    </div>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowStreamEntry(false)}>
                        Cancel
                    </Button>
                </Modal.Footer>
            </Modal>
        </>
    );
};

export default StreamEntryView;
