use std::path::PathBuf;
use std::process::Command;

#[tauri::command]
pub async fn reveal_in_finder(path: PathBuf) -> Result<(), String> {
    #[cfg(target_os = "macos")]
    {
        Command::new("open")
            .arg("-R")
            .arg(&path)
            .status()
            .map_err(|e| e.to_string())?;
        return Ok(());
    }
    #[cfg(not(target_os = "macos"))]
    {
        let _ = path;
        Err("reveal is only implemented on macOS".to_string())
    }
}

#[tauri::command]
pub async fn open_external(path: PathBuf) -> Result<(), String> {
    #[cfg(target_os = "macos")]
    {
        Command::new("open")
            .arg(&path)
            .status()
            .map_err(|e| e.to_string())?;
        return Ok(());
    }
    #[cfg(not(target_os = "macos"))]
    {
        let _ = path;
        Err("open_external is only implemented on macOS".to_string())
    }
}
