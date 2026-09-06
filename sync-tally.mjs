#!/usr/bin/env node
/**
 * Traz os temas novos do Tally pra dentro de data/themes.js.
 *
 *   export TALLY_API_KEY="tly-..."
 *   node sync-tally.mjs
 *
 * Só ADICIONA no fim da lista. Nunca mexe no que já está lá.
 * Se você apagou um tema à mão, ele não volta.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createContext, runInContext } from "node:vm";

const FORM_ID = process.env.TALLY_FORM_ID || "Np1RQW";
const API_KEY = process.env.TALLY_API_KEY;
const FILE = join(dirname(fileURLToPath(import.meta.url)), "data", "themes.js");

const Q_NOME = "b225bdb4-19bd-410c-9c7e-f7644c4ee7b5";
const Q_TEMA = "3ad7905d-d676-43c4-b019-4ced0a115689";

if (!API_KEY) {
  console.error('Falta a chave. Rode:  export TALLY_API_KEY="tly-..."');
  process.exit(1);
}

/* --- lê o arquivo atual --- */
const sandbox = { window: {} };
createContext(sandbox);
runInContext(readFileSync(FILE, "utf8"), sandbox);
const themes = sandbox.window.SHOT_THEMES || [];
const merged = new Set(sandbox.window.SHOT_MERGED || []);

/* --- busca no Tally --- */
async function getPage(n) {
  const res = await fetch(
    `https://api.tally.so/forms/${FORM_ID}/submissions?page=${n}&filter=completed`,
    { headers: { Authorization: `Bearer ${API_KEY}` } }
  );
  if (!res.ok) throw new Error(`Tally respondeu ${res.status}: ${await res.text()}`);
  return res.json();
}

const answer = (sub, qid) => {
  const r = (sub.responses || []).find((x) => x.questionId === qid);
  const v = r?.value;
  return (Array.isArray(v) ? v.join(" ") : v ?? "").toString().trim();
};

const chegando = [];
let page = 1, more = true, total = 0;

while (more) {
  const data = await getPage(page);
  for (const sub of data.submissions || []) {
    total++;
    if (merged.has(sub.id)) continue;
    const titulo = answer(sub, Q_TEMA);
    merged.add(sub.id);
    if (!titulo) continue;
    chegando.push({
      id: "s" + sub.id.slice(-6),
      title: titulo.charAt(0).toUpperCase() + titulo.slice(1),
      by: answer(sub, Q_NOME),
    });
  }
  more = Boolean(data.hasMore);
  page++;
}

/* --- reescreve o arquivo --- */
const todos = themes.concat(chegando);
const linha = (t) =>
  `  { id: ${JSON.stringify(t.id)}, title: ${JSON.stringify(t.title)}, by: ${JSON.stringify(t.by || "")} }`;

writeFileSync(
  FILE,
  `/* A LISTA DE TEMAS DA ROLETA.
   Para tirar um tema: apague a linha inteira dele e salve. Ele não volta mais.
   Para adicionar à mão: copie uma linha e troque o texto.
   O "id" só precisa ser diferente de todos os outros. */
window.SHOT_THEMES = [
${todos.map(linha).join(",\n")}
];

/* Respostas do Tally que já foram trazidas pra cá. Não mexa. */
window.SHOT_MERGED = ${JSON.stringify([...merged], null, 2)};
`,
  "utf8"
);

console.log(`${total} respostas no Tally · ${chegando.length} tema(s) novo(s) · ${todos.length} na roleta`);
chegando.forEach((t) => console.log("  + " + t.title + (t.by ? "  — " + t.by : "")));
