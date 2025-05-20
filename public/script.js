const apiBaseUrl = "";

const formBuscar = document.getElementById("form-buscar");
const formAtualizar = document.getElementById("form-atualizar");

let produtoId = null;

formBuscar.addEventListener("submit", async (e) => {
  e.preventDefault();

  const tipo = document.getElementById("tipo-codigo").value;
  const codigo = document.getElementById("codigo").value.trim();

  document.getElementById("mensagem").innerText = "";
  document.getElementById("imagem-produto").style.display = "none";
  document.getElementById("galeria-imagens").innerHTML = "";

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

    if (produto.imagem && typeof produto.imagem === "string") {
      imagemEl.src = produto.imagem;
      imagemEl.alt = "Imagem do Produto";
      imagemEl.style.display = "block";
    } else {
      imagemEl.src = "";
      imagemEl.alt = "Imagem não disponível";
      imagemEl.style.display = "none";
    }

    // Mostrar imagens internas, se houver
    const galeria = document.getElementById("galeria-imagens");
    if (produto.midia?.internas?.length) {
      console.log("🖼️ Imagens internas:", produto.midia.internas);
      produto.midia.internas.forEach((imgObj) => {
        const img = document.createElement("img");
        img.src = imgObj.linkMiniatura || imgObj.link;
        img.alt = "Imagem Interna";
        galeria.appendChild(img);
      });
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
