export type AnxietyLevel = "Very Low" | "Low" | "Moderate" | "High" | "Overwhelmed";

export type AnxietyVideo = {
  id: string;
  title: string;
  duration: string;
  url: string;
};

const gumroad = (slug: string) => `https://gauravdata.gumroad.com/l/${slug}`;

export const anxietyLevels: AnxietyLevel[] = [
  "Very Low",
  "Low",
  "Moderate",
  "High",
  "Overwhelmed",
];

export const videosByAnxietyLevel: Record<AnxietyLevel, AnxietyVideo[]> = {
  "Very Low": [
    { id: "vl-1", title: "Morning Clarity Primer", duration: "6 min", url: gumroad("clarity-primer") },
    { id: "vl-2", title: "Name The Feeling", duration: "3 min", url: gumroad("name-the-feeling") },
    { id: "vl-3", title: "Focus Sprint 25", duration: "25 min", url: gumroad("focus-sprint") },
    { id: "vl-4", title: "10-Minute Noise Reset", duration: "10 min", url: gumroad("noise-reset") },
    { id: "vl-5", title: "Evening Discipline Close", duration: "7 min", url: gumroad("evening-discipline") },
  ],
  Low: [
    { id: "l-1", title: "Sunday Reset Live", duration: "32 min", url: gumroad("sunday-reset") },
    { id: "l-2", title: "Stratus Deep Work", duration: "45 min", url: gumroad("stratus-deep-work") },
    { id: "l-3", title: "Empathy With Boundaries", duration: "11 min", url: gumroad("empathy-boundary") },
    { id: "l-4", title: "Kept Promises Protocol", duration: "5 min", url: gumroad("confidence-promises") },
    { id: "l-5", title: "Sleep Downshift", duration: "18 min", url: gumroad("sleep-downshift") },
  ],
  Moderate: [
    { id: "m-1", title: "Stop Rehearsing The Past", duration: "24 min", url: gumroad("stop-rehearsing-past") },
    { id: "m-2", title: "Break The Overthinking Loop", duration: "15 min", url: gumroad("overthinking-loop") },
    { id: "m-3", title: "Discipline Stack", duration: "12 min", url: gumroad("discipline-stack") },
    { id: "m-4", title: "72-Hour Dopamine Reset", duration: "8 min", url: gumroad("dopamine-72") },
    { id: "m-5", title: "Social Confidence Reset", duration: "14 min", url: gumroad("social-confidence") },
  ],
  High: [
    { id: "h-1", title: "10-Minute Noise Reset", duration: "10 min", url: gumroad("noise-reset") },
    { id: "h-2", title: "Scroll Detox Ritual", duration: "9 min", url: gumroad("scroll-detox") },
    { id: "h-3", title: "Midnight Wind Down", duration: "22 min", url: gumroad("midnight-wind-down") },
    { id: "h-4", title: "Break The Overthinking Loop", duration: "15 min", url: gumroad("overthinking-loop") },
    { id: "h-5", title: "Sleep Downshift", duration: "18 min", url: gumroad("sleep-downshift") },
  ],
  Overwhelmed: [
    { id: "o-1", title: "10-Minute Noise Reset", duration: "10 min", url: gumroad("noise-reset") },
    { id: "o-2", title: "Midnight Wind Down", duration: "22 min", url: gumroad("midnight-wind-down") },
    { id: "o-3", title: "Name The Feeling", duration: "3 min", url: gumroad("name-the-feeling") },
    { id: "o-4", title: "72-Hour Dopamine Reset", duration: "8 min", url: gumroad("dopamine-72") },
    { id: "o-5", title: "Stop Rehearsing The Past", duration: "24 min", url: gumroad("stop-rehearsing-past") },
  ],
};
