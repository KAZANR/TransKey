use crate::store::{initialize_settings, get_settings as store_get_settings};
use tauri::Manager;
pub mod ai_translator;
pub mod shell_helper;
pub mod shortcut;
pub mod store;
pub mod tray;

#[tauri::command]
async fn update_translator_shortcut(
    app_handle: tauri::AppHandle,
    keys: Vec<String>,
) -> Result<(), String> {
    shortcut::update_translator_shortcut(&app_handle, keys)
}

#[tauri::command]
async fn get_settings(app_handle: tauri::AppHandle) -> Result<store::AppSettings, String> {
    store_get_settings(&app_handle).map_err(|e| e.to_string())
}

// Windows：标题栏/边框使用应用底色，避免跟随系统强调色（如紫色主题）
#[cfg(target_os = "windows")]
fn apply_window_chrome_color(app: &tauri::AppHandle) {
    use windows_sys::Win32::Graphics::Dwm::{
        DwmSetWindowAttribute, DWMWA_BORDER_COLOR, DWMWA_CAPTION_COLOR, DWMWA_TEXT_COLOR,
    };
    if let Some(win) = app.get_webview_window("main") {
        if let Ok(hwnd) = win.hwnd() {
            // COLORREF 为 0x00BBGGRR：#F1F1F4（应用底色）与 #181818（标题文字）
            let caption = 0x00F4_F1F1u32;
            let text = 0x0018_1818u32;
            unsafe {
                let hwnd = hwnd.0 as windows_sys::Win32::Foundation::HWND;
                for (attr, value) in [
                    (DWMWA_CAPTION_COLOR, caption),
                    (DWMWA_BORDER_COLOR, caption),
                    (DWMWA_TEXT_COLOR, text),
                ] {
                    let _ = DwmSetWindowAttribute(
                        hwnd,
                        attr as u32,
                        &value as *const u32 as *const core::ffi::c_void,
                        4,
                    );
                }
            }
        }
    }
}

pub fn run() {
    println!("Starting application...");

    let builder = tauri::Builder::default()
        // 单实例锁：重复启动时聚焦已有窗口（必须最先注册）
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            use tauri::Manager;
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.show();
                let _ = window.set_focus();
            }
        }))
        .plugin(tauri_plugin_window_state::Builder::default().build())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(tauri_plugin_store::Builder::default().build())
        .plugin(tauri_plugin_shell::init())
        // 剪贴板插件
        .plugin(tauri_plugin_clipboard_manager::init())
        .setup(|app| {
            // 初始化存储
            println!("Initializing...");
            match initialize_settings(&app.app_handle()) {
                Ok(_) => println!("应用设置初始化完成"),
                Err(e) => eprintln!("初始化设置失败: {}", e),
            }

            // 初始化所有快捷键
            println!("正在注册全局快捷键...");
            match shortcut::init_shortcuts(&app.app_handle()) {
                Ok(_) => println!("快捷键设置成功"),
                Err(e) => eprintln!("注册全局快捷键失败: {}", e),
            }

            // 创建AI模型托盘
            match tray::create_tray(&app.app_handle()) {
                Ok(_) => println!("托盘创建成功"),
                Err(e) => eprintln!("创建托盘失败: {}", e),
            }

            // Windows：标题栏/边框颜色与应用底色一致
            #[cfg(target_os = "windows")]
            apply_window_chrome_color(&app.app_handle());

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            update_translator_shortcut,
            get_settings
        ]);

    // 只在非Windows系统上添加窗口事件监听
    #[cfg(not(target_os = "windows"))]
    let builder = builder.on_window_event(|window, event| match event {
        tauri::WindowEvent::CloseRequested { api, .. } => {
            window.hide().unwrap();
            #[cfg(target_os = "macos")]
            let _ = window
                .app_handle()
                .set_activation_policy(tauri::ActivationPolicy::Accessory);
            api.prevent_close();
        }
        _ => {}
    });

    builder
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
