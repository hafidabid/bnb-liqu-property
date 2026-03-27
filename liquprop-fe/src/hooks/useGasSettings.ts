import { useState, useCallback } from 'react'

export type GasSettings = {
    /** Manual gas price override in Gwei. Empty string = use network auto price. */
    gasPriceGwei: string
    /** Multiply estimated gas by this factor for the on-chain limit. E.g. "1.3" */
    gasLimitMultiplier: string
}

const STORAGE_KEY = 'liquprop_gas_settings'

const DEFAULTS: GasSettings = {
    gasPriceGwei: '',
    gasLimitMultiplier: '1.3',
}

function loadFromStorage(): GasSettings {
    try {
        const raw = localStorage.getItem(STORAGE_KEY)
        if (!raw) return { ...DEFAULTS }
        const parsed = JSON.parse(raw) as Partial<GasSettings>
        return {
            gasPriceGwei: parsed.gasPriceGwei ?? DEFAULTS.gasPriceGwei,
            gasLimitMultiplier: parsed.gasLimitMultiplier ?? DEFAULTS.gasLimitMultiplier,
        }
    } catch {
        return { ...DEFAULTS }
    }
}

export function useGasSettings() {
    const [settings, setSettings] = useState<GasSettings>(loadFromStorage)

    const saveSettings = useCallback((next: GasSettings) => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
        setSettings(next)
    }, [])

    const resetSettings = useCallback(() => {
        localStorage.removeItem(STORAGE_KEY)
        setSettings({ ...DEFAULTS })
    }, [])

    /**
     * Returns the gas limit to use given an estimated gas value.
     * Applies the multiplier and rounds up to the nearest integer.
     */
    const applyMultiplier = useCallback(
        (estimatedGas: bigint): bigint => {
            const multiplier = parseFloat(settings.gasLimitMultiplier) || 1.3
            return BigInt(Math.ceil(Number(estimatedGas) * multiplier))
        },
        [settings.gasLimitMultiplier],
    )

    /**
     * Returns the gas price in wei to pass to writeContract, or undefined (auto).
     */
    const getGasPriceWei = useCallback((): bigint | undefined => {
        const gwei = parseFloat(settings.gasPriceGwei)
        if (!gwei || isNaN(gwei) || gwei <= 0) return undefined
        // 1 Gwei = 1e9 wei
        return BigInt(Math.round(gwei * 1e9))
    }, [settings.gasPriceGwei])

    return { settings, saveSettings, resetSettings, applyMultiplier, getGasPriceWei }
}
