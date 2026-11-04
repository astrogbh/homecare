use serde::{Deserialize, Serialize};
use crate::db::Db;
use rusqlite::params;
use tauri::State;

#[tauri::command]
pub fn login(db: State<Db>, usuario: String, senha: String) -> Result<bool, String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    let total: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM usuarios WHERE usuario = ?1 AND senha = ?2",
            params![usuario, senha],
            |linha| linha.get(0),
        )
        .map_err(|e| e.to_string())?;
    Ok(total > 0)
}

#[derive(Deserialize)]
pub struct NovoEquipamento {
    pub nome: String,
    pub localizacao: String,
    pub data_aquisicao: String,
    pub proxima_manutencao: String,
    pub periodicidade_meses: i64,
}

#[derive(Serialize)]
pub struct Equipamento {
    pub id_equipamento: i64,
    pub nome: String,
    pub localizacao: String,
    pub data_aquisicao: String,
    pub proxima_manutencao: String,
    pub periodicidade_meses: i64,
    pub ativo: bool,
    pub motivo_desabilitacao: Option<String>,
}

#[tauri::command]
pub fn cadastrar_equipamento(
    db: State<Db>,
    equipamento: NovoEquipamento,
) -> Result<(), String> {
        validar(&equipamento)?;

    let conn = db.0.lock().map_err(|e| e.to_string())?;
    conn.execute(
        "INSERT INTO equipamentos
            (nome, localizacao, data_aquisicao, proxima_manutencao, periodicidade_meses)
         VALUES (?1, ?2, ?3, ?4, ?5)",
        params![
            equipamento.nome.trim(),
            equipamento.localizacao.trim(),
            equipamento.data_aquisicao,
            equipamento.proxima_manutencao,
            equipamento.periodicidade_meses
        ],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn listar_equipamentos(db: State<Db>) -> Result<Vec<Equipamento>, String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare(
            "SELECT id_equipamento, nome, localizacao, data_aquisicao, proxima_manutencao,
                    periodicidade_meses, ativo, motivo_desabilitacao
             FROM equipamentos ORDER BY nome",
        )
        .map_err(|e| e.to_string())?;

    let linhas = stmt
        .query_map([], |r| {
            Ok(Equipamento {
                id_equipamento: r.get(0)?,
                nome: r.get(1)?,
                localizacao: r.get(2)?,
                data_aquisicao: r.get(3)?,
                proxima_manutencao: r.get(4)?,
                periodicidade_meses: r.get(5)?,
                ativo: r.get::<_, i64>(6)? == 1,
                motivo_desabilitacao: r.get(7)?,
            })
        })
        .map_err(|e| e.to_string())?;

    linhas
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())
}

fn validar(e: &NovoEquipamento) -> Result<(), String> {
    if e.nome.trim().is_empty() || e.localizacao.trim().is_empty() {
        return Err("Nome e localização são obrigatórios.".into());
    }
    if e.periodicidade_meses <= 0 {
        return Err("A periodicidade deve ser maior que zero.".into());
    }
    if e.proxima_manutencao < e.data_aquisicao {
        return Err("A próxima manutenção não pode ser anterior à data de aquisição.".into());
    }
    Ok(())
}

