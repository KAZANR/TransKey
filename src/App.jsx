import { useState, useEffect, useRef } from 'react';
import { Toaster } from 'react-hot-toast';
import { invoke } from '@tauri-apps/api/core';
import * as FlagIcons from 'country-flag-icons/react/3x2';
import { StoreProvider, useStore } from './components/StoreProvider';
import DropdownMenu from './components/DropdownMenu';
import { showSuccess, showError } from './utils/toast';
import { Translate, Repeat01, KeyboardAlt, Spinner, Ai01 } from './icons';
import appIcon from './assets/app-icon.png';

const LANGUAGES = {
    zh: { name: '中文', code: 'CN' },
    'en-SEA': { name: '东南亚英语', code: 'SG' },
    ko: { name: '韩文', code: 'KR' },
    en: { name: '英文', code: 'US' },
    fr: { name: '法文', code: 'FR' },
    ru: { name: '俄文', code: 'RU' },
    es: { name: '西班牙文', code: 'ES' },
    ja: { name: '日文', code: 'JP' },
    de: { name: '德文', code: 'DE' },
};

const isMac = () => navigator.userAgent.toLowerCase().includes('mac');

const formatModifier = (key) => ({
    'Control': isMac() ? '⌃' : 'Ctrl',
    'Alt': isMac() ? '⌥' : 'Alt',
    'Shift': '⇧',
    'Meta': isMac() ? '⌘' : 'Win',
}[key] || key);

const testOpenAIConnection = async (apiKey, baseUrl, modelName) => {
    const response = await fetch(baseUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
            model: modelName,
            messages: [{ role: 'user', content: 'Hi' }],
            max_tokens: 10,
        }),
    });
    const data = await response.json();
    if (data.error) {
        throw new Error(data.error.message || '未知错误');
    }
    if (!data.choices && data.message) {
        // 硅基流动等返回顶层 {code, message} 的错误格式
        throw new Error(data.message);
    }
    if (!(data.choices && data.choices[0] && data.choices[0].message)) {
        throw new Error('响应格式不正确');
    }
};

function Card({ icon, title, children, className = '' }) {
    return (
        <section className={`rounded-2xl bg-white border border-zinc-200/80 shadow-[0_4px_20px_rgb(0,0,0,0.04)] p-5 ${className}`}>
            <div className="flex items-center gap-2 text-[13px] font-medium text-zinc-500 mb-4">
                {icon}
                {title}
            </div>
            {children}
        </section>
    );
}

function LanguagePicker({ value, onSelect }) {
    const [open, setOpen] = useState(false);
    const lang = LANGUAGES[value] || LANGUAGES.zh;
    const FlagIcon = FlagIcons[lang.code];

    return (
        <div className="relative">
            <button
                onClick={() => setOpen(true)}
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-zinc-50 hover:bg-zinc-100 border border-transparent hover:border-zinc-200 transition-colors"
            >
                <span className="w-5 h-5 rounded-full overflow-hidden flex items-center justify-center bg-zinc-100">
                    <FlagIcon className="w-7 h-7 scale-[1.8]" />
                </span>
                <span className="text-[15px] font-medium text-zinc-900">{lang.name}</span>
            </button>
            <DropdownMenu
                show={open}
                onClose={() => setOpen(false)}
                options={Object.fromEntries(Object.entries(LANGUAGES).map(([k, v]) => [k, v.name]))}
                currentValue={value}
                onSelect={(v) => { setOpen(false); onSelect(v); }}
                placement="bottom"
                renderOption={(key, label) => {
                    const OptionFlag = FlagIcons[LANGUAGES[key].code];
                    return (
                        <span className="flex items-center gap-2">
                            <span className="w-4 h-4 rounded-full overflow-hidden flex items-center justify-center bg-zinc-100">
                                <OptionFlag className="w-6 h-6 scale-[1.8]" />
                            </span>
                            {label}
                        </span>
                    );
                }}
            />
        </div>
    );
}

function DirectionCard() {
    const { settings, updateSettings } = useStore();
    const from = settings?.translation_from || 'zh';
    const to = settings?.translation_to || 'en';

    return (
        <Card icon={<Translate className="w-4 h-4 stroke-zinc-500" />} title="翻译方向">
            <div className="flex items-center gap-3">
                <LanguagePicker
                    value={from}
                    onSelect={(lang) => updateSettings({ translation_from: lang })}
                />
                <button
                    onClick={() => updateSettings({ translation_from: to, translation_to: from })}
                    className="p-2 rounded-full text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors"
                    title="交换方向"
                >
                    <Repeat01 className="w-5 h-5" />
                </button>
                <LanguagePicker
                    value={to}
                    onSelect={(lang) => updateSettings({ translation_to: lang })}
                />
            </div>
        </Card>
    );
}

