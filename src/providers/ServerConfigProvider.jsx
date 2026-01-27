import {
    useState,
    useLayoutEffect,
    useContext,
} from 'react'
import axios from 'axios'
import { getResponseError } from '../util/util'
import ServerConfigContext from '../contexts/ServerConfigContext'
import AlertContext from '../contexts/AlertContext'

const SERVER_NAME = import.meta.env.VITE_ENGINE_URL
    ? import.meta.env.VITE_ENGINE_URL
    : '/api'

const ServerConfigProvider = ({ children }) => {
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
        setServerConfig(currentConfig => {
            for (const [key, value] of newConfigEntries) {
                currentConfig[key] = value
            }
            return currentConfig
        })
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
export default ServerConfigProvider;
