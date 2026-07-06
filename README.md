# numeron

a calculator that talks back. you type an expression, it works out the answer, and then it tells you a bunch of stuff about that answer.

made for the hack club [calculate](https://calculate.hackclub.com/) challenge.

**live:** https://downbeatfoil.github.io/numeron/

## the idea

normal calculators give you a number and stop there. i always wanted mine to keep going, so numeron takes the result and breaks it down:

- is it prime? if not, the full prime factorization (`12` becomes `2² × 3`)
- how many divisors it has
- the same number in binary, hex, and octal
- its roman numeral
- flags for perfect, fibonacci, perfect square, even/odd
- if the answer isn't a whole number, the closest simple fraction (`3.1428...` is basically `22/7`) plus floor and ceil

put an `x` anywhere in the expression and it switches to a grapher instead. drag to pan, scroll to zoom.

## how it works

no math libraries. i wrote the whole thing myself so i actually understood it:

- a tokenizer that reads numbers, functions, constants, operators, unary minus, and the `!` factorial
- a shunting-yard parser that turns the expression into RPN, with correct precedence and right-associativity for `^`
- an RPN evaluator, which is also what the grapher calls to sample `f(x)`
- the number stuff: primes by trial division, roman numeral conversion, and a loop that hunts for the nearest fraction

functions: `sin cos tan asin acos atan log ln sqrt abs exp floor ceil round`
constants: `pi e tau`
operators: `+ - * / % ^ !`

## running it locally

just static files, nothing to build.

```bash
python -m http.server 4321
# then open http://localhost:4321
```

## files

```
index.html   markup and the keypad
style.css    the look
app.js       tokenizer, parser, evaluator, number breakdown, grapher
```
