// District: Common Ground — Tauri v2 desktop shell (M18).
// Zero custom commands today: the game is a pure client-side PWA embedded in
// the native window, with the same IndexedDB-backed offline storage engine
// (apps/web/src/core/offline/) it uses in the browser. A native SQLite WAL
// backend (per docs/planning/18-...md's storage-tiers table) is a follow-up
// that would replace IndexedDB behind DeviceStorageEngine's interface, not
// something wired into this shell yet.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    tauri::Builder::default()
        .run(tauri::generate_context!())
        .expect("error while running the District: Common Ground desktop shell");
}
