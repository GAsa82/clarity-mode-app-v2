export const clarityQuotes = [
  "The mind is a powerful place. What you feed it grows. What you starve, fades.",
  "Small steps every day lead to big changes in how you feel.",
  "When the noise gets loud, slow down and listen to your own breath.",
  "Clarity begins with choosing one thing and letting the rest go.",
  "Stress is a signal, not a sentence. Notice it, then choose your next move.",
    "Your attention is your most valuable resource. Spend it wisely.",
    "The focused life isn't about doing more, it's about doing what matters most.",
    "In the middle of chaos, find your still point and return to it often.",
    "Clarity isn't a destination, it's a practice. Show up for it every day.",

];

export const getDailyClarityQuote = (date = new Date()) => {
  const dayIndex = Math.floor(date.getTime() / 86400000);
  return clarityQuotes[dayIndex % clarityQuotes.length];
};
