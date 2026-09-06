use crate::ai_translator;
use anyhow::Result;
use tauri::AppHandle;
use tauri_plugin_clipboard_manager::ClipboardExt;
#[cfg(target_os = "macos")]
use tauri_plugin_shell::ShellExt;

/// 核心翻译流程：复制选中文本 -> AI 翻译 -> 结果写回剪贴板并粘贴
pub async fn trans_and_replace_text(app: &AppHandle) -> Result<()> {
    // 记录复制前的剪贴板内容，用于检测是否有新文本被复制进来
    let old_clipboard = app.clipboard().read_text().unwrap_or_default();

    // 1. 复制选中文本
    simulate_keyboard_shortcut(app, "c").await?;

    // 2. 轮询等待剪贴板更新（游戏窗口处理模拟按键可能较慢）
    let start = std::time::Instant::now();
    let mut original_text = app.clipboard().read_text().unwrap_or_default();
    while original_text == old_clipboard && start.elapsed() < std::time::Duration::from_millis(1500)
    {
        std::thread::sleep(std::time::Duration::from_millis(80));
        original_text = app.clipboard().read_text().unwrap_or_default();
    }
    println!("原始文本: {:?}", original_text);

    // 3. 剪贴板始终没有变化且为空 -> 没有选中任何文本，直接中止避免翻译旧内容
    if original_text.trim().is_empty() {
        anyhow::bail!("未检测到选中的文本（剪贴板为空），请先选中要翻译的文字");
    }

    // 4. 调用AI翻译
    let translated = ai_translator::translate_with_gpt(app, &original_text).await?;
    println!("翻译结果: {:?}", translated);

    // 5. 粘贴翻译结果
    app.clipboard().write_text(translated)?;
    simulate_keyboard_shortcut(app, "v").await?;

    Ok(())
}

/// 模拟键盘组合键按下
async fn simulate_keyboard_shortcut(app: &AppHandle, key: &str) -> Result<()> {
    #[cfg(target_os = "macos")]
    {
        let shell = app.shell();
        let script = format!(
            r#"
            tell application "System Events"
                keystroke "{}" using command down
                delay 0.1
            end tell
            "#,
            key
        );

        let output = shell
            .command("osascript")
            .args(["-e", &script])
            .output()
            .await?;

        if !output.status.success() {
            println!("按键模拟失败: {:?}", String::from_utf8(output.stderr)?);
            return Ok(());
        }
    }

    #[cfg(target_os = "windows")]
    {
        let _ = app;
        use std::thread::sleep;
        use std::time::Duration;

        const KEYEVENTF_KEYUP: u32 = 0x0002;

        #[link(name = "user32")]
        extern "system" {
            fn keybd_event(bVk: u8, bScan: u8, dwFlags: u32, dwExtraInfo: usize);
        }

        let vk: u8 = match key.to_ascii_uppercase().as_str() {
            "A" => 0x41,
            "C" => 0x43,
            "V" => 0x56,
            _ => return Err(anyhow::anyhow!("不支持的按键: {}", key)),
        };

        unsafe {
            keybd_event(0x11, 0, 0, 0); // Ctrl down
            sleep(Duration::from_millis(15));
            keybd_event(vk, 0, 0, 0); // key down
            sleep(Duration::from_millis(15));
            keybd_event(vk, 0, KEYEVENTF_KEYUP, 0); // key up
            sleep(Duration::from_millis(15));
            keybd_event(0x11, 0, KEYEVENTF_KEYUP, 0); // Ctrl up
        }
        // 等待目标窗口处理按键并刷新剪贴板
        sleep(Duration::from_millis(120));
    }

    Ok(())
}
