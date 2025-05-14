const express    = require("express");
const axios      = require("axios");
const cors       = require("cors");
const path       = require("path");
const bodyParser = require("body-parser");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

let accessToken = "";
const USUARIO = "giestoque@goodimport";
const SENHA    = "giestoque@2025";
const sleep    = ms => new Promise(r => setTimeout(r, ms));

app.get("/", (_, res) => res.redirect("/login"));

app.get("/login", (_, res) =>
  res.sendFile(path.join(__dirname, "public", "login.html"))
);

app.post("/login", (req, res) => {
  const { usuario, senha } = req.body;
  if (usuario === USUARIO && senha === SENHA) {
    return res.sendFile(path.join(__dirname, "public", "index.html"));
  }
  return res.send("❌ Usuário ou senha inválidos.");
});

app.get("/auth", (req, res) => {
  const state = Math.random().toString(36).slice(2);
  const url =
    `https://www.bling.com.br/Api/v3/oauth/authorize?response_type=code` +
    `&client_id=${process.env.BLING_CLIENT_ID}` +
    `&redirect_uri=${process.env.REDIRECT_URI}` +
    `&scope=produtos_write` +
    `&state=${state}`;
  res.redirect(url);
});

app.get("/callback", async (req, res) => {
  const { code } = req.query;
  if (!code) return res.status(400).send("Código de autorização ausente.");

  const basicAuth = Buffer.from(
    `${process.env.BLING_CLIENT_ID}:${process.env.BLING_CLIENT_SECRET}`
  ).toString("base64");

  try {
    const { data } = await axios.post(
      "https://www.bling.com.br/Api/v3/oauth/token",
      new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: process.env.REDIRECT_URI,
      }).toString(),
      { headers: { Authorization: `Basic ${basicAuth}` } }
    );
    accessToken = data.access_token;
    res.redirect("/login");
  } catch (e) {
    console.error(e.response?.data || e.message);
    res.status(500).send("Erro ao autenticar no Bling.");
  }
});

app.get("/buscar-produto/:tipo/:codigo", async (req, res) => {
  const { tipo, codigo } = req.params;
  if (!accessToken) return res.status(403).json({ mensagem: "Faça login via /auth." });

  try {
    let produtoCompleto;

    if (tipo === "sku") {
      const skuResp = await axios.get(
        `https://www.bling.com.br/Api/v3/produtos?sku=${codigo}`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      const resumo = skuResp.data?.data?.[0];
      if (!resumo) throw new Error("Produto não encontrado por SKU.");
      const detResp = await axios.get(
        `https://www.bling.com.br/Api/v3/produtos/${resumo.id}`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      produtoCompleto = detResp.data?.data;

    } else if (tipo === "ean") {
      const eanNorm = codigo.replace(/^0+/, "");
      let pagina = 1, encontrado = null, achou = false;

      while (!achou) {
        const pageResp = await axios.get(
          `https://www.bling.com.br/Api/v3/produtos?page=${pagina}&limit=100`,
          { headers: { Authorization: `Bearer ${accessToken}` } }
        );
        const lista = pageResp.data?.data || [];
        if (!lista.length) break;

        for (const item of lista) {
          await sleep(300);
          const pResp = await axios.get(
            `https://www.bling.com.br/Api/v3/produtos/${item.id}`,
            { headers: { Authorization: `Bearer ${accessToken}` } }
          );
          const pr = pResp.data?.data;
          if (pr.gtin?.replace(/^0+/, "") === eanNorm) { encontrado = pr; achou = true; break; }
          if (pr.variacoes?.length) {
            const v = pr.variacoes.find(v => v.gtin?.replace(/^0+/, "")===eanNorm);
            if (v) { pr.variacaoEncontrada = v; encontrado = pr; achou = true; break; }
          }
          if (pr.itens?.length) {
            const kit = pr.itens.find(i => i.gtin?.replace(/^0+/, "")===eanNorm);
            if (kit) { pr.itemKitEncontrado = kit; encontrado = pr; achou = true; break; }
          }
        }
        pagina++;
      }
      if (!encontrado) throw new Error("Produto com esse EAN não encontrado.");
      produtoCompleto = encontrado;

    } else {
      return res.status(400).json({ mensagem: "Tipo inválido. Use 'sku' ou 'ean'." });
    }

    // Monta URL de imagem (externa ou anexo)
    const ext   = produtoCompleto.midia?.imagens?.externas;
    const anexo = produtoCompleto.midia?.imagens?.anexos;
    let imagem = null;
    if (Array.isArray(ext) && ext.length) {
      imagem = ext[0].link;
    } else if (Array.isArray(anexo) && anexo.length) {
      imagem = `https://www.bling.com.br/Imagens/Produtos/${produtoCompleto.id}/${anexo[0].id}/imagem.jpg`;
    }

    res.json({
      retorno: {
        produto: {
          id: produtoCompleto.id,
          nome: produtoCompleto.nome,
          localizacao: produtoCompleto.estoque?.localizacao || "",
          imagem,
          quantidade: produtoCompleto.estoque?.saldoVirtualTotal || 0
        }
      }
    });
  } catch (erro) {
    console.error(erro.response?.data || erro.message);
    res.status(404).json({ mensagem: "Produto não encontrado." });
  }
});

// Rota completa de atualização de localização:
app.post("/atualizar-localizacao", async (req, res) => {
  const { produtoId, localizacao } = req.body;
  if (!accessToken) return res.status(403).json({ mensagem: "Faça login via /auth." });
  if (!produtoId || typeof localizacao !== "string") return res.status(400).json({ mensagem: "Dados inválidos." });

  try {
    const resp = await axios.get(
      `https://www.bling.com.br/Api/v3/produtos/${produtoId}`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    const produtoAtual = resp.data?.data;
    if (!produtoAtual) return res.status(404).json({ mensagem: "Produto não encontrado." });

    const { camposCustomizados, info, ...dadosLimpos } = produtoAtual;
    const payload = { ...dadosLimpos, estoque: { ...(produtoAtual.estoque||{}), localizacao } };

    await axios.put(
      `https://www.bling.com.br/Api/v3/produtos/${produtoId}`,
      payload,
      { headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" } }
    );

    res.json({ mensagem: "Localização atualizada com sucesso!" });
  } catch (erro) {
    console.error(erro.response?.data || erro.message);
    res.status(500).json({ mensagem: "Erro ao atualizar localização.", detalhe: erro.response?.data||erro.message });
  }
});

const PORT = process.env.PORT||3000;
app.listen(PORT, () => console.log(`✅ Servidor rodando na porta ${PORT}`));
