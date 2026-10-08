# Quizly

A quiz website built with Next.js 16, React 19 and Neon PostgreSQL. Import questions as HTML or JSON, publish quizzes to a shared cloud library, add detailed explanations, and review every answer. No account is required; completed result history is private to each browser.

## Run locally

Requires Node.js 20.19+ (Node.js 24 recommended).

```sh
npm ci
cp .env.example .env.local
npm run db:migrate
npm run dev
```

Before running the migration, set `DATABASE_URL` in `.env.local` to your Neon PostgreSQL connection string. Keep `QUIZ_LIBRARY_VISIBILITY=shared` for the public library. On Windows, copy the example using `Copy-Item .env.example .env.local`.

Open http://localhost:3000. For a production server:

```sh
npm run build
npm start
```

Deploy to a host that supports the Next.js Node.js runtime and route handlers. Set `DATABASE_URL` and `QUIZ_LIBRARY_VISIBILITY=shared` in the host's server environment, then run `npm run db:migrate` against that database before using the site. The migration creates only the application's `quizly_quizzes` and `quizly_attempts` tables and indexes, and can be run again safely. A static HTML-only host cannot run the database API.

The connection string stays on the server, and `.env.local` is ignored by Git. Never use a `NEXT_PUBLIC_` variable for database credentials. The production build works without database credentials; live save/load requests require them.

## Cloud storage

- The shared library is visible to every visitor. Anyone can save, edit, export or delete a quiz. Sharing is the default; `QUIZ_LIBRARY_VISIBILITY=private` optionally scopes the library to each browser.
- Quiz names are unique within a library, ignoring letter case. Importing an existing name preserves the saved quiz. Open that quiz to edit it, or choose a new name for a different quiz.
- Revision checks protect against overwriting someone else's edits. Starting an unchanged quiz keeps its revision stable. Conflicts keep your draft intact so you can export it and reopen the latest saved version.
- Completed attempts store question and explanation snapshots, answers, settings, duration and scores in Neon. Scores are calculated on the server. Retries and reloads reuse the attempt ID, avoiding duplicate results. Deleting or changing a quiz preserves its completed attempt snapshots.
- History shows the latest 100 attempts for the browser identified by an anonymous HttpOnly cookie. Other visitors cannot read these results. Clearing cookies or changing devices removes access to that browser's history; there is no account-based cross-device history.
- Drafts, settings and unfinished attempts stay in local browser storage for reload recovery. Failed result saves are queued on the device and can be retried from the results page or homepage history. If cloud storage is unavailable, you can export your draft or start it without saving.
- Quizzes from the earlier device library can be published using **publish device quizzes**. Only successfully saved, matching copies are removed from the device library; conflicting names remain available for renaming.

## Using the website

1. Upload or drop a `.html`, `.htm` or `.json` file, or paste its contents. A complete paste automatically detects the format.
2. Check the question count, preview, and any skipped-question warnings. Enter or edit the quiz name.
3. Open **add or edit explanations** to choose a question and write your own reasoning, steps or examples. Save the explanation, then save the quiz to keep the changes in the library. The homepage includes complete JSON and HTML format examples with a copy button.
4. Optionally select a topic, shuffle questions or options, or disable instant feedback for an exam-style attempt.
5. Save the quiz to the shared library or start it. Starting also saves the full imported quiz. Opening a saved quiz lets you update it; importing another quiz with the same name never silently overwrites it.
6. Answer using the buttons, letters or number keys. Use the numbered navigator to revisit questions. Left/right arrows and Enter work when focus is on the question; focused buttons retain their normal keyboard behavior.
7. Finish to see your score, correct/wrong/skipped answers, and explanations. Your result saves to private cloud history. Retake the quiz, practise only missed questions, download your results, or open a previous result from the homepage.

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

With the app running and a configured database, run `npm run test:integration`. This checks live quiz creation/loading/editing/deletion, sharing across visitors, explanation persistence, stale revisions, invalid input and oversized requests, same-origin protection, private result access, server scoring, idempotent attempt saves, and snapshots after deletion. It creates uniquely named test records and cleans up only those records. Set `QUIZLY_TEST_URL` to test a different app URL that uses the same database.

Browser verification results are recorded in [the browser checklist](tests/browser-checks.md). A [GitHub Actions workflow template](docs/github-actions-ci.yml) runs lint, type checking, tests, a production build, and the runtime dependency audit. To enable it, copy it to `.github/workflows/ci.yml` and push with a GitHub login that has the `workflow` scope. The current login can push repository contents but cannot upload Actions workflows.

Next.js was updated to 16.3.8. `npm audit --omit=dev` checks runtime dependencies separately. The `braces` advisory in the ESLint dependency chain currently has no compatible patched release; do not use `npm audit fix --force`, which downgrades the Next.js lint configuration to version 14.
