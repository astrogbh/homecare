# HomeCare
 
Sistema desktop de **agenda de manutenção residencial**. Permite cadastrar os equipamentos e eletrodomésticos da casa, acompanhar as próximas manutenções e abrir ordens de serviço (OS) quando algo quebra, mantendo tudo registrado em um banco local.
 
> Protótipo acadêmico. A senha do usuário é armazenada sem criptografia (hash) por simplificação.
 
## Sumário
 
- [Funcionalidades](#funcionalidades)
- [Tecnologias](#tecnologias)
- [Pré-requisitos](#pré-requisitos)
- [Como rodar](#como-rodar)
- [Primeiro acesso](#primeiro-acesso)
- [Gerar o instalador](#gerar-o-instalador)
- [Onde fica o banco de dados](#onde-fica-o-banco-de-dados)
- [Regras do sistema](#regras-do-sistema)
- [Estrutura do projeto](#estrutura-do-projeto)
- [Problemas comuns](#problemas-comuns)
## Funcionalidades
 
| Tela | O que faz |
|---|---|
| **Login** | Acesso com usuário e senha previamente cadastrados no banco. |
| **Pendências** | Lista as manutenções vencidas. Se não houver nenhuma, mostra as dos próximos 6 meses. Uma segunda aba lista as OS pendentes. Cada item tem o botão **Concluir**. |
| **Histórico** | Manutenções realizadas e OS concluídas (em desenvolvimento). |
| **Equipamentos** | Lista completa, com ações de **editar**, **desabilitar** (com motivo) e **reabilitar**. Não há exclusão. |
| **Novo equipamento** | Cadastro com nome, localização, data de aquisição, periodicidade (meses) e próxima manutenção. |
| **Nova OS** | Abre uma ordem de serviço para um equipamento, descrevendo o problema. |
| **Concluir manutenção / OS** | Tela de confirmação com campo de observações. |
 
## Tecnologias
 
- **Rust**: lógica do sistema e acesso ao banco
- **Tauri 2**: aplicativo desktop e interface
- **SQLite** (via `rusqlite`): banco de dados local, em um único arquivo
- **HTML, CSS e JavaScript** puros no front-end (sem framework)
## Pré-requisitos
 
Instale tudo abaixo **antes** de rodar o projeto. Siga a seção do seu sistema operacional.
 
### Em qualquer sistema
 
1. **Git**: https://git-scm.com/downloads
2. **Node.js (versão LTS)**: https://nodejs.org
3. **Rust**: https://rustup.rs
Confirme as instalações (reabra o terminal depois de instalar):
 
```bash
git --version
node --version
npm --version
rustc --version
cargo --version
```
 
### Windows
 
1. Instale o **Microsoft C++ Build Tools**: https://visualstudio.microsoft.com/visual-cpp-build-tools/
   Na instalação, marque a carga de trabalho **"Desenvolvimento para desktop com C++"** (*Desktop development with C++*).
2. O **WebView2** já vem instalado no Windows 10 (atualizado) e no Windows 11. Se faltar, baixe em https://developer.microsoft.com/microsoft-edge/webview2/
3. Ao instalar o Rust, use o toolchain padrão **MSVC**. Para conferir:
```powershell
   rustup default stable-msvc
```
 
### macOS
 
Instale as ferramentas de linha de comando da Apple:
 
```bash
xcode-select --install
```
 
### Linux
 
Instale as bibliotecas do sistema usadas pelo Tauri conforme a sua distribuição.
 
**Ubuntu / Debian**
 
```bash
sudo apt update
sudo apt install libwebkit2gtk-4.1-dev build-essential curl wget file \
  libxdo-dev libssl-dev libayatana-appindicator3-dev librsvg2-dev
```
 
**Fedora**
 
```bash
sudo dnf install webkit2gtk4.1-devel openssl-devel curl wget file \
  libappindicator-gtk3-devel librsvg2-devel libxdo-devel
sudo dnf group install "c-development"
```
 
**Arch Linux**
 
```bash
sudo pacman -Syu
sudo pacman -S --needed webkit2gtk-4.1 base-devel curl wget file openssl \
  appmenu-gtk-module libappindicator-gtk3 librsvg xdotool
```
 
## Como rodar
 
1. **Clone o repositório** e entre na pasta:
```bash
   git clone https://github.com/astrogbh/homecare.git
   cd homecare
```
 
2. **Instale as dependências do front-end:**
```bash
   npm install
```
 
3. **Rode o aplicativo em modo de desenvolvimento:**
```bash
   npm run tauri dev
```
 
   > A **primeira execução demora vários minutos**, porque o Rust compila todas as dependências do zero. As seguintes são bem mais rápidas.
 
Quando a compilação terminar, a janela do HomeCare abre sozinha. No terminal aparece uma linha como `Banco em: ...homecare.db`, indicando onde o banco foi criado.
 
Ao salvar arquivos de `src/`, a interface recarrega. Ao alterar arquivos de `src-tauri/`, o Rust recompila e o app reinicia.
 
## Primeiro acesso
 
O banco já é criado com um usuário inicial:
 
| Usuário | Senha |
|---|---|
| `admin` | `admin123` |
 
Para trocar esse usuário, edite a última linha de `src-tauri/src/schema.sql` **antes da primeira execução** (ou apague o banco, veja abaixo).
 
## Gerar o instalador
 
Para gerar o aplicativo instalável do seu sistema operacional:
 
```bash
npm run tauri build
```
 
Os arquivos finais ficam em `src-tauri/target/release/bundle/` (por exemplo `.msi` ou `.exe` no Windows, `.dmg` ou `.app` no macOS, `.deb`, `.rpm` ou `.AppImage` no Linux). Só é possível gerar o instalador do sistema em que você está rodando o comando.
 
## Onde fica o banco de dados
 
O banco é um único arquivo chamado `homecare.db`, criado automaticamente na primeira execução. Ele **não fica dentro da pasta do projeto**:
 
| Sistema | Caminho |
|---|---|
| Windows | `C:\Users\<usuário>\AppData\Roaming\com.homecare.app\homecare.db` |
| macOS | `~/Library/Application Support/com.homecare.app/homecare.db` |
| Linux | `~/.local/share/com.homecare.app/homecare.db` |
 
**Para zerar os dados:** feche o aplicativo e apague o arquivo `homecare.db`. Ele será recriado, vazio e com o usuário `admin`, na próxima execução.
 
**Para fazer backup:** copie o arquivo `homecare.db` com o aplicativo fechado.
 
### Tabelas
 
| Tabela | Conteúdo |
|---|---|
| `usuarios` | Usuários com acesso ao sistema |
| `equipamentos` | Equipamentos, periodicidade, próxima manutenção e situação (ativo/desabilitado) |
| `manutencoes` | Histórico de manutenções realizadas |
| `ordens_servico` | Ordens de serviço (Pendente ou Concluída) |
 
## Regras do sistema
 
- Um equipamento está **pendente** quando a data da próxima manutenção é igual ou anterior a hoje.
- Ao **concluir uma manutenção**, o sistema grava o registro no histórico e define a próxima data como **hoje + periodicidade**.
- Equipamentos **não são excluídos**, apenas desabilitados, com o motivo registrado. Um equipamento desabilitado sai das pendências e não aceita novas OS.
- Não é possível desabilitar um equipamento que ainda tenha **OS pendente**.
- Uma OS tem dois status: **Pendente** e **Concluída**. Concluir uma OS não altera a data da próxima manutenção programada.
## Estrutura do projeto
 
```
homecare/
├── src/                      Interface (front-end)
│   ├── index.html            Todas as telas
│   ├── main.js               Navegação e chamadas ao Rust
│   └── styles.css            Estilos
├── src-tauri/                Back-end em Rust
│   ├── src/
│   │   ├── lib.rs            Inicialização do app e registro dos comandos
│   │   ├── commands.rs       Comandos chamados pela interface
│   │   ├── db.rs             Abertura do banco de dados
│   │   └── schema.sql        Criação das tabelas e usuário inicial
│   ├── Cargo.toml            Dependências do Rust
│   └── tauri.conf.json       Configuração do aplicativo
├── package.json              Dependências e scripts do front-end
└── README.md
```
 
## Problemas comuns
 
| Problema | Solução |
|---|---|
| `link.exe not found` (Windows) | O Microsoft C++ Build Tools não foi instalado, ou falta a carga de trabalho "Desktop development with C++". |
| `linker 'cc' not found` ou erro em `webkit2gtk` / `glib-sys` (Linux) | Faltam as bibliotecas do sistema. Rode o comando da sua distribuição na seção [Linux](#linux). |
| `xcrun: error` ou `invalid active developer path` (macOS) | Rode `xcode-select --install`. |
| `cargo`, `rustc` ou `node` "não é reconhecido" | Feche e reabra o terminal depois de instalar. Se persistir, confira se o Rust e o Node foram adicionados ao PATH. |
| `npm run tauri` não funciona | Rode `npm install` primeiro, na pasta do projeto. |
| A janela abre em branco | Aperte **Ctrl+Shift+I** (ou **Cmd+Option+I** no macOS), abra a aba **Console** e veja se há erro em vermelho. |
| Erro de compilação ao mudar arquivos `.rs` | Leia a mensagem no terminal. Os erros do Rust indicam o arquivo e a linha. |
| Esqueci a senha | Apague o `homecare.db` (veja [Onde fica o banco de dados](#onde-fica-o-banco-de-dados)) para recriar o usuário `admin`. Isso apaga todos os dados. |