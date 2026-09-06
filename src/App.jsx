import { useState, useEffect, useRef } from 'react';
import { Toaster } from 'react-hot-toast';
import { invoke } from '@tauri-apps/api/core';
import * as FlagIcons from 'country-flag-icons/react/3x2';
import { StoreProvider, useStore } from './components/StoreProvider';
import DropdownMenu from './components/DropdownMenu';
import { showSuccess, showError } from './utils/toast';
import { Translate, Repeat01, KeyboardAlt, Spinner, Ai01, ChevronRight, Eye, EyeOff, Globe } from './icons';
import appIcon from './assets/app-icon.png';

const LANGUAGES = {
    auto: { name: '自动识别', code: null },
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
    const text = await response.text();
    let data;
    try {
        data = JSON.parse(text);
    } catch {
        throw new Error(`服务器返回了非JSON响应 (HTTP ${response.status})`);
    }
    if (data.error) {
        throw new Error(data.error.message || '未知错误');
    }
    if (!data.choices) {
        throw new Error(data.message || data.msg || `请求失败 (HTTP ${response.status})`);
    }
    if (!(data.choices[0] && data.choices[0].message)) {
        throw new Error('响应格式不正确');
    }
};

function IconChip({ children }) {
    return (
        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-[10px] bg-gradient-to-br from-indigo-500/10 to-violet-500/10 ring-1 ring-indigo-500/15">
            {children}
        </span>
    );
}

function Card({ icon, title, children, delay = 0 }) {
    return (
        <section
            className="card-rise rounded-2xl border border-zinc-200/70 bg-white/90 shadow-[0_1px_2px_rgba(16,24,40,0.04),0_12px_32px_-12px_rgba(79,70,229,0.12)] backdrop-blur-sm transition-colors hover:border-zinc-300/80"
            style={{ animationDelay: `${delay}ms` }}
        >
            <div className="flex items-center gap-2.5 px-5 pt-4 pb-3">
                <IconChip>{icon}</IconChip>
                <span className="text-[13px] font-semibold text-zinc-600">{title}</span>
            </div>
            <div className="px-5 pb-5">{children}</div>
        </section>
    );
}

function LangFlag({ code, className }) {
    if (!code) return <Globe className={className || 'w-3.5 h-3.5 stroke-indigo-500'} />;
    const FlagIcon = FlagIcons[code];
    return <FlagIcon className="w-7 h-7 scale-[1.8]" />;
}

function LanguagePicker({ value, onSelect }) {
    const [open, setOpen] = useState(false);
    const lang = LANGUAGES[value] || LANGUAGES.zh;

    return (
        <div className="relative">
            <button
                onClick={() => setOpen(true)}
                className="flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-3.5 py-2 shadow-sm transition-all hover:border-indigo-300 hover:shadow-[0_0_0_4px_rgba(99,102,241,0.08)]"
            >
                <span className="w-5 h-5 rounded-full overflow-hidden flex items-center justify-center bg-zinc-100">
                    <LangFlag code={lang.code} />
                </span>
                <span className="text-[15px] font-semibold text-zinc-900">{lang.name}</span>
            </button>
            <DropdownMenu
                show={open}
                onClose={() => setOpen(false)}
                options={Object.fromEntries(Object.entries(LANGUAGES).map(([k, v]) => [k, v.name]))}
                currentValue={value}
                onSelect={(v) => { setOpen(false); onSelect(v); }}
                placement="bottom"
                renderOption={(key, label) => (
                    <span className="flex items-center gap-2">
                        <span className="w-4 h-4 rounded-full overflow-hidden flex items-center justify-center bg-zinc-100">
                            <LangFlag code={LANGUAGES[key].code} />
                        </span>
                        {label}
                    </span>
                )}
            />
        </div>
    );
}

function DirectionCard({ delay }) {
    const { settings, updateSettings } = useStore();
    const from = settings?.translation_from || 'zh';
    const to = settings?.translation_to || 'en';

    return (
        <Card
            icon={<Translate className="w-4 h-4 stroke-indigo-500" />}
            title="翻译方向"
            delay={delay}
        >
            <div className="flex items-center gap-3">
                <LanguagePicker
                    value={from}
                    onSelect={(lang) => updateSettings({ translation_from: lang })}
                />
                <button
                    onClick={() => updateSettings({ translation_from: to, translation_to: from })}
                    className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 text-white shadow-lg shadow-indigo-500/25 transition-transform hover:scale-110 active:scale-95"
                    title="交换方向"
                >
                    <Repeat01 className="h-[18px] w-[18px]" />
                </button>
                <LanguagePicker
                    value={to}
                    onSelect={(lang) => updateSettings({ translation_to: lang })}
                />
            </div>
        </Card>
    );
}

