# Browser verification

Verified in the T3 Code collaborative Chromium browser against the local Next.js app.

| Flow | Result |
| --- | --- |
| Upload the provided software-testing HTML | All 140 questions, 12 topics, answers and explanations imported |
| Upload JSON template | Both questions imported and name inferred |
| Reject unsupported file | Error shown; existing quiz kept |
| Load software-testing example as JSON | All 140 questions imported |
| Instant feedback | Correct answer/explanation displayed; first choice locked |
| Exam mode | Answers editable; correct answers hidden until results |
| Keyboard selection | Letter shortcuts work; Enter on a focused option selects it without advancing |
| Quit confirmation | Dialog traps focus; Enter on “keep going” cancels without changing the question |
| Reload active attempt | Question index, answers and timer restored |
| Finish with unanswered questions | Confirmation required; cancellation returns to first unanswered question |
| Score mixed answers | One wrong and one skipped yields 0%, correct=0, wrong=1, skipped=1 |
| Practise missed questions | Starts a fresh attempt with only wrong/skipped questions |
| Answer all correctly after shuffling | 100% and correct=2 |
| Reload results | Results recovered |
| Retake | Answers and timer reset |
| Filter by topic | Mutation testing run contains its 12 questions only |
| Save/load/delete library entries | Stored copies load correctly; deletion requires confirmation |
| Export imported HTML as JSON | Generated JSON has all 140 questions and correct answer keys |
| Add a custom explanation | Edited explanation included in the draft, saved library and live answer feedback |
| Homepage question format | Valid JSON and HTML examples visible on the setup page, including detailed explanations |
| Copy JSON and HTML examples | Native button clicks copy complete examples to the clipboard; contents match after Windows line-ending normalization |
| Setup and quiz responsiveness | No horizontal overflow at 320, 768, 1024 and 1440 CSS pixels |

Automated parser/scoring/storage tests are in `quiz.test.ts`; run `npm test`.

## Neon integration verification

Verified against the configured Neon database, with the shared library enabled.

| Flow | Result |
| --- | --- |
| Publish the existing device library | The software-testing quiz's 140 questions and explanations saved in Neon; the successful device copy was removed |
| Shared access | A visitor without the original cookie can list and open the same quiz |
| Edit and save an explanation | Edited text persists in Neon, after reload, in quiz feedback and in result review |
| Save an existing name | Existing content is preserved; different imported content does not overwrite it |
| Start an unchanged quiz | Revision stays stable, preserving other visitors' editing sessions |
| Stale edits/deletions | API returns 409 and keeps current saved content |
| Complete and reload results | Scores, answers and snapshots save in Neon; reload leaves one result record |
| Result history | Homepage opens the saved result with the original explanation and score |
| Private attempts | A different browser cookie cannot list or open the first browser's results |
| Interrupted result save | Simulated HTTP 503 leaves a local pending result and exposes retry controls |
| Retry from homepage | The pending result saves once, appears in history, and clears from the local queue |
| Delete shared quiz | Confirmation names the shared library; completed result snapshots remain available |
| Request validation | Invalid answers, missing revisions, malformed JSON, oversized bodies, unsupported content types and cross-origin writes are rejected |
| Server scoring | Supplied score values are ignored and recomputed from answers |
| Responsive cloud library/history | No horizontal overflow at 320, 768, 1024 and 1440 CSS pixels |

`npm run test:integration` performs the live API checks and cleans up its uniquely named test records. The production build also passes with a placeholder database environment value, so building does not need a live database connection.
