use tauri::{
    menu::{MenuBuilder, MenuItemBuilder, PredefinedMenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
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

            let tray_icon = app.default_window_icon().cloned();
            TrayIconBuilder::new()
                .icon(tray_icon.ok_or_else(|| tauri::Error::AssetNotFound("icons/icon.ico".into()))?)
                .menu(&menu)
                .show_menu_on_left_click(true)
                .tooltip("NewAPI 监控")
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        ..
                    } = event
                    {
                        show_window(tray.app_handle(), "main");
                    }
                })
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
