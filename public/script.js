const apiBaseUrl = "";

const formBuscar = document.getElementById("form-buscar");
const formAtualizar = document.getElementById("form-atualizar");
let produtoId = null;

formBuscar.addEventListener("submit", async (e) => {
  e.preventDefault();
  const tipo = document.getElementById("tipo-codigo").value;
  const codigo = document.getElementById("codigo").value.trim();
  document.getElementById("mensagem").innerText = "";

  try {
    const resposta = await fetch(`${apiBaseUrl}/buscar-produto/${tipo}/${codigo}`);
    const dados = await resposta.json();
    const produto = dados.retorno.produto;

    document.getElementById("info-produto").style.display = "block";
    document.getElementById("nome-produto").innerText = produto.nome;
    document.getElementById("quantidade-produto").innerText = produto.quantidade;
    document.getElementById("localizacao-atual").innerText = produto.localizacao || "(vazio)";

    const imagemEl = document.getElementById("imagem-produto");
    if (produto.imagem) {
      imagemEl.src = produto.imagem;
      imagemEl.alt = "Imagem do Produto";
      imagemEl.style.display = "block";
    } else {
      imagemEl.style.display = "none";
    }
    produtoId = produto.id;
  } catch (erro) {
    console.error(erro);
    alert("Erro ao buscar produto!");
  }
});

formAtualizar.addEventListener("submit", async (e) => {
  e.preventDefault();
  const localizacao = document.getElementById("localizacao").value;
  if (!produtoId) return alert("Nenhum produto selecionado!");

  try {
    const resposta = await fetch(`${apiBaseUrl}/atualizar-localizacao`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ produtoId, localizacao }),
    });
    const dados = await resposta.json();
    document.getElementById("mensagem").innerText = dados.mensagem;
    document.getElementById("localizacao-atual").innerText = localizacao;
  } catch (erro) {
    console.error(erro);
    alert("Erro ao atualizar localização!");
  }
});