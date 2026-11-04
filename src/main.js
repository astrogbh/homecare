const { invoke } = window.__TAURI__.core;

const telaLogin = document.querySelector("#tela-login");
const app = document.querySelector("#app");
const formLogin = document.querySelector("#form-login");
const erroLogin = document.querySelector("#login-erro");

// ---------- Navegação ----------
function navegar(nome) {
  document.querySelectorAll(".tela").forEach((t) => {
    t.hidden = t.id !== `tela-${nome}`;
  });
  document.querySelectorAll(".item-menu[data-tela]").forEach((b) => {
    b.classList.toggle("ativo", b.dataset.tela === nome);
  });
  if (nome === "equipamentos") carregarEquipamentos();
  if (nome === "pendencias") carregarPendencias();
  if (nome === "os") carregarOpcoesOs();
  if (nome === "historico") carregarHistorico();
}

document.querySelectorAll(".item-menu[data-tela]").forEach((b) => {
  b.addEventListener("click", () => navegar(b.dataset.tela));
});

document.querySelector("#btn-sair").addEventListener("click", () => {
  app.hidden = true;
  telaLogin.hidden = false;
  formLogin.reset();
});

// ---------- Login ----------
formLogin.addEventListener("submit", async (e) => {
  e.preventDefault();
  erroLogin.hidden = true;

  const usuario = document.querySelector("#login-usuario").value.trim();
  const senha = document.querySelector("#login-senha").value;

  try {
    const ok = await invoke("login", { usuario, senha });
    if (ok) {
      telaLogin.hidden = true;
      app.hidden = false;
      navegar("pendencias");
    } else {
      erroLogin.textContent = "Usuário ou senha inválidos.";
      erroLogin.hidden = false;
    }
  } catch (err) {
    erroLogin.textContent = "Erro: " + err;
    erroLogin.hidden = false;
  }
});

// ---------- Utilidades ----------
function formatarData(iso) {
  const [a, m, d] = iso.split("-");
  return `${d}/${m}/${a}`;
}

function somarMeses(iso, meses) {
  const [a, m, d] = iso.split("-").map(Number);
  const dt = new Date(a, m - 1 + meses, 1);
  const ultimoDia = new Date(dt.getFullYear(), dt.getMonth() + 1, 0).getDate();
  dt.setDate(Math.min(d, ultimoDia));
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  const dd = String(dt.getDate()).padStart(2, "0");
  return `${dt.getFullYear()}-${mm}-${dd}`;
}

function botao(texto, aoClicar) {
  const b = document.createElement("button");
  b.type = "button";
  b.textContent = texto;
  b.className = "secundario pequeno";
  b.addEventListener("click", aoClicar);
  return b;
}

// ---------- Lista de equipamentos ----------
let equipamentosCache = [];

async function carregarEquipamentos() {
  const corpo = document.querySelector("#lista-equipamentos");
  corpo.innerHTML = "";
  try {
    equipamentosCache = await invoke("listar_equipamentos");
    for (const e of equipamentosCache) {
      const tr = document.createElement("tr");
      if (!e.ativo) tr.classList.add("desabilitado");

      const celulas = [
        e.nome,
        e.localizacao,
        formatarData(e.data_aquisicao),
        formatarData(e.proxima_manutencao),
        `${e.periodicidade_meses} meses`,
        e.ativo ? "Ativo" : `Desabilitado: ${e.motivo_desabilitacao}`,
      ];
      for (const texto of celulas) {
        const td = document.createElement("td");
        td.textContent = texto;
        tr.appendChild(td);
      }

      const tdAcoes = document.createElement("td");
      const acoes = document.createElement("div");
      acoes.className = "acoes";
      if (e.ativo) {
        acoes.appendChild(botao("Editar", () => abrirEdicao(e)));
        acoes.appendChild(botao("Desabilitar", () => abrirDesabilitar(e)));
      } else {
        acoes.appendChild(botao("Reabilitar", () => reabilitar(e)));
      }
      tdAcoes.appendChild(acoes);
      tr.appendChild(tdAcoes);

      corpo.appendChild(tr);
    }
  } catch (err) {
    alert("Erro ao listar equipamentos: " + err);
  }
}

