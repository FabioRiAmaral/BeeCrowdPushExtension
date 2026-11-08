import { Octokit } from "@octokit/rest";

const config = { //Configurações globais para o push
    repo_name: "Resoluções-BeeCrowd",
    repo_desc: "Historico de resoluções do site Bee Crowd extraidas e enviadas autoamticamente pela extensão GitHubee. Saiba mais: https://github.com/FabioRiAmaral/BeeCrowdPushExtension",
    allowed_origin: "https://judge.beecrowd.com"
}