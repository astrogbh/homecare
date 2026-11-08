mod db;
mod commands;

use std::sync::Mutex;
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            let dir = app.path().app_data_dir()?;
            std::fs::create_dir_all(&dir)?;
            
            let caminho = dir.join("homecare.db");
            println!("Banco em: {}", caminho.display());

            let conn = db::abrir(&caminho)?;
            app.manage(db::Db(Mutex::new(conn)));
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::login,
            commands::cadastrar_equipamento,
            commands::listar_equipamentos,
            commands::atualizar_equipamento,
            commands::desabilitar_equipamento,
            commands::reabilitar_equipamento,
            commands::listar_pendencias,
            commands::concluir_manutencao,
            commands::criar_os,
            commands::listar_os_pendentes,
            commands::concluir_os,
            commands::listar_historico_manutencoes,
            commands::listar_historico_os
        ])

        .run(tauri::generate_context!())
        .expect("erro ao iniciar o aplicativo");
}