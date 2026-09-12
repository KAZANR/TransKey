use serde_json::{json, Value};
use tauri::AppHandle;
use tauri::Manager;
use tauri_plugin_store::StoreExt;

const SETTINGS_FILENAME: &str = "settings.json";

// 模型配置
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct ModelConfig {
    pub auth: String,
    pub api_url: String,
    pub model_name: String,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct HotkeyConfig {
    pub modifiers: Vec<String>,
    pub key: String,
    pub shortcut: String,
}

impl HotkeyConfig {
    // 创建平台特定的快捷键配置
    fn new_platform_specific(key: &str) -> Self {
        #[cfg(target_os = "macos")]
        let (modifier, symbol) = ("Meta", "⌘");
        #[cfg(not(target_os = "macos"))]
        let (modifier, symbol) = ("Alt", "Alt");

        Self {
            modifiers: vec![modifier.to_string()],
            key: key.to_string(),
            shortcut: format!("{}+{}", symbol, key.replace("Key", "").replace("Digit", "")),
        }
    }
}

// 应用设置（存储在 settings.json）
// 旧版本 settings.json 中的多余字段（phrases/scenes/model_type 等）会在反序列化时被自动忽略
#[derive(Debug, serde::Serialize, serde::Deserialize)]
pub struct AppSettings {
    pub trans_hotkey: HotkeyConfig,
    pub translation_from: String,
    pub translation_to: String,
    pub custom_model: ModelConfig,
    #[serde(default = "default_theme")]
    pub theme_color: String,
    // 点击关闭按钮时隐藏到托盘而不是退出（默认开启）
    #[serde(default = "default_close_to_tray")]
    pub close_to_tray: bool,
}

fn default_theme() -> String {
    "violet".to_string()
}

fn default_close_to_tray() -> bool {
    true
}

// v0.2.0 改名后设置目录变化：优先从旧版 DeepRant 目录迁移配置
fn migrate_legacy_settings(app: &AppHandle) -> Result<(), anyhow::Error> {
    let old_path = app
        .path()
        .app_data_dir()?
        .parent()
        .ok_or_else(|| anyhow::anyhow!("无法定位设置目录"))?
        .join("com.DeepRant.app")
        .join(SETTINGS_FILENAME);

    let legacy: Value = serde_json::from_str(&std::fs::read_to_string(old_path)?)?;
    let old = &legacy["settings"];

    // 只保留新版 AppSettings 用到的字段，旧字段（phrases/scenes/model_type 等）丢弃
    let migrated = json!({
        "trans_hotkey": old["trans_hotkey"],
        "translation_from": old["translation_from"],
        "translation_to": old["translation_to"],
        "custom_model": old["custom_model"],
    });

    let store = app.store(SETTINGS_FILENAME)?;
    store.set("settings", migrated);
    store.save()?;
    store.close_resource();
    Ok(())
}

// 初始化默认设置
pub fn initialize_settings(app: &AppHandle) -> Result<(), anyhow::Error> {
    let has_settings = {
        let store = app.store(SETTINGS_FILENAME)?;
        let has = store.get("settings").is_some();
        store.close_resource();
        has
    };
    if has_settings {
        return Ok(());
    }

    if migrate_legacy_settings(app).is_ok() {
        println!("已从旧版 DeepRant 配置迁移");
        return Ok(());
    }

    let settings_store = app.store(SETTINGS_FILENAME)?;

    // 创建默认快捷键配置
    let trans_hotkey = HotkeyConfig::new_platform_specific("KeyT");

    let default_settings = json!({
        "trans_hotkey": trans_hotkey,
        "translation_from": "zh",
        "translation_to": "en",
        "theme_color": "violet",
        "close_to_tray": true,
        "custom_model": {
            "auth": "",
            "api_url": "https://api.openai.com/v1/chat/completions",
            "model_name": "gpt-4o-mini"
        }
    });

    settings_store.set("settings", default_settings);
    let _ = settings_store.save();
    settings_store.close_resource();

    Ok(())
}

// 获取设置
pub fn get_settings(app: &AppHandle) -> Result<AppSettings, anyhow::Error> {
    let store = app.store(SETTINGS_FILENAME)?;
    let settings: Value = store
        .get("settings")
        .expect("Failed to get value from settings store");
    Ok(serde_json::from_value(settings)?)
}

// 更新设置中的特定字段
pub fn update_settings_field<T: serde::Serialize>(
    app: &AppHandle,
    field_updater: impl FnOnce(&mut AppSettings) -> T,
) -> Result<T, anyhow::Error> {
    let store = app.store(SETTINGS_FILENAME)?;
    let mut settings = get_settings(app)?;

    // 更新字段
    let result = field_updater(&mut settings);

    // 保存更新后的设置
    store.set("settings", json!(settings));
    store.save()?;

    Ok(result)
}
