const apiBaseUrl = ""; // Preencha se necessário

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

    console.log("📦 Dados recebidos:", dados);

    const produto = dados.retorno.produto;
    produtoId = produto.id;

    document.getElementById("info-produto").style.display = "block";
    document.getElementById("nome-produto").innerText = produto.nome;
    document.getElementById("localizacao-atual").innerText = produto.localizacao?.trim() || "(vazio)";
    document.getElementById("quantidade-produto").innerText = produto.quantidade ?? "(indisponível)";
    document.getElementById("localizacao").value = "";

    const imagemEl = document.getElementById("imagem-produto");

    // ✅ Atualizado para usar a primeira imagem interna (caso exista)
    const imagensInternas = produto.midia?.imagens?.internas;
    if (imagensInternas && imagensInternas.length > 0) {
      imagemEl.src = imagensInternas[0].link;
      imagemEl.alt = "Imagem do Produto";
      imagemEl.style.display = "block";
    } else {
      imagemEl.src = "";
      imagemEl.alt = "Imagem não disponível";
      imagemEl.style.display = "none";
    }

  } catch (erro) {
    console.error("❌ Erro ao buscar produto:", erro);
    alert("Erro ao buscar produto!");
  }
});

formAtualizar.addEventListener("submit", async (e) => {
  e.preventDefault();

  const localizacao = document.getElementById("localizacao").value;

  if (!produtoId) {
    alert("Nenhum produto selecionado!");
    return;
  }

  try {
    const resposta = await fetch(`${apiBaseUrl}/atualizar-localizacao`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ produtoId, localizacao }),
    });

    const dados = await resposta.json();
    document.getElementById("mensagem").innerText = dados.mensagem;
    document.getElementById("localizacao-atual").innerText = localizacao;
  } catch (erro) {
    console.error("❌ Erro ao atualizar localização:", erro);
    alert("Erro ao atualizar localização!");
  }
});
