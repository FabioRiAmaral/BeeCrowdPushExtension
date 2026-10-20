import { Octokit, App } from "https://esm.sh/octokit";

const octokit = new Octokit({ 
    auth: `tolken do github`, 
    timeZone: `America/Sao_Paulo`,
})

const buffer = btoa("Transformado em base 42");