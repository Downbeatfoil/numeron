/* numeron — a calculator that talks back.
   everything here is hand-rolled: a tokenizer, a shunting-yard parser into RPN,
   an RPN evaluator, a number-analysis panel, and a canvas grapher.
   no math libraries. that's the point. */

"use strict";

/* ------------------------------------------------------------------ *
 *  1. tokenizer
 * ------------------------------------------------------------------ */
const FUNCS = {
  sin: Math.sin, cos: Math.cos, tan: Math.tan,
  asin: Math.asin, acos: Math.acos, atan: Math.atan,
  log: (x) => Math.log10(x), ln: Math.log,
  sqrt: Math.sqrt, abs: Math.abs, exp: Math.exp,
  floor: Math.floor, ceil: Math.ceil, round: Math.round,
};
const CONSTS = { pi: Math.PI, e: Math.E, tau: Math.PI * 2 };
// operator: [precedence, right-associative?]
const OPS = { "+": [2, false], "-": [2, false], "*": [3, false], "/": [3, false], "%": [3, false], "^": [4, true] };

function tokenize(src) {
  const t = [];
  let i = 0;
  const isDigit = (c) => c >= "0" && c <= "9";
  const isAlpha = (c) => (c >= "a" && c <= "z") || (c >= "A" && c <= "Z");

  while (i < src.length) {
    const c = src[i];
    if (c === " ") { i++; continue; }

    if (isDigit(c) || (c === "." && isDigit(src[i + 1]))) {
      let n = "";
      while (i < src.length && (isDigit(src[i]) || src[i] === ".")) n += src[i++];
      if ((n.match(/\./g) || []).length > 1) throw new Error("bad number");
      t.push({ t: "num", v: parseFloat(n) });
      continue;
    }
    if (isAlpha(c)) {
      let w = "";
      while (i < src.length && (isAlpha(src[i]) || isDigit(src[i]))) w += src[i++];
      w = w.toLowerCase();
      if (FUNCS[w]) t.push({ t: "func", v: w });
      else if (w in CONSTS) t.push({ t: "num", v: CONSTS[w] });
      else if (w === "x") t.push({ t: "var" });
      else throw new Error("unknown name: " + w);
      continue;
    }
    if (c === "!") { t.push({ t: "fact" }); i++; continue; }
    if (c === "(") { t.push({ t: "lp" }); i++; continue; }
    if (c === ")") { t.push({ t: "rp" }); i++; continue; }
    if (c in OPS) { t.push({ t: "op", v: c }); i++; continue; }
    throw new Error("unexpected: " + c);
  }
  return t;
}

/* ------------------------------------------------------------------ *
 *  2. shunting-yard: infix tokens -> RPN, with unary minus handling
 * ------------------------------------------------------------------ */
function toRPN(tokens) {
  const out = [];
  const stack = [];
  let prev = null; // to detect unary minus

  for (const tok of tokens) {
    if (tok.t === "num" || tok.t === "var") {
      out.push(tok);
    } else if (tok.t === "func") {
      stack.push(tok);
    } else if (tok.t === "fact") {
      out.push(tok); // postfix, binds to previous value
    } else if (tok.t === "op") {
      // unary minus / plus
      const isUnary = tok.v === "-" && (prev === null || prev.t === "op" || prev.t === "lp");
      if (isUnary) {
        out.push({ t: "num", v: 0 });
        stack.push({ t: "op", v: "-" });
      } else {
        const [p, rightAssoc] = OPS[tok.v];
        while (stack.length) {
          const top = stack[stack.length - 1];
          if (top.t === "op") {
            const [tp] = OPS[top.v];
            if (tp > p || (tp === p && !rightAssoc)) { out.push(stack.pop()); continue; }
          }
          break;
        }
        stack.push(tok);
      }
    } else if (tok.t === "lp") {
      stack.push(tok);
    } else if (tok.t === "rp") {
      while (stack.length && stack[stack.length - 1].t !== "lp") out.push(stack.pop());
      if (!stack.length) throw new Error("mismatched )");
      stack.pop(); // drop lp
      if (stack.length && stack[stack.length - 1].t === "func") out.push(stack.pop());
    }
    prev = tok;
  }
  while (stack.length) {
    const s = stack.pop();
    if (s.t === "lp") throw new Error("mismatched (");
    out.push(s);
  }
  return out;
}

