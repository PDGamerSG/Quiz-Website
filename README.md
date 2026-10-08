# Quizly

A private quiz website built with Next.js 16 and React 19. Import your questions as HTML or JSON, save quizzes on your device, and review your answers after each attempt. No account, database, or external service is required.

## Run locally

Requires Node.js 20.19+ (Node.js 24 recommended).

```sh
npm ci
npm run dev
```

Open http://localhost:3000. For a production server:

```sh
npm run build
npm start
```

Deploy to any host that supports Next.js. Drafts, quiz libraries and attempts are local to the browser and origin; they do not sync between devices. Download JSON backups before clearing browser data.

## Using the website

1. Upload or drop a `.html`, `.htm` or `.json` file, or paste its contents. A complete paste automatically detects the format.
2. Check the question count, preview, and any skipped-question warnings. Enter or edit the quiz name.
3. Open **add or edit explanations** to choose a question and write your own reasoning, steps or examples. Save the explanation, then save the quiz to keep the changes in the library. The homepage includes complete JSON and HTML format examples with a copy button.
4. Optionally select a topic, shuffle questions or options, or disable instant feedback for an exam-style attempt.
5. Save the quiz to your library or start it. Starting also saves the full imported quiz. Saving with an existing name updates that entry.
6. Answer using the buttons, letters or number keys. Use the numbered navigator to revisit questions. Left/right arrows and Enter work when focus is on the question; focused buttons retain their normal keyboard behavior.
7. Finish to see your score, correct/wrong/skipped answers, and explanations. Retake the quiz, practise only missed questions, or download your results.

Instant feedback locks your first choice after revealing the answer. With feedback off, answers can be changed before submission. Unanswered questions count as skipped. Finishing with unanswered questions requires confirmation.

Drafts and settings save automatically. A running attempt and its elapsed time recover after a refresh; time spent away from the page is excluded. Results also survive a refresh. Leaving a quiz explicitly discards that attempt, keeping the imported questions.

## JSON format

Use a question array or an object containing `title` and `questions`:

```json
{
  "title": "Software testing",
  "questions": [
    {
      "id": "q1",
      "question": "Tests execute 45 of 60 statements. What is the coverage?",
      "options": { "A": "60%", "B": "80%", "C": "75%", "D": "100%" },
      "correctAnswer": "C",
      "explanation": "45 / 60 × 100 = 75%.",
      "topic": "Coverage"
    }
  ]
}
```

- Question text: `question` or `prompt` (also `text`, `title`, `q`).
- Options: `options`, `choices` or `answers`; use a keyed object, string array, or `{ "key": "A", "text": "..." }` array.
- Answer: `correctKey`, `correctAnswer`, `answerKey`, `answer` or `correct`; use an option key or exact answer text. Numeric answers and `correctIndex`/`answerIndex` are **zero-based**. A numeric string first matches an option key or exact answer text. Prefer letters or explicit `correctIndex` for clarity.
- An option-object array can instead mark exactly one answer with `correct: true` or `isCorrect: true`.
- Optional fields: `id`, `explanation`, `topic`, `source`. Keys are case insensitive.
- Markdown JSON fences and trailing commas are accepted. Quoted answer text is preserved.

Malformed questions are skipped with explanations. Blank options, duplicate option keys, unmatched answers, and ambiguous answer text are rejected. Imports are limited to 5 MB and 2,000 questions.

Templates: [JSON](public/examples/quiz-template.json) and [HTML](public/examples/quiz-template.html).

## HTML format

The supplied [software testing HTML](public/examples/software-testing-quiz.html) is included as a 140-question example, with a matching [JSON export](public/examples/software-testing-quiz.json). Use the example button on the website in either format.

```html
<title>Software testing</title>
<article class="question" id="q1" data-answer="1" data-topic="Coverage">
  <fieldset>
    <legend>Which statement coverage value is correct?</legend>
    <label class="option" data-index="0">
      <span class="letter">A</span><span class="option-text">60%</span>
    </label>
    <label class="option correct" data-index="1">
      <span class="letter">B</span><span class="option-text">75%</span>
    </label>
  </fieldset>
  <div class="answer"><p>45 / 60 × 100 = 75%.</p></div>
</article>
```

Question blocks use `.question` or `[data-question]`. The prompt uses `legend`, `[data-prompt]`, `.question-text`, `h2` or `h3`. Options use `.option` or `[data-option]`, with optional `.letter`/`data-key` and `.option-text`.

Mark the correct option with `.correct` or `data-correct="true"`, or use the question's `data-answer` to match the option's `data-index`, key, or zero-based position. Multiple or conflicting answer markers are rejected. Explanations come from `.answer p` or `.explanation`; topics come from `data-topic` or `.question-meta span:last-child`; references come from `.source`.

HTML containing a `<script type="application/json">` quiz is also supported. Imported HTML remains inert and is never mounted in the page; scripts and event handlers are not executed. Quizzes whose questions exist only in executable JavaScript need a JSON export or static question markup.

## Validation

```sh
npm test
npm run lint
npm run typecheck
npm run build
```

Regression tests compare all 140 HTML prompts and correct answers, check both templates and JSON round-tripping, malformed imports, inert HTML, answer-index rules, shuffling, scoring, browser storage recovery, and blocked storage.

Browser verification results are recorded in [the browser checklist](tests/browser-checks.md). A [GitHub Actions workflow template](docs/github-actions-ci.yml) runs lint, type checking, tests, a production build, and the runtime dependency audit. To enable it, copy it to `.github/workflows/ci.yml` and push with a GitHub login that has the `workflow` scope. The current login can push repository contents but cannot upload Actions workflows.

Next.js was updated to 16.3.8. `npm audit --omit=dev` checks runtime dependencies separately. The `braces` advisory in the ESLint dependency chain currently has no compatible patched release; do not use `npm audit fix --force`, which downgrades the Next.js lint configuration to version 14.
