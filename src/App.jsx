import { useState, useEffect, useRef } from 'react';
import { Toaster } from 'react-hot-toast';
import { invoke } from '@tauri-apps/api/core';
import * as FlagIcons from 'country-flag-icons/react/3x2';
import { StoreProvider, useStore } from './components/StoreProvider';
import DropdownMenu from './components/DropdownMenu';
import { showSuccess, showError } from './utils/toast';
import { Translate, Repeat01, KeyboardAlt, Spinner, Ai01, ChevronRight, Eye, EyeOff, Globe, CheckTick } from './icons';
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

// Material Design 3 配色方案（浅色）
const PALETTES = {
    violet: {
        name: '静谧紫',
        vars: {
            '--md-primary': '#6750A4',
            '--md-on-primary': '#FFFFFF',
            '--md-primary-container': '#EADDFF',
            '--md-on-primary-container': '#21005D',
            '--md-secondary-container': '#E8DEF8',
            '--md-surface': '#FEF7FF',
            '--md-surface-low': '#F7F2FA',
            '--md-surface-container': '#F3EDF7',
            '--md-surface-high': '#ECE6F0',
            '--md-on-surface': '#1D1B20',
            '--md-on-surface-var': '#49454F',
            '--md-outline': '#79747E',
            '--md-outline-var': '#CAC4D0',
        },
    },
    blue: {
        name: '天空蓝',
        vars: {
            '--md-primary': '#0B57D0',
            '--md-on-primary': '#FFFFFF',
            '--md-primary-container': '#D3E3FD',
            '--md-on-primary-container': '#041E49',
            '--md-secondary-container': '#DBE2F5',
            '--md-surface': '#F9F9FF',
            '--md-surface-low': '#F0F3FC',
            '--md-surface-container': '#EBEEF9',
            '--md-surface-high': '#E3E7F5',
            '--md-on-surface': '#191C20',
            '--md-on-surface-var': '#44474E',
            '--md-outline': '#74777F',
            '--md-outline-var': '#C4C6D0',
        },
    },
    green: {
        name: '原野绿',
        vars: {
            '--md-primary': '#146C2E',
            '--md-on-primary': '#FFFFFF',
            '--md-primary-container': '#C4EED0',
            '--md-on-primary-container': '#00210A',
            '--md-secondary-container': '#CEE5D5',
            '--md-surface': '#F8FAF3',
            '--md-surface-low': '#F0F4EC',
            '--md-surface-container': '#EBEFE7',
            '--md-surface-high': '#E3E7DF',
            '--md-on-surface': '#191D17',
            '--md-on-surface-var': '#43483F',
            '--md-outline': '#73796D',
            '--md-outline-var': '#C3C8BB',
        },
    },
    rose: {
        name: '蔷薇粉',
        vars: {
            '--md-primary': '#984061',
            '--md-on-primary': '#FFFFFF',
            '--md-primary-container': '#FFD8E4',
            '--md-on-primary-container': '#31111D',
            '--md-secondary-container': '#F0D9E2',
            '--md-surface': '#FFF8F7',
            '--md-surface-low': '#FAEFEE',
            '--md-surface-container': '#F5EAEB',
            '--md-surface-high': '#F0E2E3',
            '--md-on-surface': '#201A1B',
            '--md-on-surface-var': '#514347',
            '--md-outline': '#837377',
            '--md-outline-var': '#D3C2C6',
        },
    },
    amber: {
        name: '暖阳橙',
        vars: {
            '--md-primary': '#8B5000',
            '--md-on-primary': '#FFFFFF',
            '--md-primary-container': '#FFDCC2',
            '--md-on-primary-container': '#2E1500',
            '--md-secondary-container': '#F3DFC7',
            '--md-surface': '#FFF8F6',
            '--md-surface-low': '#FAF0E8',
            '--md-surface-container': '#F5EAE2',
            '--md-surface-high': '#EFE1D8',
            '--md-on-surface': '#201A17',
            '--md-on-surface-var': '#51443A',
            '--md-outline': '#837467',
            '--md-outline-var': '#D5C3B5',
        },
    },
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
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[var(--md-primary-container)]">
            <span className="text-[var(--md-on-primary-container)]">{children}</span>
        </span>
    );
}

function Card({ icon, title, children, delay = 0 }) {
    return (
        <section
            className="card-rise rounded-xl bg-[var(--md-surface-low)] shadow-[0_1px_2px_rgba(0,0,0,0.08)]"
            style={{ animationDelay: `${delay}ms` }}
        >
            <div className="flex items-center gap-3 px-4 pt-3.5 pb-2">
                <IconChip>{icon}</IconChip>
                <span className="text-sm font-medium text-[var(--md-on-surface)]">{title}</span>
            </div>
            <div className="px-4 pb-4">{children}</div>
        </section>
    );
}