function factorial(n) {
  if (n < 0 || !Number.isInteger(n)) throw new Error("n! needs a whole number ≥ 0");
  if (n > 170) return Infinity;
  let r = 1;
  for (let k = 2; k <= n; k++) r *= k;
  return r;
}

/* ------------------------------------------------------------------ *
 *  3. evaluate RPN. xVal substitutes for the variable x.
 * ------------------------------------------------------------------ */
function evalRPN(rpn, xVal) {
  const s = [];
  for (const tok of rpn) {
    if (tok.t === "num") s.push(tok.v);
    else if (tok.t === "var") {
      if (xVal === undefined) throw new Error("x only works in the grapher");
      s.push(xVal);
    } else if (tok.t === "fact") {
      s.push(factorial(s.pop()));
    } else if (tok.t === "func") {
      s.push(FUNCS[tok.v](s.pop()));
    } else if (tok.t === "op") {
      const b = s.pop(), a = s.pop();
      if (a === undefined || b === undefined) throw new Error("not enough numbers");
      switch (tok.v) {
        case "+": s.push(a + b); break;
        case "-": s.push(a - b); break;
        case "*": s.push(a * b); break;
        case "/": s.push(a / b); break;
        case "%": s.push(a % b); break;
        case "^": s.push(Math.pow(a, b)); break;
      }
    }
  }
  if (s.length !== 1) throw new Error("malformed expression");
  return s[0];
}

function compile(src) {
  const rpn = toRPN(tokenize(src));
  const usesX = rpn.some((t) => t.t === "var");
  return { rpn, usesX };
}

/* ------------------------------------------------------------------ *
 *  4. number analysis — the "talks back" part
 * ------------------------------------------------------------------ */
function primeFactors(n) {
  const f = [];
  let d = 2;
  while (d * d <= n) {
    while (n % d === 0) { f.push(d); n /= d; }
    d += d === 2 ? 1 : 2;
  }
  if (n > 1) f.push(n);
  return f;
}
function factorString(n) {
  const f = primeFactors(n);
  const counts = {};
  f.forEach((p) => (counts[p] = (counts[p] || 0) + 1));
  return Object.entries(counts)
    .map(([p, c]) => (c > 1 ? `${p}^${c}` : `${p}`))
    .join(" × ");
}
function toRoman(n) {
  if (n <= 0 || n >= 4000) return null;
  const map = [[1000,"M"],[900,"CM"],[500,"D"],[400,"CD"],[100,"C"],[90,"XC"],[50,"L"],[40,"XL"],[10,"X"],[9,"IX"],[5,"V"],[4,"IV"],[1,"I"]];
  let r = "";
  for (const [v, s] of map) while (n >= v) { r += s; n -= v; }
  return r;
}
function divisorCount(n) {
  let c = 0;
  for (let d = 1; d * d <= n; d++) if (n % d === 0) c += (d * d === n ? 1 : 2);
  return c;
}
function isPerfect(n) {
  if (n < 2) return false;
  let sum = 1;
  for (let d = 2; d * d <= n; d++) if (n % d === 0) { sum += d; if (d * d !== n) sum += n / d; }
  return sum === n;
}
function isFib(n) {
  const isSq = (x) => { const r = Math.round(Math.sqrt(x)); return r * r === x; };
  return isSq(5 * n * n + 4) || isSq(5 * n * n - 4);
}

function renderFacts(value) {
  const box = document.getElementById("facts");
  const rows = [];
  const push = (label, val, cls = "") => rows.push(`<div class="fact"><span class="label">${label}</span><span class="val ${cls}">${val}</span></div>`);

  if (!isFinite(value)) {
    box.innerHTML = `<p class="hint">that's ${value === Infinity ? "infinity" : value < 0 ? "negative infinity" : "not a number"} — nothing to factor there.</p>`;
    return;
  }

  push("value", trimNum(value), "big");

  const isInt = Number.isInteger(value);
  if (isInt && Math.abs(value) < Number.MAX_SAFE_INTEGER) {
    const n = Math.abs(value);
    const prime = n >= 2 && primeFactors(n).length === 1;
    push("prime?", prime ? `<span class="badge prime">yes, prime</span>` : `<span class="badge no">no</span>`);
    if (n >= 2 && !prime) push("prime factors", factorString(n));
    if (n >= 1) push("divisors", divisorCount(n));
    push("binary", "0b" + value.toString(2));
    push("hex", "0x" + value.toString(16).toUpperCase());
    push("octal", "0o" + value.toString(8));
    const rom = toRoman(value);
    if (rom) push("roman", rom);
    const tags = [];
    if (isPerfect(n)) tags.push("perfect");
    if (n > 0 && isFib(n)) tags.push("fibonacci");
    if (n > 1 && Math.sqrt(n) % 1 === 0) tags.push("perfect square");
    if (n % 2 === 0) tags.push("even"); else tags.push("odd");
    if (tags.length) push("it's also", tags.join(", "));
  } else if (!isInt) {
    push("rounded", trimNum(Math.round(value * 1e6) / 1e6));
    const frac = approxFraction(value);
    if (frac) push("≈ fraction", frac);
    push("floor / ceil", `${Math.floor(value)} / ${Math.ceil(value)}`);
  }

  box.innerHTML = rows.join("");
}

