import { config } from "./config.js"

const git_client_id = config.client_id;
const git_client_secret = config.client_secret;
const repo_name = "beecrowd-problemas";

function utf8ToBase64(str) {
  const bytes = new TextEncoder().encode(str);
  let binary = '';
  for(let e = 0;e<bytes.length;e++){
    binary += String.fromCharCode(bytes[e]);
  }
  return btoa(binary);
}

const storageApi = chrome.storage.session || chrome.storage.local;

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (sender.id !== chrome.runtime.id) {
        console.warn("Validação de segurança, acesso negado"); //Negar envio de qualquer 
        sendResponse({ sucesso: false, erro: "Acesso negado." });
        return false;
    }
    if (message.action === "login_github") {
      console.log("1. Iniciando login...");
      const redirectUri = chrome.identity.getRedirectURL();
      const authUrl = `https://github.com/login/oauth/authorize?client_id=${git_client_id}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=repo`;
      
      chrome.identity.launchWebAuthFlow({
        url: authUrl,
        interactive: true
      }, (redirectUrl) => {
        if (chrome.runtime.lastError || !redirectUrl) {
          console.error("Erro no AuthFlow:", chrome.runtime.lastError);
          sendResponse({ logado: false });
          return;
        }
        
        console.log("2. Autorização concluída. Trocando código por token...");
        const urlParams = new URLSearchParams(new URL(redirectUrl).search);
        const code = urlParams.get("code");
        
        if (code) {
          fetch("https://github.com/login/oauth/access_token", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Accept": "application/json"
            },
            body: JSON.stringify({
              client_id: git_client_id,
              client_secret: git_client_secret,
              code: code,
              redirect_uri: redirectUri
            })
          })
          .then(res => res.json())
          .then(data => {
            console.log("3. Resposta do GitHub recebida:", data);
            const token = data.access_token;
            if (token) {
              console.log("4. Token válido! Buscando usuário...");
              fetch("https://api.github.com/user", {
                headers: { "Authorization": `Bearer ${token}` }
              })
              .then(res => res.json())
              .then(userData => {
                console.log("5. Usuário encontrado:", userData.login);
                storageApi.set({
                  github_token: token,
                  github_username: userData.login
                }, () => {
                  console.log("6. Tudo salvo! Atualizando popup.");
                  sendResponse({ logado: true });
                });
              })
              .catch(err => {
                console.error("Erro ao buscar usuário:", err);
                sendResponse({ logado: false });
              });
            } else {
              console.error("Erro: Token ausente na resposta (Verifique o Client Secret).", data);
              sendResponse({ logado: false });
            }
          })
          .catch(err => {
            console.error("Erro no fetch do token (Possível bloqueio de CORS):", err);
            sendResponse({ logado: false });
          });
        } else {
          console.error("Código não retornado pelo GitHub.");
          sendResponse({ logado: false });
        }
      });
      return true;
    }
  
  if (message.action === "push_git") {
    storageApi.get(["github_token", "github_username"], (storage) => {
      if (!storage.github_token) {
        sendResponse({ sucesso: false, erro: "Nao autenticado" });
        return;
      }
      const token = storage.github_token;
      const owner = storage.github_username;
      const payload = message.payload;
      const path = `${payload.tituloOriginal}/${payload.tituloFormatado}_${payload.id}.${payload.extensao}`;
      const headers = {
        "Authorization": `Bearer ${token}`,
        "Accept": "application/vnd.github.v3+json",
        "Content-Type": "application/json"
      };
      fetch(`https://api.github.com/repos/${owner}/${repo_name}`, { headers })
      .then(res => {
        if (res.status === 404) {
          return fetch("https://api.github.com/user/repos", {
            method: "POST",
            headers: headers,
            body: JSON.stringify({
              name: repo_name,
              description: "Resolucoes do Beecrowd enviadas automaticamente.",
              private: false,
              homepage: "https://judge.beecrowd.com/"
            })
          }).then(() => true);
        }
        return true;
      })
      .then(() => {
        return fetch(`https://api.github.com/repos/${owner}/${repo_name}/contents/${path}`, { headers });
      })
      .then(res => res.status === 404 ? null : res.json())
      .then(fileData => {
        const bodyData = {
          message: `GitBee: Solucao para ${payload.tituloOriginal}`,
          content: utf8ToBase64(payload.codigo)
        };
        
        if (fileData && fileData.sha) {
          bodyData.sha = fileData.sha;
        }
        
        return fetch(`https://api.github.com/repos/${owner}/${repo_name}/contents/${path}`, {
          method: "PUT",
          headers: headers,
          body: JSON.stringify(bodyData)
        });
      })
      .then(res => res.json())
      .then(result => {
        if (result.content) {
          sendResponse({ sucesso: true, detalhes: { owner, repo: repo_name } });
        } else {
          sendResponse({ sucesso: false, erro: "Falha ao gravar arquivo" });
        }
      })
      .catch(err => {
        sendResponse({ sucesso: false, erro: err.message });
      });
    });
    return true;
  }
});