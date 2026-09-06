# PONTO DO DIA

Sorteia um tema de tênis, estuda 15 minutos, explica em 1 minuto.
Duas versões do mesmo site, uma tela só, sem rolagem.

| | |
|---|---|
| `index.html` | Versão **quadra** — retângulo verde, tema e cronômetro dentro dele |
| `diagonal.html` | Versão **diagonal** — tema na faixa inclinada, cronômetro dentro da bola |
| `app.js` | O motor. As duas páginas usam este mesmo arquivo |
| `data/themes.js` | A lista de temas |
| `sync-tally.mjs` | Traz os temas novos do formulário |

## Como funciona

`app.js` lê a lista de `data/themes.js`, sorteia uma linha e conduz os momentos:

**sortear → tema de hoje → estudar 15 min → acabou o estudo → explicar 1 min → ponto encerrado**

Os botões trocam sozinhos conforme o momento. A barra de espaço sorteia e pausa, e na versão quadra
dá pra clicar em qualquer lugar do retângulo verde pra sortear.

Enquanto o tempo corre, a bolinha vai enchendo de um amarelo mais escuro, de baixo pra cima.

Nunca repete um tema antes de passar por todos. O tempo continua contando certo mesmo se você trocar
de aba pra estudar.

## Sons

- pancada de raquete a cada giro do sorteio, mais forte quando o tema para
- dois apitos quando acabam os 15 minutos de estudo
- três notas subindo quando acaba o minuto de fala

## Tirar um tema que você não quer

Abra `data/themes.js`, apague a linha inteira, salve.

```js
{ id: "t06", title: "Kick serve: como funciona e quando usar", by: "" },   ← apague esta linha
```

Não volta nunca mais, nem quando você sincronizar de novo.
Pra adicionar à mão é o contrário: copia uma linha, cola embaixo, troca o texto. O `id` só precisa ser diferente dos outros.

## Trazer os temas do formulário

Formulário: https://tally.so/r/Np1RQW — pergunta o nome e o tema, só isso.

```bash
export TALLY_API_KEY="tly-..."
node sync-tally.mjs
```

A chave sai em Tally → Settings → API keys. O script **só adiciona no fim da lista**.

## Mudar os tempos

Nas duas primeiras linhas de `app.js`:

```js
var ESTUDO = 15;   // minutos de estudo
var FALA   = 1;    // minutos de fala
```

Muda nos dois sites de uma vez.

## Rodar

```bash
python3 -m http.server 8477 --directory .
```

http://localhost:8477 (quadra) e http://localhost:8477/diagonal.html (diagonal).

## Cores e letras

Creme `#f5ead8` · azul `#002776` · verde `#009739` · amarelo `#ffdf00` · verde escuro `#00432a`
Títulos e botões em **Caprasimo**, etiquetas em **Figtree**. Trama de meio-tom por cima de tudo.
