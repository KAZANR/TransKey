fn main() {
    let mut attributes = tauri_build::Attributes::new();

    // Windows：内嵌 requireAdministrator 清单，向管理员权限的游戏发送按键需要提权
    #[cfg(target_os = "windows")]
    {
        attributes = attributes.windows_attributes(
            tauri_build::WindowsAttributes::new().app_manifest(include_str!("app.manifest").to_string()),
        );
    }

    tauri_build::try_build(attributes).expect("failed to run tauri-build");
}
