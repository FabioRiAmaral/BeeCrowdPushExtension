function extrairCodigoCodeRun() {
  const scripts = document.querySelectorAll('script');
  for (const script of scripts) {
    if (script.textContent.includes('let codeRun')) {
      const match = script.textContent.match(/let\s+codeRun\s*=\s*`([\s\S]*?)`/);
      if (match && match[1]) {
        return match[1]; 
      }
    }
  }
  return null;
}

function extrairMetadados() {
  let tituloOriginal = "Questao_Sem_Nome";
  let linguagem = "cpp";
  const problemLink = document.querySelector('#information-code dd a[href*="/problems/view/"]');
  if (problemLink && problemLink.innerText) {
    tituloOriginal = problemLink.innerText.trim(); 
  } else {
    const fallbackLink = document.querySelector('a[href*="/problems/view/"]');
    if (fallbackLink && fallbackLink.innerText) {
      tituloOriginal = fallbackLink.innerText.trim();
    }
  }
  
  let tituloFormatado = tituloOriginal.replace(/\s*-\s*/g, '-').replace(/\s+/g, '');
  
  const corpoTexto = document.body.innerText.toLowerCase();
  if (corpoTexto.includes("python")) linguagem = "py";
  else if (corpoTexto.includes("java") && !corpoTexto.includes("javascript")) linguagem = "java";
  else if (corpoTexto.includes("javascript") || corpoTexto.includes("node")) linguagem = "js";
  else if (corpoTexto.includes("c#")) linguagem = "cs";
  else if (corpoTexto.includes("c++") || corpoTexto.includes("g++")) linguagem = "cpp";
  else if (corpoTexto.includes(" c ") || corpoTexto.includes("gcc")) linguagem = "c";
  
  return {
    tituloOriginal,
    tituloFormatado,
    linguagem,
    extensao: linguagem 
  };
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "extrair_codigo") {
    const codigo = extrairCodigoCodeRun();
    if (codigo) {
      const urlParts = window.location.pathname.split('/');
      const submissaoId = urlParts[urlParts.length - 1];
      const metadados = extrairMetadados();   
      sendResponse({ 
        sucesso: true, 
        id: submissaoId,
        tituloOriginal: metadados.tituloOriginal,
        tituloFormatado: metadados.tituloFormatado,
        linguagem: metadados.linguagem,
        extensao: metadados.extensao,
        codigo: codigo
      });
    } else {
      sendResponse({ sucesso: false });
    }
  }
  return true; 
});