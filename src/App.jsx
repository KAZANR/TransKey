import { useState, useEffect, useRef } from 'react';
import { Toaster } from 'react-hot-toast';
import { invoke } from '@tauri-apps/api/core';
import * as FlagIcons from 'country-flag-icons/react/3x2';
import {
    Languages,
    ArrowLeftRight,
    Keyboard,
    Bot,
    Settings2,
    Eye,
    EyeOff,
    Globe,
    Check,
    Loader2,
    ChevronDown,
    CircleCheck,
} from 'lucide-react';
import { StoreProvider, useStore } from './components/StoreProvider';
import { Button } from './components/ui/button';
import { Card } from './components/ui/card';
import { Input } from './components/ui/input';
import { Label } from './components/ui/label';
import { Badge } from './components/ui/badge';
import { Separator } from './components/ui/separator';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from './components/ui/dropdown-menu';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './components/ui/collapsible';
import { showSuccess, showError } from './utils/toast';
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

/* MIUI 风格彩色图标块 */
function IconTile({ gradient, children }) {
    return (
        <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-[12px] bg-gradient-to-br text-white shadow-sm ${gradient}`}>
            {children}
        </span>
    );
}

/* 列表行之间的内嵌分隔线 */
function InsetDivider() {
    return <div className="mx-4 h-px bg-black/5" />;
}

function LangFlag({ code }) {
    if (!code) return <Globe className="h-4 w-4 text-muted-foreground" />;
    const FlagIcon = FlagIcons[code];
    return <FlagIcon className="h-4 w-6 rounded-[2px] shadow-sm" />;
}

function LanguagePicker({ value, onSelect }) {
    const lang = LANGUAGES[value] || LANGUAGES.zh;

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="secondary" className="h-9 gap-2 px-3.5 font-medium">
                    <LangFlag code={lang.code} />
                    {lang.name}
                    <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="max-h-72 overflow-y-auto">
                {Object.entries(LANGUAGES).map(([key, item]) => (
                    <DropdownMenuItem key={key} onSelect={() => onSelect(key)}>
                        <LangFlag code={item.code} />
                        <span className={key === value ? 'font-semibold' : ''}>{item.name}</span>
                        {key === value && <Check className="ml-auto h-4 w-4 text-primary" />}
                    </DropdownMenuItem>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

function Keycap({ children }) {
    return (
        <kbd className="min-w-[28px] rounded-lg bg-muted px-2 py-0.5 text-center font-mono text-xs font-semibold text-foreground shadow-sm">
            {children}
        </kbd>
    );
}

function DirectionGroup() {
    const { settings, updateSettings } = useStore();
    const from = settings?.translation_from || 'zh';
    const to = settings?.translation_to || 'en';

    return (
        <Card className="card-rise">
            <div className="flex items-center gap-3 px-4 py-3.5">
                <IconTile gradient="from-sky-400 to-blue-500">
                    <Languages className="h-5 w-5" />
                </IconTile>
                <div>
                    <p className="text-sm font-semibold">翻译方向</p>
                    <p className="text-xs text-muted-foreground">
                        {(LANGUAGES[from] || LANGUAGES.zh).name} → {(LANGUAGES[to] || LANGUAGES.en).name}
                    </p>
                </div>
            </div>
            <InsetDivider />
            <div className="flex items-center justify-between px-4 py-3">
                <span className="text-sm text-muted-foreground">源语言</span>
                <LanguagePicker
                    value={from}
                    onSelect={(lang) => updateSettings({ translation_from: lang })}
                />
            </div>
            <InsetDivider />
            <div className="flex items-center justify-between px-4 py-3">
                <span className="text-sm text-muted-foreground">目标语言</span>
                <LanguagePicker
                    value={to}
                    onSelect={(lang) => updateSettings({ translation_to: lang })}
                />
            </div>
            <InsetDivider />
            <button
                className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors active:bg-muted/60"
                onClick={() => updateSettings({ translation_from: to, translation_to: from })}
            >
                <IconTile gradient="from-slate-400 to-slate-600">
                    <ArrowLeftRight className="h-5 w-5" />
                </IconTile>
                <span className="flex-1 text-sm font-medium">交换翻译方向</span>
                <ChevronDown className="h-4 w-4 -rotate-90 text-muted-foreground" />
            </button>
        </Card>
    );
}

function HotkeyGroup({ delay = 0 }) {
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

    const shortcut = settings?.trans_hotkey?.shortcut;

    const liveDisplay = pressedKeys.map((k) => {
        if (/Control|Alt|Shift|Meta/.test(k)) {
            return formatModifier(k.replace(/Left|Right/, ''));
        }
        return k.replace('Key', '').replace('Digit', '');
    }).join('+');

    return (
        <Card className="card-rise" style={{ animationDelay: `${delay}ms` }}>
            <button
                className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors active:bg-muted/60"
                onClick={() => {
                    if (isRecording) return;
                    keysRef.current = [];
                    setPressedKeys([]);
                    setIsRecording(true);
                }}
            >
                <IconTile gradient="from-orange-400 to-red-500">
                    <Keyboard className="h-5 w-5" />
                </IconTile>
                <div className="flex-1">
                    <p className="text-sm font-semibold">翻译快捷键</p>
                    <p className="text-xs text-muted-foreground">
                        {isRecording ? '按下新的组合键，松开即完成' : '点击此行修改快捷键'}
                    </p>
                </div>
                {isRecording ? (
                    <Badge className="gap-1.5 rounded-full font-mono text-xs">
                        {pressedKeys.length ? liveDisplay : <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                    </Badge>
                ) : shortcut ? (
                    <span className="flex items-center gap-1">
                        {shortcut.split('+').map((k, i) => (
                            <Keycap key={i}>{k}</Keycap>
                        ))}
                    </span>
                ) : (
                    <span className="text-sm text-muted-foreground">未设置</span>
                )}
            </button>
        </Card>
    );
}

function EngineGroup({ delay = 0 }) {
    const { settings, updateSettings } = useStore();
    const [isTesting, setIsTesting] = useState(false);
    const [showKey, setShowKey] = useState(false);
    const [open, setOpen] = useState(false);
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
        <Collapsible open={open} onOpenChange={setOpen} className="card-rise" style={{ animationDelay: `${delay}ms` }}>
            <Card>
                <CollapsibleTrigger asChild>
                    <button className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors active:bg-muted/60">
                        <IconTile gradient="from-emerald-400 to-teal-500">
                            <Bot className="h-5 w-5" />
                        </IconTile>
                        <div className="flex-1">
                            <p className="text-sm font-semibold">翻译引擎</p>
                            <p className="text-xs text-muted-foreground">OpenAI 兼容接口</p>
                        </div>
                        {custom.model_name && (
                            <Badge variant="secondary" className="rounded-full font-normal">
                                {custom.model_name}
                            </Badge>
                        )}
                        <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
                    </button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                    <div className="space-y-3.5 px-4 pb-4 pt-1">
                        <div className="space-y-1.5">
                            <Label htmlFor="api-key" className="text-xs text-muted-foreground">API KEY</Label>
                            <div className="relative">
                                <Input
                                    id="api-key"
                                    type={showKey ? 'text' : 'password'}
                                    value={custom.auth || ''}
                                    onChange={(e) => updateSettings({ custom_model: { ...custom, auth: e.target.value } })}
                                    placeholder="sk-..."
                                    className="pr-10"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowKey(!showKey)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                                    title={showKey ? '隐藏' : '显示'}
                                >
                                    {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="api-url" className="text-xs text-muted-foreground">API 地址</Label>
                            <Input
                                id="api-url"
                                type="text"
                                value={custom.api_url || ''}
                                onChange={(e) => updateSettings({ custom_model: { ...custom, api_url: e.target.value } })}
                                placeholder="https://api.openai.com/v1/chat/completions"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="model-name" className="text-xs text-muted-foreground">模型名称</Label>
                            <Input
                                id="model-name"
                                type="text"
                                value={custom.model_name || ''}
                                onChange={(e) => updateSettings({ custom_model: { ...custom, model_name: e.target.value } })}
                                placeholder="gpt-4o-mini"
                            />
                        </div>
                        <Button onClick={handleTest} disabled={isTesting} className="h-10 w-full">
                            {isTesting && <Loader2 className="h-4 w-4 animate-spin" />}
                            {isTesting ? '测试中…' : '测试连接'}
                        </Button>
                    </div>
                </CollapsibleContent>
            </Card>
        </Collapsible>
    );
}

/* MIUI 澎湃OS 渐变 Hero 卡 */
function HeroCard() {
    const { settings } = useStore();
    const shortcut = settings?.trans_hotkey?.shortcut || '未设置快捷键';

    return (
        <section className="card-rise relative overflow-hidden rounded-[28px] bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-600 p-6 text-white shadow-[0_8px_28px_rgba(59,110,242,0.35)]">
            <div className="pointer-events-none absolute -right-8 -top-10 h-36 w-36 rounded-full bg-white/15 blur-2xl" />
            <div className="pointer-events-none absolute -bottom-12 -left-6 h-32 w-32 rounded-full bg-cyan-300/25 blur-2xl" />
            <div className="relative">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-2.5 py-1 text-xs font-medium backdrop-blur">
                    <CircleCheck className="h-3.5 w-3.5" />
                    已就绪
                </span>
                <h2 className="mt-3 text-[26px] font-bold leading-snug tracking-tight">
                    打字即翻译
                </h2>
                <p className="mt-1 text-[13px] leading-relaxed text-white/80">
                    游戏内打完文字，按下快捷键，输入内容自动替换为译文
                </p>
                <span className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3.5 py-1.5 backdrop-blur">
                    <Keyboard className="h-3.5 w-3.5" />
                    <span className="font-mono text-xs font-semibold tracking-wide">{shortcut}</span>
                </span>
            </div>
        </section>
    );
}

function HomePage() {
    return (
        <>
            <HeroCard />
            <div className="mt-4 flex flex-col gap-3">
                <DirectionGroup />
            </div>
            <p className="pt-5 text-center text-xs text-muted-foreground">
                引擎与快捷键可在「设置」中调整
            </p>
        </>
    );
}

function SettingsPage() {
    return (
        <div className="flex flex-col gap-3 pt-6">
            <HotkeyGroup delay={40} />
            <EngineGroup delay={90} />
        </div>
    );
}

/* 澎湃OS 悬浮胶囊 Dock */
function Dock({ page, setPage }) {
    const items = [
        { id: 'home', label: '翻译', icon: Languages },
        { id: 'settings', label: '设置', icon: Settings2 },
    ];

    return (
        <nav className="fixed bottom-4 left-1/2 z-50 flex -translate-x-1/2 items-center gap-1 rounded-full border-0 bg-card/95 p-1.5 shadow-[0_4px_24px_rgba(0,0,0,0.14)] backdrop-blur">
            {items.map((it) => {
                const active = page === it.id;
                return (
                    <button
                        key={it.id}
                        onClick={() => setPage(it.id)}
                        className={`flex h-9 items-center gap-1.5 rounded-full px-5 text-sm font-medium transition-all ${active
                            ? 'bg-primary text-primary-foreground shadow-sm'
                            : 'text-muted-foreground hover:text-foreground'}`}
                    >
                        <it.icon className="h-4 w-4" />
                        {it.label}
                    </button>
                );
            })}
        </nav>
    );
}

function ThemedApp() {
    const [page, setPage] = useState('home');

    return (
        <div className="flex h-screen flex-col bg-background text-foreground">
            <Toaster
                toastOptions={{
                    style: {
                        borderRadius: '16px',
                        background: 'hsl(var(--card))',
                        color: 'hsl(var(--card-foreground))',
                        border: 'none',
                        boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
                    },
                }}
            />

            <header className="px-6 pb-2 pt-6">
                <div className="flex items-center gap-2.5">
                    <img src={appIcon} alt="TransKey" className="h-9 w-9 rounded-[12px] shadow-sm" />
                    <div>
                        <h1 className="text-[22px] font-bold leading-tight tracking-tight">译键 TransKey</h1>
                        <p className="text-xs text-muted-foreground">游戏快捷翻译 · 一键即译</p>
                    </div>
                </div>
            </header>

            <main className="flex-1 overflow-y-auto px-4 pb-28">
                <div className="mx-auto w-full max-w-[440px]">
                    {page === 'home' ? <HomePage /> : <SettingsPage />}
                </div>
            </main>

            <Dock page={page} setPage={setPage} />
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
