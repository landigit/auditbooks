fn main() {
  let target = std::env::var("TARGET").unwrap_or_default();
  if target.contains("android") {
    // For 16KB page size compatibility (Android 15+)
    println!("cargo:rustc-link-arg=-Wl,-z,max-page-size=16384");
    println!("cargo:rustc-link-arg=-Wl,-z,common-page-size=16384");
  }
  tauri_build::build()
}