// ---------- Cadastro de equipamento ----------
const formEq = document.querySelector("#form-equipamento");
const msgEq = document.querySelector("#eq-msg");
const campoAquisicao = document.querySelector("#eq-aquisicao");
const campoPeriodicidade = document.querySelector("#eq-periodicidade");
const campoProxima = document.querySelector("#eq-proxima");

// Sugere a próxima manutenção (aquisição + periodicidade); o usuário pode alterar.
function sugerirProxima() {
  if (campoAquisicao.value && campoPeriodicidade.value) {
    campoProxima.value = somarMeses(
      campoAquisicao.value,
      Number(campoPeriodicidade.value)
    );
  }
}
campoAquisicao.addEventListener("change", sugerirProxima);
campoPeriodicidade.addEventListener("input", sugerirProxima);

formEq.addEventListener("submit", async (e) => {
  e.preventDefault();
  msgEq.hidden = true;

  const equipamento = {
    nome: document.querySelector("#eq-nome").value,
    localizacao: document.querySelector("#eq-local").value,
    data_aquisicao: campoAquisicao.value,
    proxima_manutencao: campoProxima.value,
    periodicidade_meses: Number(campoPeriodicidade.value),
  };

  try {
    await invoke("cadastrar_equipamento", { equipamento });
    formEq.reset();
    navegar("equipamentos");
  } catch (err) {
    msgEq.textContent = err;
    msgEq.hidden = false;
  }
});

// ---------- Editar equipamento ----------
let idEmEdicao = null;
const formEd = document.querySelector("#form-editar");
const msgEd = document.querySelector("#ed-msg");

function abrirEdicao(e) {
  idEmEdicao = e.id_equipamento;
  document.querySelector("#ed-nome").value = e.nome;
  document.querySelector("#ed-local").value = e.localizacao;
  document.querySelector("#ed-aquisicao").value = e.data_aquisicao;
  document.querySelector("#ed-periodicidade").value = e.periodicidade_meses;
  document.querySelector("#ed-proxima").value = e.proxima_manutencao;
  msgEd.hidden = true;
  navegar("editar");
}

document
  .querySelector("#ed-cancelar")
  .addEventListener("click", () => navegar("equipamentos"));

formEd.addEventListener("submit", async (ev) => {
  ev.preventDefault();
  msgEd.hidden = true;

  const equipamento = {
    nome: document.querySelector("#ed-nome").value,
    localizacao: document.querySelector("#ed-local").value,
    data_aquisicao: document.querySelector("#ed-aquisicao").value,
    proxima_manutencao: document.querySelector("#ed-proxima").value,
    periodicidade_meses: Number(document.querySelector("#ed-periodicidade").value),
  };

  try {
    await invoke("atualizar_equipamento", { id: idEmEdicao, equipamento });
    navegar("equipamentos");
  } catch (err) {
    msgEd.textContent = err;
    msgEd.hidden = false;
  }
});

// ---------- Desabilitar / Reabilitar ----------
const dlg = document.querySelector("#dlg-desabilitar");
const formDlg = document.querySelector("#form-desabilitar");
const msgDlg = document.querySelector("#dlg-msg");
let idParaDesabilitar = null;

function abrirDesabilitar(e) {
  idParaDesabilitar = e.id_equipamento;
  document.querySelector("#dlg-nome").textContent = e.nome;
  document.querySelector("#dlg-motivo").value = "";
  msgDlg.hidden = true;
  dlg.showModal();
}

document
  .querySelector("#dlg-cancelar")
  .addEventListener("click", () => dlg.close());

formDlg.addEventListener("submit", async (ev) => {
  ev.preventDefault();
  try {
    await invoke("desabilitar_equipamento", {
      id: idParaDesabilitar,
      motivo: document.querySelector("#dlg-motivo").value,
    });
    dlg.close();
    carregarEquipamentos();
  } catch (err) {
    msgDlg.textContent = err;
    msgDlg.hidden = false;
  }
});

async function reabilitar(e) {
  try {
    await invoke("reabilitar_equipamento", { id: e.id_equipamento });
    carregarEquipamentos();
  } catch (err) {
    alert("Erro ao reabilitar: " + err);
  }
}

