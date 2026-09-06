import { createContext, useContext, useState, useEffect } from 'react';
import { load } from '@tauri-apps/plugin-store';

const StoreContext = createContext(null);

export function StoreProvider({ children }) {
    const [store, setStore] = useState(null);
    const [settings, setSettings] = useState(null);

    useEffect(() => {
        const initStore = async () => {
            try {
                const storeInstance = await load('settings.json', {
                    autoSave: 100
                });
                setStore(storeInstance);

                const storedSettings = await storeInstance.get('settings');
                if (storedSettings) {
                    setSettings(storedSettings);
                }
            } catch (error) {
                console.error('初始化 store 失败:', error);
            }
        };
        initStore();
    }, []);

    const updateSettings = async (newSettings) => {
        if (!store) return;
        const updatedSettings = { ...settings, ...newSettings };
        try {
            await store.set('settings', updatedSettings);
            await store.save();
            const storedSettings = await store.get('settings');
            if (storedSettings) {
                setSettings(storedSettings);
            }
        } catch (error) {
            console.error('更新设置失败:', error);
        }
    };

    return (
        <StoreContext.Provider value={{
            store,
            settings,
            updateSettings
        }}>
            {children}
        </StoreContext.Provider>
    );
}

export const useStore = () => {
    const context = useContext(StoreContext);
    if (!context) {
        throw new Error('useStore 必须在 StoreProvider 内部使用');
    }
    return context;
};