#[tauri::command]
pub fn atualizar_equipamento(
    db: State<Db>,
    id: i64,
    equipamento: NovoEquipamento,
) -> Result<(), String> {
    validar(&equipamento)?;
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    conn.execute(
        "UPDATE equipamentos
         SET nome = ?1, localizacao = ?2, data_aquisicao = ?3,
             proxima_manutencao = ?4, periodicidade_meses = ?5
         WHERE id_equipamento = ?6",
        params![
            equipamento.nome.trim(),
            equipamento.localizacao.trim(),
            equipamento.data_aquisicao,
            equipamento.proxima_manutencao,
            equipamento.periodicidade_meses,
            id
        ],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn desabilitar_equipamento(db: State<Db>, id: i64, motivo: String) -> Result<(), String> {
    if motivo.trim().is_empty() {
        return Err("Descreva o motivo da desabilitação.".into());
    }
    let conn = db.0.lock().map_err(|e| e.to_string())?;

    let os_pendentes: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM ordens_servico
             WHERE id_equipamento = ?1 AND status = 'Pendente'",
            params![id],
            |linha| linha.get(0),
        )
        .map_err(|e| e.to_string())?;
    if os_pendentes > 0 {
        return Err("Conclua as OS pendentes deste equipamento antes de desabilitá-lo.".into());
    }

    conn.execute(
        "UPDATE equipamentos SET ativo = 0, motivo_desabilitacao = ?1
         WHERE id_equipamento = ?2",
        params![motivo.trim(), id],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn reabilitar_equipamento(db: State<Db>, id: i64) -> Result<(), String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    conn.execute(
        "UPDATE equipamentos SET ativo = 1, motivo_desabilitacao = NULL
         WHERE id_equipamento = ?1",
        params![id],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}
#[derive(Serialize)]
pub struct Pendencia {
    pub id_equipamento: i64,
    pub nome: String,
    pub localizacao: String,
    pub proxima_manutencao: String,
    pub dias: i64, // negativo = atrasada
}

#[derive(Serialize)]
pub struct ListaPendencias {
    pub tem_pendentes: bool,
    pub itens: Vec<Pendencia>,
}

fn buscar_pendencias(
    conn: &rusqlite::Connection,
    condicao: &str,
) -> Result<Vec<Pendencia>, String> {
    let sql = format!(
        "SELECT id_equipamento, nome, localizacao, proxima_manutencao,
                CAST(julianday(proxima_manutencao) - julianday(date('now', 'localtime')) AS INTEGER)
         FROM equipamentos
         WHERE ativo = 1 AND {condicao}
         ORDER BY proxima_manutencao, nome"
    );
    let mut stmt = conn.prepare(&sql).map_err(|e| e.to_string())?;
    let linhas = stmt
        .query_map([], |r| {
            Ok(Pendencia {
                id_equipamento: r.get(0)?,
                nome: r.get(1)?,
                localizacao: r.get(2)?,
                proxima_manutencao: r.get(3)?,
                dias: r.get(4)?,
            })
        })
        .map_err(|e| e.to_string())?;
    linhas
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn listar_pendencias(db: State<Db>) -> Result<ListaPendencias, String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;

    let pendentes = buscar_pendencias(&conn, "proxima_manutencao <= date('now', 'localtime')")?;
    if !pendentes.is_empty() {
        return Ok(ListaPendencias { tem_pendentes: true, itens: pendentes });
    }

    let proximas = buscar_pendencias(
        &conn,
        "proxima_manutencao > date('now', 'localtime')
         AND proxima_manutencao <= date('now', 'localtime', '+6 months')",
    )?;
    Ok(ListaPendencias { tem_pendentes: false, itens: proximas })
}

#[tauri::command]
pub fn concluir_manutencao(
    db: State<Db>,
    id: i64,
    observacoes: String,
) -> Result<(), String> {
    let mut conn = db.0.lock().map_err(|e| e.to_string())?;
    let tx = conn.transaction().map_err(|e| e.to_string())?;

    let alteradas = tx
        .execute(
            "UPDATE equipamentos
            SET proxima_manutencao = date('now', 'localtime', '+' || periodicidade_meses || ' months')
            WHERE id_equipamento = ?1 AND ativo = 1
               AND proxima_manutencao <= date('now', 'localtime')",
            params![id],
        )
        .map_err(|e| e.to_string())?;
    if alteradas == 0 {
        return Err("Esta manutenção ainda não está pendente.".into());
    }

    let obs = observacoes.trim();
    let obs: Option<&str> = if obs.is_empty() { None } else { Some(obs) };
    tx.execute(
        "INSERT INTO manutencoes (id_equipamento, observacoes) VALUES (?1, ?2)",
        params![id, obs],
    )
    .map_err(|e| e.to_string())?;

    tx.commit().map_err(|e| e.to_string())
}

#[derive(Deserialize)]
pub struct NovaOs {
    pub id_equipamento: i64,
    pub descricao_problema: String,
}

#[derive(Serialize)]
pub struct OsPendente {
    pub id_os: i64,
    pub id_equipamento: i64,
    pub equipamento: String,
    pub localizacao: String,
    pub descricao_problema: String,
    pub data_abertura: String,
}

#[tauri::command]
pub fn criar_os(db: State<Db>, os: NovaOs) -> Result<(), String> {
    if os.descricao_problema.trim().is_empty() {
        return Err("Descreva o que aconteceu com o equipamento.".into());
    }
    let conn = db.0.lock().map_err(|e| e.to_string())?;

    let ativos: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM equipamentos WHERE id_equipamento = ?1 AND ativo = 1",
            params![os.id_equipamento],
            |linha| linha.get(0),
        )
        .map_err(|e| e.to_string())?;
    if ativos == 0 {
        return Err("Selecione um equipamento ativo.".into());
    }

    conn.execute(
        "INSERT INTO ordens_servico (id_equipamento, descricao_problema) VALUES (?1, ?2)",
        params![os.id_equipamento, os.descricao_problema.trim()],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn listar_os_pendentes(db: State<Db>) -> Result<Vec<OsPendente>, String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare(
            "SELECT o.id_os, o.id_equipamento, e.nome, e.localizacao,
                    o.descricao_problema, o.data_abertura
             FROM ordens_servico o
             JOIN equipamentos e ON e.id_equipamento = o.id_equipamento
             WHERE o.status = 'Pendente'
             ORDER BY o.data_abertura, o.id_os",
        )
        .map_err(|e| e.to_string())?;

    let linhas = stmt
        .query_map([], |r| {
            Ok(OsPendente {
                id_os: r.get(0)?,
                id_equipamento: r.get(1)?,
                equipamento: r.get(2)?,
                localizacao: r.get(3)?,
                descricao_problema: r.get(4)?,
                data_abertura: r.get(5)?,
            })
        })
        .map_err(|e| e.to_string())?;

    linhas
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn concluir_os(db: State<Db>, id: i64, observacoes: String) -> Result<(), String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;

    let obs = observacoes.trim();
    let obs: Option<&str> = if obs.is_empty() { None } else { Some(obs) };

    let alteradas = conn
        .execute(
            "UPDATE ordens_servico
             SET status = 'Concluída',
                 data_conclusao = date('now', 'localtime'),
                 observacoes = ?2
             WHERE id_os = ?1 AND status = 'Pendente'",
            params![id, obs],
        )
        .map_err(|e| e.to_string())?;
    if alteradas == 0 {
        return Err("OS não encontrada ou já concluída.".into());
    }
    Ok(())
}

#[derive(Serialize)]
pub struct ManutencaoRealizada {
    pub equipamento: String,
    pub localizacao: String,
    pub data_conclusao: String,
    pub observacoes: Option<String>,
}

#[derive(Serialize)]
pub struct OsConcluida {
    pub id_os: i64,
    pub equipamento: String,
    pub localizacao: String,
    pub descricao_problema: String,
    pub data_abertura: String,
    pub data_conclusao: String,
    pub observacoes: Option<String>,
}

#[tauri::command]
pub fn listar_historico_manutencoes(db: State<Db>) -> Result<Vec<ManutencaoRealizada>, String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare(
            "SELECT e.nome, e.localizacao, m.data_conclusao, m.observacoes
             FROM manutencoes m
             JOIN equipamentos e ON e.id_equipamento = m.id_equipamento
             ORDER BY m.data_conclusao DESC, m.id_manutencao DESC",
        )
        .map_err(|e| e.to_string())?;

    let linhas = stmt
        .query_map([], |r| {
            Ok(ManutencaoRealizada {
                equipamento: r.get(0)?,
                localizacao: r.get(1)?,
                data_conclusao: r.get(2)?,
                observacoes: r.get(3)?,
            })
        })
        .map_err(|e| e.to_string())?;

    linhas
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn listar_historico_os(db: State<Db>) -> Result<Vec<OsConcluida>, String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare(
            "SELECT o.id_os, e.nome, e.localizacao, o.descricao_problema,
                    o.data_abertura, COALESCE(o.data_conclusao, ''), o.observacoes
             FROM ordens_servico o
             JOIN equipamentos e ON e.id_equipamento = o.id_equipamento
             WHERE o.status = 'Concluída'
             ORDER BY o.data_conclusao DESC, o.id_os DESC",
        )
        .map_err(|e| e.to_string())?;

    let linhas = stmt
        .query_map([], |r| {
            Ok(OsConcluida {
                id_os: r.get(0)?,
                equipamento: r.get(1)?,
                localizacao: r.get(2)?,
                descricao_problema: r.get(3)?,
                data_abertura: r.get(4)?,
                data_conclusao: r.get(5)?,
                observacoes: r.get(6)?,
            })
        })
        .map_err(|e| e.to_string())?;

    linhas
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())
}