function LangFlag({ code, className }) {
    if (!code) return <Globe className={className || 'w-4 h-4 stroke-[var(--md-primary)]'} />;
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
                className="flex h-10 items-center gap-2 rounded-full border border-[var(--md-outline)] bg-transparent px-4 transition-colors hover:bg-[color-mix(in_srgb,var(--md-on-surface)_6%,transparent)]"
            >
                <span className="w-5 h-5 rounded-full overflow-hidden flex items-center justify-center bg-[var(--md-surface-high)]">
                    <LangFlag code={lang.code} />
                </span>
                <span className="text-sm font-medium text-[var(--md-on-surface)]">{lang.name}</span>
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
                        <span className="w-4 h-4 rounded-full overflow-hidden flex items-center justify-center bg-[var(--md-surface-high)]">
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
            icon={<Translate className="w-5 h-5" />}
            title="翻译方向"
            delay={delay}
        >
            <div className="flex items-center justify-center gap-3 py-1">
                <LanguagePicker
                    value={from}
                    onSelect={(lang) => updateSettings({ translation_from: lang })}
                />
                <button
                    onClick={() => updateSettings({ translation_from: to, translation_to: from })}
                    className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[var(--md-primary-container)] text-[var(--md-on-primary-container)] transition-colors hover:bg-[color-mix(in_srgb,var(--md-primary-container)_85%,var(--md-primary))]"
                    title="交换方向"
                >
                    <Repeat01 className="h-5 w-5" />
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
                    className="min-w-[32px] rounded-md bg-[var(--md-surface-high)] px-2 py-1 text-center font-mono text-[13px] font-semibold text-[var(--md-on-surface)] border-b-2 border-[var(--md-outline)]"
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
            icon={<KeyboardAlt className="w-5 h-5" />}
            title="翻译快捷键"
            delay={delay}
        >
            <div className="flex items-center justify-between gap-3 py-1">
                <p className="text-xs leading-relaxed text-[var(--md-on-surface-var)]">
                    {isRecording ? '按下新的组合键，松开即完成设置' : '点击右侧按键，然后按下新组合键'}
                </p>
                <button
                    onClick={() => { keysRef.current = []; setPressedKeys([]); setIsRecording(true); }}
                    className={`flex h-10 min-w-[104px] shrink-0 items-center justify-center rounded-full transition-colors ${isRecording
                        ? 'bg-[var(--md-primary-container)] text-[var(--md-on-primary-container)]'
                        : 'border border-[var(--md-outline)] bg-transparent px-4 hover:bg-[color-mix(in_srgb,var(--md-on-surface)_6%,transparent)]'
                        }`}
                >
                    {isRecording
                        ? (pressedKeys.length
                            ? <span className="font-mono text-[13px] font-semibold">{liveDisplay}</span>
                            : <Spinner className="w-4 h-4" />)
                        : (shortcut === '未设置'
                            ? <span className="text-sm font-medium text-[var(--md-on-surface)]">未设置</span>
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

    const fieldLabel = 'mb-1 block text-[11px] font-medium tracking-wide text-[var(--md-on-surface-var)]';
    const fieldInput = 'w-full rounded-t-lg border-b-2 bg-[var(--md-surface-high)] px-3 pt-2 pb-1.5 text-sm text-[var(--md-on-surface)] outline-none transition-colors border-[var(--md-outline-var)] focus:border-[var(--md-primary)]';

    return (
        <section
            className="card-rise rounded-xl bg-[var(--md-surface-low)] shadow-[0_1px_2px_rgba(0,0,0,0.08)]"
            style={{ animationDelay: `${delay}ms` }}
        >
            <button
                onClick={() => { setOpen(!open); setTouched(true); }}
                className="flex w-full items-center gap-3 px-4 py-3.5"
            >
                <IconChip><Ai01 className="w-5 h-5" /></IconChip>
                <span className="text-sm font-medium text-[var(--md-on-surface)]">翻译引擎</span>
                {custom.model_name && !open && (
                    <span className="rounded-md bg-[var(--md-surface-high)] px-1.5 py-0.5 text-[11px] font-medium text-[var(--md-on-surface-var)]">
                        {custom.model_name}
                    </span>
                )}
                <ChevronRight
                    className={`ml-auto h-5 w-5 text-[var(--md-on-surface-var)] transition-transform duration-200 ${open ? 'rotate-90' : ''}`}
                />
            </button>

            {open && (
                <div className="space-y-3.5 px-4 pb-4">
                    <div>
                        <label className={fieldLabel}>API KEY</label>
                        <div className="relative">
                            <input
                                type={showKey ? 'text' : 'password'}
                                value={custom.auth || ''}
                                onChange={(e) => updateSettings({ custom_model: { ...custom, auth: e.target.value } })}
                                className={fieldInput + ' pr-10'}
                                placeholder="sk-..."
                            />
                            <button
                                type="button"
                                onClick={() => setShowKey(!showKey)}
                                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-[var(--md-on-surface-var)] transition-colors hover:text-[var(--md-primary)]"
                                title={showKey ? '隐藏' : '显示'}
                            >
                                {showKey
                                    ? <EyeOff className="w-4 h-4" />
                                    : <Eye className="w-4 h-4" />}
                            </button>
                        </div>
                    </div>
                    <div>
                        <label className={fieldLabel}>API 地址</label>
                        <input
                            type="text"
                            value={custom.api_url || ''}
                            onChange={(e) => updateSettings({ custom_model: { ...custom, api_url: e.target.value } })}
                            className={fieldInput}
                            placeholder="https://api.openai.com/v1/chat/completions"
                        />
                    </div>
                    <div>
                        <label className={fieldLabel}>模型名称</label>
                        <input
                            type="text"
                            value={custom.model_name || ''}
                            onChange={(e) => updateSettings({ custom_model: { ...custom, model_name: e.target.value } })}
                            className={fieldInput}
                            placeholder="gpt-4o-mini"
                        />
                    </div>
                    <button
                        onClick={handleTest}
                        disabled={isTesting}
                        className="mt-1 flex h-10 w-full items-center justify-center gap-2 rounded-full bg-[var(--md-primary)] text-sm font-medium text-[var(--md-on-primary)] transition-all hover:shadow-[0_2px_8px_rgba(0,0,0,0.2)] disabled:opacity-50"
                    >
                        {isTesting && <Spinner className="w-4 h-4" />}
                        {isTesting ? '测试中...' : '测试连接'}
                    </button>
                </div>
            )}
        </section>
    );
}

function ThemeCard({ delay }) {
    const { settings, updateSettings } = useStore();
    const current = settings?.theme_color || 'violet';

    return (
        <Card
            icon={<span className="grid h-5 w-5 place-items-center rounded-md bg-[var(--md-primary)]"><span className="h-2 w-2 rounded-full bg-[var(--md-on-primary)]" /></span>}
            title="主题颜色"
            delay={delay}
        >
            <div className="flex items-center gap-3 py-1.5">
                {Object.entries(PALETTES).map(([key, p]) => {
                    const selected = current === key;
                    return (
                        <button
                            key={key}
                            onClick={() => updateSettings({ theme_color: key })}
                            title={p.name}
                            className={`relative grid h-9 w-9 place-items-center rounded-full transition-transform ${selected ? 'scale-110' : 'hover:scale-110'}`}
                            style={{ background: p.vars['--md-primary'] }}
                        >
                            {selected && (
                                <>
                                    <span className="absolute inset-[-4px] rounded-full border-2 border-[var(--md-primary)]" />
                                    <CheckTick className="w-4 h-4 stroke-white" />
                                </>
                            )}
                        </button>
                    );
                })}
                <span className="ml-1 text-xs text-[var(--md-on-surface-var)]">
                    {PALETTES[current]?.name || PALETTES.violet.name}
                </span>
            </div>
        </Card>
    );
}

function ThemedApp() {
    const { settings } = useStore();
    const palette = PALETTES[settings?.theme_color] || PALETTES.violet;

    return (
        <div
            className="min-h-screen bg-[var(--md-surface)] text-[var(--md-on-surface)]"
            style={palette.vars}
        >
            <Toaster
                toastOptions={{
                    style: {
                        borderRadius: '14px',
                        background: 'var(--md-surface-high)',
                        color: 'var(--md-on-surface)',
                        border: '1px solid var(--md-outline-var)',
                        boxShadow: '0 4px 16px rgba(0,0,0,0.14)',
                    },
                }}
            />

            <div className="flex w-full flex-col gap-3 px-6 py-6">
                <header className="card-rise flex items-center gap-3.5 px-1 pb-1">
                    <img
                        src={appIcon}
                        alt="TransKey"
                        className="h-11 w-11 rounded-[14px]"
                    />
                    <div>
                        <h1 className="text-[21px] font-semibold leading-tight tracking-tight text-[var(--md-on-surface)]">译键 TransKey</h1>
                        <p className="text-xs text-[var(--md-on-surface-var)]">游戏快捷翻译 · 一键即译</p>
                    </div>
                </header>

                <DirectionCard delay={40} />
                <HotkeyCard delay={90} />
                <EngineCard delay={140} />
                <ThemeCard delay={190} />

                <footer
                    className="card-rise px-1 pt-1 text-xs leading-relaxed text-[var(--md-on-surface-var)]"
                    style={{ animationDelay: '240ms' }}
                >
                    使用方法：在游戏中打完文字，按翻译快捷键，输入内容会自动替换为译文。
                </footer>
            </div>
        </div>
    );
}

export default function App() {
    return (
        <StoreProvider>
            <ThemedApp />
        </StoreProvider>
    );
}