function HotkeyKeycaps({ text }) {
    return (
        <span className="flex items-center gap-1.5">
            {text.split('+').map((k, i) => (
                <span
                    key={i}
                    className="min-w-[34px] rounded-lg border border-zinc-200 bg-gradient-to-b from-white to-zinc-50 px-2 py-1 text-center font-mono text-[13px] font-semibold text-zinc-700 shadow-[0_1px_0_rgba(0,0,0,0.04),0_2px_4px_rgba(16,24,40,0.08)]"
                >
                    {k}
                </span>
            ))}
        </span>
    );
}

function HotkeyCard({ delay }) {
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

    const shortcut = settings?.trans_hotkey?.shortcut || '未设置';

    const liveDisplay = pressedKeys.map(k => {
        if (/Control|Alt|Shift|Meta/.test(k)) {
            return formatModifier(k.replace(/Left|Right/, ''));
        }
        return k.replace('Key', '').replace('Digit', '');
    }).join('+');

    return (
        <Card
            icon={<KeyboardAlt className="w-4 h-4 stroke-indigo-500" />}
            title="翻译快捷键"
            delay={delay}
        >
            <div className="flex items-center justify-between gap-4">
                <p className="text-xs text-zinc-400 leading-relaxed">
                    {isRecording ? '按下新的组合键，松开即完成设置' : '点击右侧按键，然后按下新组合键'}
                </p>
                <button
                    onClick={() => { keysRef.current = []; setPressedKeys([]); setIsRecording(true); }}
                    className={`flex h-10 min-w-[110px] items-center justify-center rounded-xl transition-all ${isRecording
                        ? 'bg-gradient-to-br from-indigo-500 to-violet-500 text-white shadow-lg shadow-indigo-500/30 animate-pulse'
                        : 'border border-zinc-200 bg-white px-4 shadow-sm hover:border-indigo-300 hover:shadow-[0_0_0_4px_rgba(99,102,241,0.08)]'
                        }`}
                >
                    {isRecording
                        ? (pressedKeys.length
                            ? <span className="font-mono text-[13px] font-semibold">{liveDisplay}</span>
                            : <Spinner className="w-4 h-4" />)
                        : (shortcut === '未设置'
                            ? <span className="text-[15px] font-semibold text-zinc-900">未设置</span>
                            : <HotkeyKeycaps text={shortcut} />)}
                </button>
            </div>
        </Card>
    );
}

