# numeron

a little calculator that talks too much. you type some math, it gives you the answer, and then it won't shut up about what that answer actually is.

made it for the hack club [calculate](https://calculate.hackclub.com/) thing.

play with it here: https://downbeatfoil.github.io/numeron/

## the point

i got bored of calculators that just spit out a number. so this one takes your answer and digs into it:

- is it prime? if not, what does it factor into (`12` is `2^2 × 3`)
- how many divisors it has
- the same number in binary and hex
- its roman numeral, if that's a thing that makes sense
- digit sum and digital root
- how you'd say it out loud (`1068` -> "one thousand sixty-eight")
- little tags if it's perfect, fibonacci, a square, a palindrome, whatever

if the answer isn't a whole number it'll find the closest simple fraction and the floor/ceil instead.

put an `x` anywhere in what you type and it stops calculating and starts graphing. drag the graph around, scroll to zoom.

## themes

there's a row of dots at the top. click one and the whole thing changes look. right now:

- **graph paper** (the default, looks like my math notebook)
- **mint** (clean receipt vibe)
- **crt** (green terminal with scanlines, my favorite)
- **bubblegum** (pink, for when i want it cute)
- **casio** (beige, like the calculator everyone has in class)

whatever you pick sticks around next time you open it.

there's also a sounds toggle. turn it on and every key plays a note, digits are tuned to a scale so mashing the number pad kind of sounds like something.

## how the math actually works

no math libraries, i wanted to understand it so i wrote the engine myself:

- a tokenizer that reads the string into numbers, functions, operators, brackets, that kind of thing
- a shunting-yard parser that reorders it into RPN with the right precedence (the unary minus took me way too long)
- a tiny RPN evaluator that runs it. the graph reuses the same evaluator, it just feeds in a different x each pixel

functions it knows: `sin cos tan asin acos atan log ln sqrt abs exp floor ceil round`
constants: `pi e tau`
and `+ - * / % ^ !`

## running it yourself

it's just three files, no build step, no npm, nothing.

```bash
python -m http.server 4321
# open http://localhost:4321
```

## what's in here

```
index.html   the layout and the keypad
style.css    the look + all the themes at the bottom
app.js       tokenizer, parser, evaluator, the number facts, the graph
```
