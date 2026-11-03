use rusqlite::Connection;
use std::path::Path;
use std::sync::Mutex;

pub struct Db(pub Mutex<Connection>);

pub fn abrir(caminho: &Path) -> rusqlite::Result<Connection> {
    let conn = Connection::open(caminho)?;
    conn.execute_batch("PRAGMA foreign_keys = ON;")?;
    conn.execute_batch(include_str!("schema.sql"))?;
    Ok(conn)
}