function trimNum(v) {
  if (Number.isInteger(v)) return v.toString();
  return parseFloat(v.toPrecision(12)).toString();
}
function approxFraction(x, maxDen = 10000) {
  const sign = x < 0 ? -1 : 1;
  x = Math.abs(x);
  let bestN = 1, bestD = 1, bestErr = Infinity;
  for (let d = 1; d <= maxDen; d++) {
    const n = Math.round(x * d);
    const err = Math.abs(x - n / d);
    if (err < bestErr) { bestErr = err; bestN = n; bestD = d; if (err < 1e-9) break; }
  }
  if (bestD === 1 || bestErr > 1e-4) return null;
  return `${sign * bestN}/${bestD}`;
}

/* ------------------------------------------------------------------ *
 *  5. grapher — canvas, pan + zoom
 * ------------------------------------------------------------------ */
const G = {
  canvas: null, ctx: null,
  cx: 0, cy: 0, scale: 40, // pixels per unit
  rpn: null, src: "",
};

function initGraph() {
  G.canvas = document.getElementById("graph");
  G.ctx = G.canvas.getContext("2d");
  G.cx = G.canvas.width / 2;
  G.cy = G.canvas.height / 2;

  let dragging = false, lastX = 0, lastY = 0;
  G.canvas.addEventListener("pointerdown", (e) => { dragging = true; lastX = e.offsetX; lastY = e.offsetY; G.canvas.setPointerCapture(e.pointerId); });
  G.canvas.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    G.cx += (e.offsetX - lastX) * (G.canvas.width / G.canvas.clientWidth);
    G.cy += (e.offsetY - lastY) * (G.canvas.width / G.canvas.clientWidth);
    lastX = e.offsetX; lastY = e.offsetY;
    drawGraph();
  });
  G.canvas.addEventListener("pointerup", () => (dragging = false));
  G.canvas.addEventListener("wheel", (e) => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.1 : 0.9;
    G.scale = Math.max(4, Math.min(400, G.scale * factor));
    drawGraph();
  }, { passive: false });

  drawGraph();
}

function setGraphExpr(src, rpn) { G.src = src; G.rpn = rpn; drawGraph(); }

function drawGraph() {
  const { ctx, canvas } = G;
  const W = canvas.width, H = canvas.height;
  ctx.clearRect(0, 0, W, H);

  // grid
  ctx.strokeStyle = "#232a3a";
  ctx.lineWidth = 1;
  const step = G.scale;
  ctx.beginPath();
  for (let x = G.cx % step; x < W; x += step) { ctx.moveTo(x, 0); ctx.lineTo(x, H); }
  for (let y = G.cy % step; y < H; y += step) { ctx.moveTo(0, y); ctx.lineTo(W, y); }
  ctx.stroke();

  // axes
  ctx.strokeStyle = "#4a5570";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(0, G.cy); ctx.lineTo(W, G.cy);
  ctx.moveTo(G.cx, 0); ctx.lineTo(G.cx, H);
  ctx.stroke();

  const meta = document.getElementById("graphmeta");
  if (!G.rpn) { meta.textContent = "no function loaded — type an expression with x."; return; }

  // plot
  ctx.strokeStyle = "#ffd23f";
  ctx.lineWidth = 2;
  ctx.beginPath();
  let started = false;
  for (let px = 0; px <= W; px++) {
    const xv = (px - G.cx) / G.scale;
    let yv;
    try { yv = evalRPN(G.rpn, xv); } catch { yv = NaN; }
    if (!isFinite(yv)) { started = false; continue; }
    const py = G.cy - yv * G.scale;
    if (py < -H || py > 2 * H) { started = false; continue; }
    if (!started) { ctx.moveTo(px, py); started = true; }
    else ctx.lineTo(px, py);
  }
  ctx.stroke();
  meta.textContent = `f(x) = ${G.src}   ·   scale: ${G.scale.toFixed(0)} px/unit`;
}

