#[tauri::command]
pub fn greet(name: String) -> String {
  println!("🦀 GREET COMMAND HIT: {}", name);
  format!("Hello, {}!", name)
}

  