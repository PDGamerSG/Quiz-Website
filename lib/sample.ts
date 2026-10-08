export const SAMPLE_JSON = `[
  {
    "id": 66,
    "question": "According to the 'Knowledge Management for the New World of Business' figure, KM strategy starts with:",
    "options": {
      "A": "Technology procurement",
      "B": "Business Strategy",
      "C": "Employee recruitment",
      "D": "Marketing campaigns"
    },
    "correctAnswer": "B",
    "correctOption": "Business Strategy"
  },
  {
    "id": 67,
    "question": "Which of the following is listed among the 'Knowledge Management Constituents'?",
    "options": {
      "A": "Intellectual Capital and its constructs",
      "B": "Weather forecasting",
      "C": "Vehicle maintenance",
      "D": "Currency exchange rates"
    },
    "correctAnswer": "A",
    "correctOption": "Intellectual Capital and its constructs"
  }
]`;

export const SAMPLE_HTML = `<!doctype html>
<html lang="en">
<head><title>Knowledge management</title></head>
<body>
  <article class="question" id="q1" data-answer="1">
    <fieldset>
      <legend>What should a knowledge management strategy start with?</legend>
      <label class="option" data-index="0">
        <span class="letter">A</span>
        <span class="option-text">Technology procurement</span>
      </label>
      <label class="option correct" data-index="1">
        <span class="letter">B</span>
        <span class="option-text">Business strategy</span>
      </label>
    </fieldset>
    <div class="answer"><p>Align knowledge management with business goals first.</p></div>
  </article>
</body>
</html>`;
