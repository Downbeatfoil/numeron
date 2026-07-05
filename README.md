# numeron

a calculator that talks back. you give it an expression, it solves the thing — and then it tells you what the answer *actually is*.

built by hand for the hack club [calculate](https://calculate.hackclub.com/) challenge.

**live:** https://downbeatfoil.github.io/numeron/

## the twist

most calculators hand you a number and stop. numeron keeps going. every result gets broken down:

- **is it prime?** and if not, its full prime factorization (`12 → 2² × 3`)
- **how many divisors** it has
- the same number in **binary, hex, and octal**
- its **roman numeral**
- whether it's **perfect, fibonacci, a perfect square, even/odd**
- for non-integers: the nearest **fraction** (`3.1428… ≈ 22/7`) and floor/ceil

type an expression with an `x` in it and it flips into a **live grapher** — pan by dragging, zoom by scrolling.

## what's under the hood

no math libraries. the whole engine is written from scratch:

- a **tokenizer** that handles numbers, functions, constants, operators, unary minus, and postfix factorial
- a **shunting-yard parser** that turns infix into RPN with proper precedence and right-associativity for `^`
- an **RPN evaluator** that also doubles as the grapher's `f(x)` sampler
- the number-analysis functions (prime sieve by trial division, roman conversion, continued-fraction-ish rational approximation)

functions: `sin cos tan asin acos atan log ln sqrt abs exp floor ceil round`
constants: `pi e tau` · operators: `+ - * / % ^ !`

## running locally

it's just static files — no build step.

```bash
python -m http.server 4321
# open http://localhost:4321
```

## structure

```
index.html   markup + keypad
style.css    the look
app.js       tokenizer → parser → evaluator → analyzer → grapher
```