// ---------- Pendências ----------
document.querySelectorAll(".aba").forEach((b) => {
  b.addEventListener("click", () => {
    document.querySelectorAll(".aba").forEach((x) =>
      x.classList.toggle("ativa", x === b)
    );
    document.querySelector("#aba-manutencoes").hidden = b.dataset.aba !== "manutencoes";
    document.querySelector("#aba-os").hidden = b.dataset.aba !== "os";
  });
});

function textoSituacao(dias) {
  if (dias < 0) return `Atrasada há ${-dias} dia(s)`;
  if (dias === 0) return "Vence hoje";
  return `Em ${dias} dia(s)`;
}

async function carregarPendencias() {
  const corpo = document.querySelector("#lista-pendencias");
  const aviso = document.querySelector("#pend-aviso");
  corpo.innerHTML = "";
  carregarOsPendentes(); 

  try {
    const r = await invoke("listar_pendencias");

    if (r.tem_pendentes) {
      aviso.textContent = "";
    } else if (r.itens.length > 0) {
      aviso.textContent =
        "Nenhuma manutenção pendente hoje. Próximas manutenções (6 meses):";
    } else {
      aviso.textContent =
        "Nenhuma manutenção pendente hoje nem prevista para os próximos 6 meses.";
    }

    for (const p of r.itens) {
      const tr = document.createElement("tr");
      const celulas = [
        p.nome,
        p.localizacao,
        formatarData(p.proxima_manutencao),
        textoSituacao(p.dias),
      ];
      celulas.forEach((texto, i) => {
        const td = document.createElement("td");
        td.textContent = texto;
        if (i === 3 && p.dias < 0) td.classList.add("atrasada");
        tr.appendChild(td);
      });

      const tdAcao = document.createElement("td");
      tdAcao.appendChild(botao("Concluir", () => abrirConclusao(p)));
      tr.appendChild(tdAcao);

      corpo.appendChild(tr);
    }
  } catch (err) {
    alert("Erro ao carregar pendências: " + err);
  }
}

// ---------- Abas das Pendências ----------
function mostrarAba(nome) {
  document.querySelectorAll(".aba").forEach((x) =>
    x.classList.toggle("ativa", x.dataset.aba === nome)
  );
  document.querySelector("#aba-manutencoes").hidden = nome !== "manutencoes";
  document.querySelector("#aba-os").hidden = nome !== "os";
}

// ---------- Nova OS ----------
const formOs = document.querySelector("#form-os");
const msgOs = document.querySelector("#os-msg");
const selectOs = document.querySelector("#os-equipamento");

async function carregarOpcoesOs() {
  selectOs.innerHTML = "";
  msgOs.hidden = true;
  try {
    const lista = await invoke("listar_equipamentos");
    const ativos = lista.filter((e) => e.ativo);
    if (ativos.length === 0) {
      const op = document.createElement("option");
      op.value = "";
      op.textContent = "Nenhum equipamento ativo cadastrado";
      selectOs.appendChild(op);
      return;
    }
    for (const e of ativos) {
      const op = document.createElement("option");
      op.value = e.id_equipamento;
      op.textContent = `${e.nome} – ${e.localizacao}`;
      selectOs.appendChild(op);
    }
  } catch (err) {
    alert("Erro ao carregar equipamentos: " + err);
  }
}

formOs.addEventListener("submit", async (ev) => {
  ev.preventDefault();
  msgOs.hidden = true;

  const os = {
    id_equipamento: Number(selectOs.value),
    descricao_problema: document.querySelector("#os-descricao").value,
  };

  try {
    await invoke("criar_os", { os });
    formOs.reset();
    navegar("pendencias");
    mostrarAba("os");
  } catch (err) {
    msgOs.textContent = err;
    msgOs.hidden = false;
  }
});

// ---------- OS pendentes ----------
async function carregarOsPendentes() {
  const corpo = document.querySelector("#lista-os");
  const aviso = document.querySelector("#os-aviso");
  corpo.innerHTML = "";
  try {
    const lista = await invoke("listar_os_pendentes");
    aviso.textContent = lista.length === 0 ? "Nenhuma ordem de serviço pendente." : "";

    for (const o of lista) {
      const tr = document.createElement("tr");
      const celulas = [
        `#${o.id_os}`,
        o.equipamento,
        o.localizacao,
        o.descricao_problema,
        formatarData(o.data_abertura),
      ];
      for (const texto of celulas) {
        const td = document.createElement("td");
        td.textContent = texto;
        tr.appendChild(td);
      }
      const tdAcao = document.createElement("td");
      tdAcao.appendChild(botao("Concluir", () => abrirConclusaoOs(o)));
      tr.appendChild(tdAcao);
      corpo.appendChild(tr);
    }
  } catch (err) {
    alert("Erro ao carregar OS: " + err);
  }
}

