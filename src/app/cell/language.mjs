// A small language guesser for the email policy: counts common words. Good enough to
// tell English, Portuguese, Spanish and French apart in a business email; it is not a
// general detector, and it answers null when it is unsure.
const WORDS = {
  en: 'the and to of you for is are this that with your have will would be on at it we our please thank thanks regards best hello hi dear can could next week',
  pt: 'o a os as de do da dos das e que para com por não uma um obrigado obrigada olá cumprimentos podemos reunião próxima semana está até breve mensagem sim você',
  es: 'el la los las de del y que para con por no una un gracias hola saludo saludos podemos reunión próxima semana está hasta pronto mensaje sí usted te',
  fr: 'le la les de des du et que pour avec par ne pas une un merci bonjour cordialement nous vous rendez-vous semaine prochaine est je suis êtes disponible',
};
const SETS = Object.fromEntries(Object.entries(WORDS).map(([k, v]) => [k, new Set(v.split(' '))]));

export function guessLanguage(text) {
  const tokens = text.toLowerCase().match(/[\p{L}-]+/gu) || [];
  if (tokens.length < 4) return { language: null, scores: {} };
  const scores = {};
  for (const [lang, set] of Object.entries(SETS)) scores[lang] = tokens.filter((t) => set.has(t)).length / tokens.length;
  const ranked = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  const [best, second] = ranked;
  if (best[1] < 0.08 || best[1] - second[1] < 0.03) return { language: null, scores };
  return { language: best[0], scores };
}