function EngineCard({ delay }) {
    const { settings, updateSettings } = useStore();
    const [isTesting, setIsTesting] = useState(false);
    const [open, setOpen] = useState(true);
    const [touched, setTouched] = useState(false);
    const [showKey, setShowKey] = useState(false);
    const custom = settings?.custom_model || {};

    // 已配置过 API Key 时默认收起，未配置时展开
    useEffect(() => {
        if (!touched && settings?.custom_model?.auth) {
            setOpen(false);
        }
    }, [settings, touched]);

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
        <section
            className="card-rise rounded-2xl border border-zinc-200/70 bg-white/90 shadow-[0_1px_2px_rgba(16,24,40,0.04),0_12px_32px_-12px_rgba(79,70,229,0.12)] backdrop-blur-sm transition-colors hover:border-zinc-300/80"
            style={{ animationDelay: `${delay}ms` }}
        >
            <button
                onClick={() => { setOpen(!open); setTouched(true); }}
                className="flex w-full items-center gap-2.5 px-5 py-4"
            >
                <IconChip><Ai01 className="w-4 h-4 stroke-indigo-500" /></IconChip>
                <span className="text-[13px] font-semibold text-zinc-600">翻译引擎</span>
                {custom.model_name && !open && (
                    <span className="rounded-md bg-zinc-100 px-1.5 py-0.5 text-[11px] font-medium text-zinc-500">
                        {custom.model_name}
                    </span>
                )}
                <ChevronRight
                    className={`ml-auto h-4 w-4 stroke-zinc-400 transition-transform duration-200 ${open ? 'rotate-90' : ''}`}
                />
            </button>

            {open && (
                <div className="space-y-3 px-5 pb-5">
                    <div>
                        <label className="mb-1.5 block text-xs font-medium text-zinc-500">API Key</label>
                        <div className="relative">
                            <input
                                type={showKey ? 'text' : 'password'}
                                value={custom.auth || ''}
                                onChange={(e) => updateSettings({ custom_model: { ...custom, auth: e.target.value } })}
                                className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 pr-10 text-sm text-zinc-700 transition-all focus:border-indigo-400 focus:outline-none focus:ring-4 focus:ring-indigo-500/10"
                                placeholder="sk-..."
                            />
                            <button
                                type="button"
                                onClick={() => setShowKey(!showKey)}
                                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-zinc-400 transition-colors hover:text-indigo-500"
                                title={showKey ? '隐藏' : '显示'}
                            >
                                {showKey
                                    ? <EyeOff className="w-4 h-4" />
                                    : <Eye className="w-4 h-4" />}
                            </button>
                        </div>
                    </div>
                    <div>
                        <label className="mb-1.5 block text-xs font-medium text-zinc-500">API 地址</label>
                        <input
                            type="text"
                            value={custom.api_url || ''}
                            onChange={(e) => updateSettings({ custom_model: { ...custom, api_url: e.target.value } })}
                            className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-700 transition-all focus:border-indigo-400 focus:outline-none focus:ring-4 focus:ring-indigo-500/10"
                            placeholder="https://api.openai.com/v1/chat/completions"
                        />
                    </div>
                    <div>
                        <label className="mb-1.5 block text-xs font-medium text-zinc-500">模型名称</label>
                        <input
                            type="text"
                            value={custom.model_name || ''}
                            onChange={(e) => updateSettings({ custom_model: { ...custom, model_name: e.target.value } })}
                            className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-700 transition-all focus:border-indigo-400 focus:outline-none focus:ring-4 focus:ring-indigo-500/10"
                            placeholder="gpt-4o-mini"
                        />
                    </div>
                    <button
                        onClick={handleTest}
                        disabled={isTesting}
                        className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition-all hover:from-indigo-600 hover:to-violet-600 hover:shadow-indigo-500/40 disabled:opacity-60"
                    >
                        {isTesting && <Spinner className="w-4 h-4" />}
                        {isTesting ? '测试中...' : '测试连接'}
                    </button>
                </div>
            )}
        </section>
    );
}

export default function App() {
    return (
        <StoreProvider>
            <div className="relative min-h-screen bg-[#F6F6FB] text-zinc-900">
                {/* 极光渐变背景 */}
                <div className="pointer-events-none fixed inset-0">
                    <div
                        className="absolute inset-0"
                        style={{
                            background:
                                'radial-gradient(640px circle at 18% -8%, rgba(99,102,241,0.14), transparent 60%),' +
                                'radial-gradient(560px circle at 108% 18%, rgba(168,85,247,0.10), transparent 55%),' +
                                'radial-gradient(480px circle at 50% 118%, rgba(99,102,241,0.08), transparent 60%)',
                        }}
                    />
                </div>

                <Toaster
                    toastOptions={{
                        style: {
                            borderRadius: '14px',
                            background: 'rgba(255,255,255,0.92)',
                            backdropFilter: 'blur(8px)',
                            color: '#363636',
                            border: '1px solid rgba(228,228,231,0.8)',
                            boxShadow: '0 12px 32px -8px rgba(79,70,229,0.18)',
                        },
                    }}
                />

                <div className="relative mx-auto flex max-w-[520px] flex-col gap-4 px-5 py-8">
                    <header className="card-rise flex items-center gap-3.5 px-1 pb-2">
                        <img
                            src={appIcon}
                            alt="TransKey"
                            className="h-12 w-12 rounded-2xl shadow-lg shadow-indigo-500/25"
                        />
                        <div>
                            <h1 className="text-[19px] font-bold tracking-tight text-zinc-900">译键 TransKey</h1>
                            <p className="text-xs text-zinc-400">游戏快捷翻译 · 一键即译</p>
                        </div>
                    </header>

                    <DirectionCard delay={40} />
                    <HotkeyCard delay={100} />
                    <EngineCard delay={160} />

                    <footer
                        className="card-rise px-1 pt-1 text-xs leading-relaxed text-zinc-400"
                        style={{ animationDelay: '220ms' }}
                    >
                        使用方法：在游戏中打完文字，按翻译快捷键，输入内容会自动替换为译文。
                    </footer>
                </div>
            </div>
        </StoreProvider>
    );
}