function HotkeyCard() {
    const { settings, updateSettings } = useStore();
    const [isRecording, setIsRecording] = useState(false);
    const [pressedKeys, setPressedKeys] = useState([]);
    const keysRef = useRef([]);

    useEffect(() => {
        if (!isRecording) return;

        const onKeyDown = (e) => {
            e.preventDefault();
            if (!keysRef.current.includes(e.code)) {
                keysRef.current = [...keysRef.current, e.code];
                setPressedKeys(keysRef.current);
            }
        };

        const onKeyUp = async () => {
            const keys = keysRef.current;
            window.removeEventListener('keydown', onKeyDown);
            window.removeEventListener('keyup', onKeyUp);
            setIsRecording(false);
            setPressedKeys([]);
            keysRef.current = [];

            if (keys.length === 0) return;
            try {
                await invoke('update_translator_shortcut', { keys });
                const updated = await invoke('get_settings');
                updateSettings(updated);
                showSuccess('翻译快捷键设置成功');
            } catch (err) {
                showError('快捷键设置失败: ' + err);
            }
        };

        window.addEventListener('keydown', onKeyDown);
        window.addEventListener('keyup', onKeyUp);
        return () => {
            window.removeEventListener('keydown', onKeyDown);
            window.removeEventListener('keyup', onKeyUp);
        };
    }, [isRecording]);

    const display = isRecording
        ? (pressedKeys.length
            ? pressedKeys.map(k => {
                if (/Control|Alt|Shift|Meta/.test(k)) {
                    return formatModifier(k.replace(/Left|Right/, ''));
                }
                return k.replace('Key', '').replace('Digit', '');
            }).join(' + ')
            : <Spinner className="w-5 h-5 text-zinc-400" />)
        : settings?.trans_hotkey?.shortcut || '未设置';

    return (
        <Card icon={<KeyboardAlt className="w-4 h-4 stroke-zinc-500" />} title="翻译快捷键">
            <div className="flex items-center justify-between gap-4">
                <p className="text-xs text-zinc-400 leading-relaxed">
                    {isRecording ? '按下新的组合键，松开即完成设置' : '点击右侧按钮，然后按下新组合键'}
                </p>
                <button
                    onClick={() => { keysRef.current = []; setPressedKeys([]); setIsRecording(true); }}
                    className={`min-w-[110px] px-4 py-2 rounded-xl text-[15px] font-semibold border transition-colors ${isRecording
                        ? 'border-zinc-900 bg-zinc-900 text-white'
                        : 'border-zinc-200 bg-zinc-50 hover:bg-zinc-100 text-zinc-900'
                        }`}
                >
                    {display}
                </button>
            </div>
        </Card>
    );
}

function EngineCard() {
    const { settings, updateSettings } = useStore();
    const [isTesting, setIsTesting] = useState(false);
    const custom = settings?.custom_model || {};

    const handleTest = async () => {
        if (!custom.auth) return showError('请输入API Key');
        if (!custom.api_url) return showError('请输入API地址');
        if (!custom.model_name) return showError('请输入模型名称');
        setIsTesting(true);
        try {
            await testOpenAIConnection(custom.auth, custom.api_url, custom.model_name);
            showSuccess('API连接测试成功');
        } catch (error) {
            showError('API测试失败: ' + error.message);
        } finally {
            setIsTesting(false);
        }
    };

    return (
        <Card icon={<Ai01 className="w-4 h-4 stroke-zinc-500" />} title="翻译引擎">
            <div className="space-y-3">
                <div>
                    <label className="block text-xs text-zinc-500 mb-1.5">API Key</label>
                    <input
                        type="text"
                        value={custom.auth || ''}
                        onChange={(e) => updateSettings({ custom_model: { ...custom, auth: e.target.value } })}
                        className="w-full px-3 py-2 bg-white border border-zinc-200 rounded-lg text-sm text-zinc-700 focus:outline-none focus:border-zinc-400"
                        placeholder="sk-..."
                    />
                </div>
                <div>
                    <label className="block text-xs text-zinc-500 mb-1.5">API 地址</label>
                    <input
                        type="text"
                        value={custom.api_url || ''}
                        onChange={(e) => updateSettings({ custom_model: { ...custom, api_url: e.target.value } })}
                        className="w-full px-3 py-2 bg-white border border-zinc-200 rounded-lg text-sm text-zinc-700 focus:outline-none focus:border-zinc-400"
                        placeholder="https://api.openai.com/v1/chat/completions"
                    />
                </div>
                <div>
                    <label className="block text-xs text-zinc-500 mb-1.5">模型名称</label>
                    <input
                        type="text"
                        value={custom.model_name || ''}
                        onChange={(e) => updateSettings({ custom_model: { ...custom, model_name: e.target.value } })}
                        className="w-full px-3 py-2 bg-white border border-zinc-200 rounded-lg text-sm text-zinc-700 focus:outline-none focus:border-zinc-400"
                        placeholder="gpt-4o-mini"
                    />
                </div>
                <button
                    onClick={handleTest}
                    disabled={isTesting}
                    className="w-full py-2 rounded-lg text-sm text-white bg-zinc-900 hover:bg-zinc-800 disabled:opacity-60 transition-colors flex items-center justify-center gap-2"
                >
                    {isTesting && <Spinner className="w-4 h-4" />}
                    {isTesting ? '测试中...' : '测试连接'}
                </button>
            </div>
        </Card>
    );
}

export default function App() {
    return (
        <StoreProvider>
            <div className="min-h-screen bg-[#F7F7F8] text-zinc-900">
                <Toaster
                    toastOptions={{
                        style: {
                            borderRadius: '12px',
                            background: '#fff',
                            color: '#363636',
                        },
                    }}
                />
                <div className="mx-auto max-w-[520px] px-5 py-8 flex flex-col gap-4">
                    <header className="flex items-center gap-3 px-1 pb-1">
                        <img src={appIcon} alt="TransKey" className="w-11 h-11 rounded-xl" />
                        <div>
                            <h1 className="text-lg font-bold text-zinc-900 leading-tight">译键 TransKey</h1>
                            <p className="text-xs text-zinc-400">游戏快捷翻译 · 一键即译</p>
                        </div>
                    </header>

                    <DirectionCard />
                    <HotkeyCard />
                    <EngineCard />

                    <footer className="text-xs text-zinc-400 leading-relaxed px-1 pt-1">
                        使用方法：在游戏中选中文字，按翻译快捷键，翻译结果会自动粘贴到输入框。
                    </footer>
                </div>
            </div>
        </StoreProvider>
    );
}
