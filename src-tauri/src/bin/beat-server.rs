//! 不開視窗、只跑伺服器（放在主機上，或測試用）。
//!
//! 用法：beat-server [--port 7822] [--dist ../dist] [--song vr-city]
//! 房主金鑰會印在終端機上，在網頁的「開設房間」輸入金鑰就能當房主。

use virtual_beat_lib::server;
use std::path::PathBuf;
use std::sync::Arc;
use beat_core::room::Settings;

fn mime_of(path: &str) -> &'static str {
    match path.rsplit('.').next().unwrap_or("") {
        "html" => "text/html; charset=utf-8",
        "js" => "text/javascript",
        "css" => "text/css",
        "svg" => "image/svg+xml",
        "png" => "image/png",
        "ico" => "image/x-icon",
        "json" => "application/json",
        "wasm" => "application/wasm",
        "woff2" => "font/woff2",
        _ => "application/octet-stream",
    }
}

#[tokio::main]
async fn main() {
    let args: Vec<String> = std::env::args().collect();
    let get = |flag: &str| args.iter().position(|a| a == flag).and_then(|i| args.get(i + 1)).cloned();
    let port: u16 = get("--port").and_then(|p| p.parse().ok()).unwrap_or(7822);
    let dist = get("--dist").map(PathBuf::from).or_else(|| {
        ["dist", "../dist"].iter().map(PathBuf::from).find(|p| p.join("index.html").exists())
    });
    let mut settings = Settings::default();
    // 一開始選哪一首（id 見 src/lib/game/tracks.js，例如 vr-city、vq-boss、mj-title）
    if let Some(song) = get("--song") {
        settings.song = song;
    }
    let assets: Option<server::AssetFn> = dist.clone().map(|d| {
        let f: server::AssetFn = Arc::new(move |path: &str| {
            if path.contains("..") {
                return None;
            }
            std::fs::read(d.join(path)).ok().map(|b| (b, mime_of(path).to_string()))
        });
        f
    });
    let h = server::start(port, settings, assets).await.unwrap_or_else(|e| {
        eprintln!("{}", e);
        std::process::exit(1);
    });
    println!("虛擬音鬥樂伺服器已啟動");
    println!("  網頁：http://localhost:{}/ {}", h.port, if dist.is_some() { "" } else { "（找不到 dist，網頁介面停用）" });
    for ip in server::local_ips() {
        println!("  區網：http://{}:{}/", ip, h.port);
    }
    println!("  房主金鑰：{}", h.host_key);
    tokio::signal::ctrl_c().await.ok();
    h.stop();
}
