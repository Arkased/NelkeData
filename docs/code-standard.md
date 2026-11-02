# Code standard

The rules for the code of this project. A rule here wins over a habit from another project. Add the rules of the language and the tools of the project in new sections.

Each rule carries 1 tag that says what checks it:

- `[lint]`: the linter of the project.
- `[script]`: a script of the check command of the project.
- `[review]`: a human or agent review. Nothing checks it mechanically.

The check command of the project enforces the rules tagged `[lint]` and `[script]`. The `review` skill applies the rules tagged `[review]`.

## 1. Documentation

- `[review]` Every public function, class and type has a comment that says what it does, in 1 sentence, and names its side effects.
- `[review]` No comment restates the signature or the next line.
- `[review]` A comment inside a function explains a reason, never a step. It never says what changed or when.

## 2. Behavior

- `[review]` A library comes in when the problem is one that every project of this kind has, and the hand-rolled code would be more than about 20 lines or easy to get wrong.
- `[review]` No dead code, no commented-out code, no `TODO` without a reference to an item.
- `[review]` One name per concept across the code base.
- `[review]` No abstraction before a caller needs it. A helper, an option or a config key comes in for a caller that exists in the same change.
- `[review]` Each behavior has 1 place. Code that is the same in 2 places, beyond about 5 lines, is 1 function.
- `[review]` No swallowed error. A caught error is rethrown, or logged with its cause.
- `[review]` A design that makes a fault impossible wins over a check that detects it.
- `[review]` A rename or a move changes all callers in the same change. It leaves no alias or shim.

## 3. Tests

- `[review]` A test proves behavior. A harmless change (a reworded message, a new log field) must not break it.
- `[review]` A test asserts what a caller or the next step sees: a return value, a file, an exit code. It never asserts the prose of a message.
- `[review]` A test never repeats a configured value. A boundary test uses the constant by name, 1 under and 1 over.
- `[review]` A test reads no wall clock and sleeps for no real time. It uses an injected clock.
- `[review]` A test does not assert that a fake was called, unless the call is the contract: an outgoing message, a spawned process.
- `[review]` A test makes its temp folders under the temp folder of the system, and removes nothing outside them.

## 4. Changes to behavior

- `[review]` A behavior change goes into the layer docs (`docs/requirements/`, `docs/design/`, `docs/technical/`) first, then into the code.
- `[review]` A change that breaks or adds a requirement changes the requirements file in the same change.

## 5. Layout

- `[review]` Each package of `packages/` holds 1 concern. A module holds 1 concern. A module over about 400 lines is split by concern.
- `[review]` A package uses another package only through the exports of its `index.ts`.
- `[review]` The workbook and the site read the data model only through the files in `data/` and the schemas of `@nelke/model`. They never read the game files.
- `[review]` A unit test is in a `__tests__/` folder next to the module that it tests. An end-to-end test is in the root `__tests__/` folder. Test doubles are in a `fakes/` folder. Manual tools are in `scripts/`.
- `[review]` No file in the repo holds an absolute local path. The path to the game install or to `extracted/` comes from an argument.

## 6. TypeScript

- `[lint]` No `any`. No non-null `!`.
- `[review]` Data from outside the process (a game file, a JSON file of `data/`) is parsed with a Zod schema before use. No `as` on such data.
- `[review]` A fixed set of names is a string `enum`, defined 1 time in 1 leaf module. A Zod schema takes the enum. A `switch` over an enum has no `default`.
- `[review]` An object type is an `interface`. An array type is `T[]`.
- `[review]` A function has at most 4 positional parameters. More go into 1 options object.
- `[lint]` Every export has a JSDoc block: 1 sentence in the present tense, `@param`, `@returns` and `@throws` where they apply, and `@sideEffects` (`none`, or each effect).

## 7. Tooling

- `[script]` `npm run check` runs the typecheck, the lint, the format check and the tests, in this order. Each commit passes it.
- `[review]` A dependency is pinned to 1 exact version.
