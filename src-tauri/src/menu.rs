use tauri::menu::{
    AboutMetadataBuilder, Menu, MenuBuilder, MenuItemBuilder, SubmenuBuilder,
};
use tauri::{AppHandle, Runtime};

pub const ID_CHECK_UPDATES: &str = "check_updates";
pub const ID_OPEN_FOLDER: &str = "open_folder";
pub const ID_RELOAD_PREVIEW: &str = "reload_preview";

pub fn build<R: Runtime>(app: &AppHandle<R>) -> tauri::Result<Menu<R>> {
    let about = AboutMetadataBuilder::new()
        .name(Some("HTML Browser".to_string()))
        .version(Some(env!("CARGO_PKG_VERSION").to_string()))
        .website(Some("https://htmlbrowser.dev".to_string()))
        .website_label(Some("htmlbrowser.dev".to_string()))
        .build();

    let app_submenu = SubmenuBuilder::new(app, "HTML Browser")
        .about(Some(about))
        .item(
            &MenuItemBuilder::with_id(ID_CHECK_UPDATES, "Check for Updates…")
                .build(app)?,
        )
        .separator()
        .services()
        .separator()
        .hide()
        .hide_others()
        .show_all()
        .separator()
        .quit()
        .build()?;

    let file_submenu = SubmenuBuilder::new(app, "File")
        .item(
            &MenuItemBuilder::with_id(ID_OPEN_FOLDER, "Open Folder…")
                .accelerator("CmdOrCtrl+O")
                .build(app)?,
        )
        .item(
            &MenuItemBuilder::with_id(ID_RELOAD_PREVIEW, "Reload Preview")
                .accelerator("CmdOrCtrl+R")
                .build(app)?,
        )
        .separator()
        .close_window()
        .build()?;

    let edit_submenu = SubmenuBuilder::new(app, "Edit")
        .undo()
        .redo()
        .separator()
        .cut()
        .copy()
        .paste()
        .select_all()
        .build()?;

    let window_submenu = SubmenuBuilder::new(app, "Window")
        .minimize()
        .maximize()
        .separator()
        .fullscreen()
        .build()?;

    MenuBuilder::new(app)
        .items(&[&app_submenu, &file_submenu, &edit_submenu, &window_submenu])
        .build()
}
