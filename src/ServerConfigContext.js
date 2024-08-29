import React, {
    createContext,
    useState,
    useLayoutEffect,
    useContext,
} from 'react'
import axios from 'axios'
import { getResponseError } from './components/util'
import { AlertContext } from './components/Alert'

export const ServerConfigContext = createContext()

const SERVER_NAME = process.env.REACT_APP_ENGINE_URL
    ? process.env.REACT_APP_ENGINE_URL
    : '/api'

export const ServerConfigProvider = ({ children }) => {
    const [serverConfig, setServerConfig] = useState({})
    const [updateConfigState, setUpdateConfigState] = useState(0)
    const [, setAlertMsg] = useContext(AlertContext)
    const updateServerState = async (newConfig) => {
        if (!newConfig) {
            return
        }
        const patchConfigForm = new FormData()
        const newConfigEntries = Object.entries(newConfig)
        if (newConfigEntries.length < 1) {
            return
        }
        for (const [key, value] of newConfigEntries) {
            patchConfigForm.append(key, value)
        }
        await axios.patch(`${SERVER_NAME}/configuration`, patchConfigForm)
        for (const [key, value] of newConfigEntries) {
            serverConfig[key] = value
        }
    }
    const serverConfigState = [
        serverConfig,
        updateServerState,
        setUpdateConfigState,
    ]
    useLayoutEffect(() => {
        const fetchConfig = async () => {
            try {
                setServerConfig(
                    (await axios.get(`${SERVER_NAME}/configuration`)).data
                )
            } catch (err) {
                setAlertMsg(
                    `Problems fetching configuration. Error message: ${getResponseError(
                        err
                    )}`
                )
            }
        }
        fetchConfig()
    }, [setAlertMsg, updateConfigState])
    return (
        <ServerConfigContext.Provider value={serverConfigState}>
            {children}
        </ServerConfigContext.Provider>
    )
}
