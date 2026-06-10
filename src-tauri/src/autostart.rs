use std::process::Command;

fn exe_path() -> Option<String> {
    std::env::current_exe()
        .ok()
        .and_then(|p| p.to_str().map(String::from))
}

#[tauri::command]
pub fn set_autostart(enabled: bool) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        let path = exe_path().ok_or("Cannot resolve exe path")?;
        let reg_key = r"HKCU\SOFTWARE\Microsoft\Windows\CurrentVersion\Run";

        if enabled {
            Command::new("reg")
                .args(["add", reg_key, "/v", "Bloom", "/t", "REG_SZ", "/d", &path, "/f"])
                .output()
                .map_err(|e| e.to_string())?;
        } else {
            Command::new("reg")
                .args(["delete", reg_key, "/v", "Bloom", "/f"])
                .output()
                .map_err(|e| e.to_string())?;
        }
        Ok(())
    }

    #[cfg(not(target_os = "windows"))]
    {
        let _ = enabled;
        Ok(())
    }
}

#[tauri::command]
pub fn get_autostart() -> bool {
    #[cfg(target_os = "windows")]
    {
        let reg_key = r"HKCU\SOFTWARE\Microsoft\Windows\CurrentVersion\Run";
        Command::new("reg")
            .args(["query", reg_key, "/v", "Bloom"])
            .output()
            .map(|o| o.status.success())
            .unwrap_or(false)
    }

    #[cfg(not(target_os = "windows"))]
    {
        false
    }
}
