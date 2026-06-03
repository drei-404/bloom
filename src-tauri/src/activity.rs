#[tauri::command]
pub fn get_system_idle_ms() -> u64 {
    #[cfg(target_os = "windows")]
    {
        use std::mem;

        #[allow(non_snake_case)]
        #[repr(C)]
        struct LASTINPUTINFO {
            cbSize: u32,
            dwTime: u32,
        }

        extern "system" {
            fn GetLastInputInfo(plii: *mut LASTINPUTINFO) -> i32;
            fn GetTickCount() -> u32;
        }

        unsafe {
            let mut lii = LASTINPUTINFO {
                cbSize: mem::size_of::<LASTINPUTINFO>() as u32,
                dwTime: 0,
            };
            GetLastInputInfo(&mut lii);
            let tick_count = GetTickCount();
            tick_count.wrapping_sub(lii.dwTime) as u64
        }
    }

    #[cfg(not(target_os = "windows"))]
    {
        0
    }
}
