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