// ---------- Concluir (manutenção ou OS) ----------
let concluindo = null; // { tipo: "manutencao" | "os", id }
const formConc = document.querySelector("#form-concluir");
const msgConc = document.querySelector("#conc-msg");

function abrirConclusao(p) {
  concluindo = { tipo: "manutencao", id: p.id_equipamento };
  document.querySelector("#conc-titulo").textContent = "Concluir manutenção";
  document.querySelector("#conc-resumo").textContent =
    `${p.nome} – ${p.localizacao} (previsto para ${formatarData(p.proxima_manutencao)})`;
  document.querySelector("#conc-obs").value = "";
  msgConc.hidden = true;
  navegar("concluir");
}

function abrirConclusaoOs(o) {
  concluindo = { tipo: "os", id: o.id_os };
  document.querySelector("#conc-titulo").textContent = "Concluir ordem de serviço";
  document.querySelector("#conc-resumo").textContent =
    `OS #${o.id_os} – ${o.equipamento} (${o.localizacao}): ${o.descricao_problema}`;
  document.querySelector("#conc-obs").value = "";
  msgConc.hidden = true;
  navegar("concluir");
}

function voltarParaPendencias() {
  navegar("pendencias");
  mostrarAba(concluindo && concluindo.tipo === "os" ? "os" : "manutencoes");
}

document
  .querySelector("#conc-cancelar")
  .addEventListener("click", voltarParaPendencias);

formConc.addEventListener("submit", async (ev) => {
  ev.preventDefault();
  msgConc.hidden = true;
  const comando = concluindo.tipo === "os" ? "concluir_os" : "concluir_manutencao";
  try {
    await invoke(comando, {
      id: concluindo.id,
      observacoes: document.querySelector("#conc-obs").value,
    });
    voltarParaPendencias();
  } catch (err) {
    msgConc.textContent = err;
    msgConc.hidden = false;
  }
});

// ---------- Histórico ----------
document.querySelectorAll(".aba-hist").forEach((b) => {
  b.addEventListener("click", () => {
    document.querySelectorAll(".aba-hist").forEach((x) =>
      x.classList.toggle("ativa", x === b)
    );
    document.querySelector("#hist-manutencoes").hidden = b.dataset.hist !== "manutencoes";
    document.querySelector("#hist-os").hidden = b.dataset.hist !== "os";
  });
});

function preencherTabela(corpo, linhas) {
  corpo.innerHTML = "";
  for (const celulas of linhas) {
    const tr = document.createElement("tr");
    for (const texto of celulas) {
      const td = document.createElement("td");
      td.textContent = texto;
      tr.appendChild(td);
    }
    corpo.appendChild(tr);
  }
}

async function carregarHistorico() {
  try {
    const manutencoes = await invoke("listar_historico_manutencoes");
    document.querySelector("#hist-man-aviso").textContent =
      manutencoes.length === 0 ? "Nenhuma manutenção realizada ainda." : "";
    preencherTabela(
      document.querySelector("#lista-hist-man"),
      manutencoes.map((m) => [
        m.equipamento,
        m.localizacao,
        formatarData(m.data_conclusao),
        m.observacoes ?? "—",
      ])
    );

    const oss = await invoke("listar_historico_os");
    document.querySelector("#hist-os-aviso").textContent =
      oss.length === 0 ? "Nenhuma OS concluída ainda." : "";
    preencherTabela(
      document.querySelector("#lista-hist-os"),
      oss.map((o) => [
        `#${o.id_os}`,
        o.equipamento,
        o.localizacao,
        o.descricao_problema,
        formatarData(o.data_abertura),
        formatarData(o.data_conclusao),
        o.observacoes ?? "—",
      ])
    );
  } catch (err) {
    alert("Erro ao carregar histórico: " + err);
  }
}