/* ------------------------------------------------------------------ *
 *  6. wiring: input, keypad, tabs, history
 * ------------------------------------------------------------------ */
const exprEl = document.getElementById("expr");
const resultEl = document.getElementById("result");
const errEl = document.getElementById("err");
let history = JSON.parse(localStorage.getItem("numeron.history") || "[]");

function run() {
  const src = exprEl.value.trim();
  errEl.textContent = "";
  if (!src) { resultEl.textContent = "0"; return; }

  let compiled;
  try { compiled = compile(src); }
  catch (e) { errEl.textContent = e.message; return; }

  if (compiled.usesX) {
    // graph mode
    setGraphExpr(src, compiled.rpn);
    switchTab("graph");
    resultEl.textContent = "f(x)";
    document.getElementById("facts").innerHTML = `<p class="hint">that's a function of x — check the grapher tab. plug in a number instead to see its breakdown.</p>`;
    return;
  }

  let value;
  try { value = evalRPN(compiled.rpn); }
  catch (e) { errEl.textContent = e.message; return; }

  if (Number.isNaN(value)) { errEl.textContent = "that's not a number"; resultEl.textContent = "NaN"; return; }

  resultEl.textContent = trimNum(value);
  renderFacts(value);
  switchTab("facts");
  addHistory(src, trimNum(value));
}

// live preview while typing (no history spam)
exprEl.addEventListener("input", () => {
  const src = exprEl.value.trim();
  errEl.textContent = "";
  if (!src) { resultEl.textContent = "0"; return; }
  try {
    const c = compile(src);
    if (c.usesX) { setGraphExpr(src, c.rpn); resultEl.textContent = "f(x)"; return; }
    const v = evalRPN(c.rpn);
    resultEl.textContent = Number.isNaN(v) ? "…" : trimNum(v);
  } catch { resultEl.textContent = "…"; }
});

exprEl.addEventListener("keydown", (e) => { if (e.key === "Enter") run(); });

document.getElementById("keys").addEventListener("click", (e) => {
  const btn = e.target.closest("button");
  if (!btn) return;
  if (btn.id === "clear") { exprEl.value = ""; resultEl.textContent = "0"; errEl.textContent = ""; exprEl.focus(); return; }
  if (btn.id === "equals") { run(); return; }
  exprEl.value += btn.dataset.ins;
  exprEl.focus();
  exprEl.dispatchEvent(new Event("input"));
});

/* tabs */
function switchTab(name) {
  document.querySelectorAll(".tab").forEach((t) => t.classList.toggle("active", t.dataset.tab === name));
  document.querySelectorAll(".tabview").forEach((v) => v.classList.toggle("active", v.id === "tab-" + name));
}
document.querySelector(".tabs").addEventListener("click", (e) => {
  const t = e.target.closest(".tab");
  if (t) switchTab(t.dataset.tab);
});

/* history */
function addHistory(src, res) {
  history.unshift({ src, res });
  history = history.slice(0, 40);
  localStorage.setItem("numeron.history", JSON.stringify(history));
  renderHistory();
}
function renderHistory() {
  const ul = document.getElementById("history");
  if (!history.length) { ul.innerHTML = `<li class="hint">nothing yet.</li>`; return; }
  ul.innerHTML = history
    .map((h) => `<li data-src="${encodeURIComponent(h.src)}"><span class="h-src">${h.src}</span><span class="h-res">= ${h.res}</span></li>`)
    .join("");
}
document.getElementById("history").addEventListener("click", (e) => {
  const li = e.target.closest("li[data-src]");
  if (!li) return;
  exprEl.value = decodeURIComponent(li.dataset.src);
  exprEl.focus();
  run();
});
document.getElementById("clearHist").addEventListener("click", () => {
  history = [];
  localStorage.removeItem("numeron.history");
  renderHistory();
});

/* keyboard: type anywhere */
document.addEventListener("keydown", (e) => {
  if (document.activeElement !== exprEl && /[0-9+\-*/^().]/.test(e.key)) {
    exprEl.focus();
  }
});

/* boot */
initGraph();
renderHistory();
exprEl.focus();
