export function validateQuiz(data) {
  const errors = [];

  if (!data.title || data.title.trim().length === 0) {
    errors.push('חובה להזין כותרת לחידון');
  }

  if (!data.questions || data.questions.length === 0) {
    errors.push('חובה להוסיף לפחות שאלה אחת');
  }

  if (data.questions) {
    data.questions.forEach((q, i) => {
      if (!q.text || q.text.trim().length === 0) {
        errors.push(`שאלה ${i + 1}: חובה להזין טקסט`);
      }
      if (!q.answers || q.answers.length < 2 || q.answers.length > 4) {
        errors.push(`שאלה ${i + 1}: חובה 2 עד 4 תשובות`);
      }
      if (q.answers && !q.answers.some((a) => a.isCorrect)) {
        errors.push(`שאלה ${i + 1}: חובה לסמן תשובה נכונה`);
      }
      if (q.answers && q.answers.some((a) => !a.text || a.text.trim().length === 0)) {
        errors.push(`שאלה ${i + 1}: לכל התשובות חובה טקסט`);
      }
    });
  }

  return errors;
}

export function validatePin(pin) {
  return /^\d{6}$/.test(pin);
}

export function validateNickname(nickname) {
  return typeof nickname === 'string' && nickname.trim().length >= 1 && nickname.trim().length <= 20;
}
