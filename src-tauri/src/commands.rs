use std::collections::HashMap;
use std::fs::File;
use std::io::Read;
use std::path::Path;

#[derive(serde::Serialize)]
pub struct TranslationItem {
    pub translation: String,
    pub context: Option<String>,
}

#[tauri::command]
pub fn parse_csv_to_map(csv: String) -> Result<HashMap<String, TranslationItem>, String> {
    let mut reader = csv::ReaderBuilder::new()
        .has_headers(false)
        .flexible(true)
        .from_reader(csv.as_bytes());

    let mut map = HashMap::new();
    for result in reader.records() {
        let record = result.map_err(|e| e.to_string())?;
        if record.len() < 2 {
            continue;
        }

        let source = record.get(0).unwrap_or("").trim().trim_matches('"').to_string();
        let translation = record.get(1).unwrap_or("").trim().trim_matches('"').to_string();
        if source.is_empty() || translation.is_empty() {
            continue;
        }

        let context = record.get(3)
            .map(|s| s.trim().trim_matches('"').to_string())
            .filter(|s| !s.is_empty());
        map.insert(source, TranslationItem { translation, context });
    }

    Ok(map)
}

#[tauri::command]
pub fn read_file_as_base64(file_path: String) -> Result<String, String> {
    let path = Path::new(&file_path);
    if !path.exists() {
        return Err(format!("File does not exist: {}", file_path));
    }

    let mut file = File::open(path).map_err(|e| e.to_string())?;
    let mut buffer = Vec::new();
    file.read_to_end(&mut buffer).map_err(|e| e.to_string())?;

    let ext = path.extension()
        .and_then(|s| s.to_str())
        .unwrap_or("")
        .to_lowercase();

    let mime = match ext.as_str() {
        "png" => "image/png",
        "jpg" | "jpeg" => "image/jpeg",
        "webp" => "image/webp",
        "gif" => "image/gif",
        _ => "application/octet-stream",
    };

    use base64::{Engine as _, engine::general_purpose::STANDARD};
    let base64_str = STANDARD.encode(&buffer);
    Ok(format!("data:{};base64,{}", mime, base64_str))
}
