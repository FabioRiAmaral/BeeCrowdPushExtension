let payloadParaEnvio = null;
let repoUrlGitHub = "https://github.com/FabioRiAmaral/BeeCrowdPushExtension";

function mostrarTela(idTela) {
  document.querySelectorAll('.screen').forEach(screen => {
    screen.classList.remove('active');
  });
  document.getElementById(idTela).classList.add('active');
}

document.addEventListener('DOMContentLoaded', () => {
  const storageApi = chrome.storage.session || chrome.storage.local;
  
  storageApi.get(["github_token", "github_username"], (storage) => { // Verifica o login e vai pra proxima tela do html
    if (storage.github_token && storage.github_username) {
      document.getElementById('user-name-ready').innerText = storage.github_username;
      document.getElementById('user-name-success').innerText = storage.github_username;
      mostrarTela('screen-ready');
      iniciarDeteccao();
    } else {
      mostrarTela('screen-login');
    }
  });
});

function iniciarDeteccao() {
  const btnSend = document.getElementById("btn-send");
  const statusPanel = document.getElementById("status-detection");

  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const tab = tabs[0];
    let urlTexto = tab.url.length > 35 ? tab.url.substring(0, 35) + "..." : tab.url;
    document.getElementById("val-url").innerText = urlTexto;
    document.getElementById("val-url").href = tab.url;
    const isBeecrowd = tab.url.includes("judge.beecrowd.com");
    const isRunsCode = tab.url.includes("runs/code");
    
    if (!isBeecrowd || !isRunsCode) {
      statusPanel.innerText = "Abra a página de uma submissão no Beecrowd.";
      statusPanel.style.color = "#da3633";
      return;
    }
    
    chrome.tabs.sendMessage(tab.id, { action: "extrair_codigo" }, (resposta) => {
      if (chrome.runtime.lastError) {
        statusPanel.innerText = "Ocorreu um erro, tente recarregar a pagina";
        statusPanel.style.color = "#da3633";
        return;
      }
      
      if (resposta && resposta.sucesso) {
        statusPanel.innerText = "Detectamos o seu código";
        statusPanel.style.color = "#ffffff";
        document.getElementById("val-title").innerText = resposta.tituloOriginal;
        document.getElementById("val-id-lang").innerText = `${resposta.id} (Linguagem Utilizada: ${resposta.linguagem})`;
        document.getElementById("val-folder").innerText = `${resposta.tituloOriginal}/`;
        document.getElementById("val-file").innerText = `${resposta.tituloFormatado}_${resposta.id}.${resposta.extensao}`;
        btnSend.disabled = false;
        payloadParaEnvio = resposta;
      } else {
        statusPanel.innerText = "A extensão não conseguiu identificar o código :(";
        statusPanel.style.color = "#da3633";
      }
    });
  });
}

document.getElementById('btn-login').addEventListener('click', () => {
  const btn = document.getElementById('btn-login');
  btn.innerHTML = "Autenticando...";
  btn.disabled = true;
  
  chrome.runtime.sendMessage({ action: "login_github" }, (response) => {
    if (response && response.logado) {
      window.location.reload();
    } else {
      btn.innerHTML = '<img src="./icons/gitIcon.png" class="icon"> Logar com o GitHub';
      btn.disabled = false;
    }
  });
});

document.getElementById('btn-send').addEventListener('click', () => {
  if (!payloadParaEnvio) return;
  
  const btn = document.getElementById('btn-send');
  btn.innerText = "Enviando...";
  btn.disabled = true;
  
  chrome.runtime.sendMessage({ action: "push_git", payload: payloadParaEnvio }, (response) => {
    if (response && response.sucesso) {
      const caminhoArquivo = `${payloadParaEnvio.tituloOriginal}/${payloadParaEnvio.tituloFormatado}_${payloadParaEnvio.id}.${payloadParaEnvio.extensao}`;
      document.getElementById("val-dest").innerText = caminhoArquivo;
      repoUrlGitHub = `https://github.com/${response.detalhes.owner}/${response.detalhes.repo}`;
      mostrarTela('screen-success');
    } else {
      btn.innerText = "PROCURAR & ENVIAR";
      btn.disabled = false;
    }
  });
});

document.getElementById('btn-github').addEventListener('click', () => {
  chrome.tabs.create({ url: repoUrlGitHub });
});

document.getElementById('btn-close').addEventListener('click', () => {
  window.close();
});