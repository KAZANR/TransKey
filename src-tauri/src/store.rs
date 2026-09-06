use serde_json::{json, Value};
use tauri::AppHandle;
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
// 旧版本 settings.json 中的多余字段（phrases/scenes 等）会在反序列化时被自动忽略
#[derive(Debug, serde::Serialize, serde::Deserialize)]
pub struct AppSettings {
    pub trans_hotkey: HotkeyConfig,
    pub translation_from: String,
    pub translation_to: String,
    pub model_type: String,
    pub custom_model: ModelConfig,
}

// 初始化默认设置
pub fn initialize_settings(app: &AppHandle) -> Result<(), anyhow::Error> {
    let settings_store = app.store(SETTINGS_FILENAME)?;

    let has_settings = settings_store.get("settings").is_some();
    if has_settings {
        settings_store.close_resource();
        return Ok(());
    }

    // 创建默认快捷键配置
    let trans_hotkey = HotkeyConfig::new_platform_specific("KeyT");

    let default_settings = json!({
        "trans_hotkey": trans_hotkey,
        "translation_from": "zh",
        "translation_to": "en",
        "model_type": "siliconflow",
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
