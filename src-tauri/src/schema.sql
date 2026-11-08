CREATE TABLE IF NOT EXISTS usuarios (
    id_usuario INTEGER PRIMARY KEY AUTOINCREMENT,
    usuario    TEXT NOT NULL UNIQUE,
    senha      TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS equipamentos (
    id_equipamento      INTEGER PRIMARY KEY AUTOINCREMENT,
    nome                TEXT NOT NULL,
    localizacao         TEXT NOT NULL,
    data_aquisicao      TEXT NOT NULL,
    ultima_manutencao   TEXT,
    proxima_manutencao  TEXT NOT NULL,
    periodicidade_meses INTEGER NOT NULL CHECK (periodicidade_meses > 0),
    ativo               INTEGER NOT NULL DEFAULT 1 CHECK (ativo IN (0, 1)),
    motivo_desabilitacao TEXT
);

CREATE TABLE IF NOT EXISTS manutencoes (
    id_manutencao  INTEGER PRIMARY KEY AUTOINCREMENT,
    id_equipamento INTEGER NOT NULL REFERENCES equipamentos (id_equipamento),
    data_conclusao TEXT NOT NULL DEFAULT (date('now', 'localtime')),
    observacoes    TEXT
);

CREATE TABLE IF NOT EXISTS ordens_servico (
    id_os              INTEGER PRIMARY KEY AUTOINCREMENT,
    id_equipamento     INTEGER NOT NULL REFERENCES equipamentos (id_equipamento),
    descricao_problema TEXT NOT NULL,
    data_abertura      TEXT NOT NULL DEFAULT (date('now', 'localtime')),
    status             TEXT NOT NULL DEFAULT 'Pendente' CHECK (status IN ('Pendente', 'Concluída')),
    data_conclusao     TEXT,
    observacoes        TEXT
);

INSERT OR IGNORE INTO usuarios (usuario, senha) VALUES ('admin', 'admin123');