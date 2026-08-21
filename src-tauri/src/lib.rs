use tauri::{
    menu::{MenuBuilder, MenuItemBuilder, PredefinedMenuItem},
    tray::TrayIconBuilder,
    Manager, WebviewUrl, WebviewWindowBuilder,
};

fn show_window<R: tauri::Runtime>(app: &tauri::AppHandle<R>, label: &str) {
    if let Some(window) = app.get_webview_window(label) {
        let _ = window.show();
        let _ = window.set_focus();
    }
}

fn open_settings<R: tauri::Runtime>(app: &tauri::AppHandle<R>) {
    if app.get_webview_window("settings").is_none() {
        let _ = WebviewWindowBuilder::new(app, "settings", WebviewUrl::App("settings.html".into()))
            .title("NewAPI 监控设置")
            .inner_size(480.0, 520.0)
            .center()
            .build();
    }
    show_window(app, "settings");
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_autostart::Builder::new().build())
        .setup(|app| {
            let show = MenuItemBuilder::with_id("show", "显示面板").build(app)?;
            let settings = MenuItemBuilder::with_id("settings", "设置").build(app)?;
            let hide = MenuItemBuilder::with_id("hide", "隐藏面板").build(app)?;
            let quit = PredefinedMenuItem::quit(app, Some("退出"))?;
            let menu = MenuBuilder::new(app)
                .items(&[&show, &settings, &hide, &PredefinedMenuItem::separator(app)?, &quit])
                .build()?;

            TrayIconBuilder::new()
                .menu(&menu)
                .tooltip("NewAPI 监控")
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "show" => show_window(app, "main"),
                    "hide" => {
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.hide();
                        }
                    }
                    "settings" => open_settings(app),
                    _ => {}
                })
                .build(app)?;
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
