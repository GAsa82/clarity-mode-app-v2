import { useEffect, useState } from "react";
import { Play, Pause, RotateCcw, Flame, Quote, Wind } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getDailyClarityQuote } from "@/lib/quotes";
import {
  anxietyLevels,
  videosByAnxietyLevel,
  type AnxietyLevel,
} from "@/lib/anxiety-videos";

const prompts = [
  "What thought is renting space in my head today?",
  "What did I do well yesterday that I won't credit myself for?",
  "What would the focused version of me do in the next hour?",
  "What small win can you celebrate from today?",
  "What noise do you want to let go of tomorrow?",
];

interface Note {
  id: string;
  text: string;
  mood: string | null;
  createdAt: string;
}

export const Dashboard = () => {
  const [seconds, setSeconds] = useState(25 * 60);
  const [running, setRunning] = useState(false);
  const [anxietyLevel, setAnxietyLevel] = useState<AnxietyLevel | null>(null);
  const [journal, setJournal] = useState("");
  const [promptIndex, setPromptIndex] = useState(() => new Date().getDate() % prompts.length);
  const [savedNotes, setSavedNotes] = useState<Note[]>([]);

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      setSeconds((s) => (s > 0 ? s - 1 : 0));
    }, 1000);
    return () => clearInterval(id);
  }, [running]);

  useEffect(() => {
    const storedDraft = window.localStorage.getItem("clarity-journal-draft");
    if (storedDraft) {
      setJournal(storedDraft);
    }
    const storedNotes = window.localStorage.getItem("clarity-saved-notes");
    if (storedNotes) {
      setSavedNotes(JSON.parse(storedNotes));
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem("clarity-journal-draft", journal);
  }, [journal]);

  useEffect(() => {
    window.localStorage.setItem("clarity-saved-notes", JSON.stringify(savedNotes));
  }, [savedNotes]);

  const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
  const ss = String(seconds % 60).padStart(2, "0");
  const quote = getDailyClarityQuote();
  const currentPrompt = prompts[promptIndex];

  const saveNote = () => {
    const text = journal.trim();
    if (!text) return;
    const note: Note = {
      id: String(Date.now()),
      text,
      mood: anxietyLevel,
      createdAt: new Date().toISOString(),
    };
    setSavedNotes((notes) => [note, ...notes]);
    setJournal("");
  };

  const clearDraft = () => {
    setJournal("");
  };

  const loadNote = (note: Note) => {
    setJournal(note.text);
    setAnxietyLevel(
      note.mood && anxietyLevels.includes(note.mood as AnxietyLevel)
        ? (note.mood as AnxietyLevel)
        : null,
    );
  };

  const nextPrompt = () => {
    setPromptIndex((index) => (index + 1) % prompts.length);
  };

  return (
    <section id="dashboard" className="py-24 md:py-32 relative">
      <div className="container">
        <div className="max-w-2xl mb-12">
          <p className="text-xs uppercase tracking-[0.25em] text-primary mb-4">
            Daily Clarity
          </p>
          <h2 className="font-display text-4xl md:text-5xl font-light leading-tight">
            Your dashboard for the <span className="text-silver italic">focused life.</span>
          </h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Quote */}
          <div className="lg:col-span-2 bg-card-elevated border border-border rounded-2xl p-8 md:p-10 relative overflow-hidden">
            <Quote className="w-8 h-8 text-primary/30 mb-6" />
            <p className="font-display text-2xl md:text-3xl leading-snug text-gradient">
              "{quote}"
            </p>
            <p className="mt-6 text-xs uppercase tracking-[0.25em] text-muted-foreground">
              Today's Clarity Note
            </p>
            <div className="absolute -right-20 -bottom-20 w-60 h-60 rounded-full bg-primary/10 blur-3xl" />
          </div>

          {/* Streak */}
          <div className="bg-card-elevated border border-border rounded-2xl p-8 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">
                Current Streak
              </p>
              <Flame className="w-4 h-4 text-primary" />
            </div>
            <div>
              <p className="font-display text-6xl md:text-7xl font-light text-silver">12</p>
              <p className="text-sm text-muted-foreground mt-2">days of clarity</p>
            </div>
            <div className="flex gap-1.5">
              {Array.from({ length: 14 }).map((_, i) => (
                <div
                  key={i}
                  className={`h-8 flex-1 rounded-sm ${
                    i < 12 ? "bg-primary/70" : "bg-secondary"
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Anxiety level + video suggestions */}
          <div className="bg-card-elevated border border-border rounded-2xl p-8">
            <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground mb-6">
              What&apos;s your anxiety level?
            </p>
            <div className="flex flex-wrap gap-2">
              {anxietyLevels.map((level) => (
                <button
                  key={level}
                  type="button"
                  onClick={() => setAnxietyLevel(level)}
                  className={`px-4 py-2 rounded-full text-sm border transition-all ${
                    anxietyLevel === level
                      ? "bg-foreground text-background border-foreground"
                      : "border-border text-muted-foreground hover:border-foreground/40 hover:text-foreground"
                  }`}
                >
                  {level}
                </button>
              ))}
            </div>
            {anxietyLevel && (
              <div className="mt-5 pt-4 border-t border-border/60 animate-fade-in">
                <p className="text-[10px] uppercase tracking-[0.2em] text-primary mb-2">
                  Suggested for {anxietyLevel.toLowerCase()} stress
                </p>
                <ul className="space-y-1.5 max-h-[132px] overflow-y-auto scrollbar-none pr-1">
                  {videosByAnxietyLevel[anxietyLevel].map((video) => (
                    <li key={video.id}>
                      <a
                        href={video.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 rounded-lg px-2 py-1.5 -mx-2 hover:bg-primary/10 transition-colors group"
                      >
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/20 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                          <Play className="w-2.5 h-2.5 fill-current" />
                        </span>
                        <span className="text-xs text-foreground truncate flex-1">
                          {video.title}
                        </span>
                        <span className="text-[10px] text-muted-foreground shrink-0">
                          {video.duration}
                        </span>
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Focus timer */}
          <div className="bg-card-elevated border border-border rounded-2xl p-8 flex flex-col items-center justify-center text-center">
            <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground mb-4">
              Focus Timer
            </p>
            <div className="font-display text-6xl md:text-7xl font-light tabular-nums text-gradient">
              {mm}:{ss}
            </div>
            <div className="flex gap-2 mt-6">
              <Button variant="hero" size="sm" onClick={() => setRunning(!running)}>
                {running ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                {running ? "Pause" : "Start"}
              </Button>
              <Button
                variant="glass"
                size="sm"
                onClick={() => {
                  setRunning(false);
                  setSeconds(25 * 60);
                }}
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>

          {/* Breathing */}
          <div className="bg-card-elevated border border-border rounded-2xl p-8 flex flex-col items-center justify-center text-center relative overflow-hidden">
            <Wind className="w-4 h-4 text-primary mb-4" />
            <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground mb-6">
              Breathe
            </p>
            <div className="relative w-28 h-28 flex items-center justify-center">
              <div className="absolute inset-0 rounded-full bg-primary/20 animate-breathe blur-xl" />
              <div className="absolute inset-2 rounded-full bg-primary-gradient animate-breathe shadow-glow" />
              <span className="relative text-xs uppercase tracking-widest text-background font-medium">
                Inhale
              </span>
            </div>
          </div>

          {/* Journal */}
          <div className="lg:col-span-3 bg-card-elevated border border-border rounded-2xl p-8">
            <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
              <div>
                <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">
                  Reflection
                </p>
                <p className="text-xs text-muted-foreground">{journal.length} chars</p>
              </div>
              <Button variant="ghost" size="sm" onClick={nextPrompt}>
                New prompt
              </Button>
            </div>
            <p className="font-display text-xl mb-4 text-silver italic">
              {currentPrompt}
            </p>
            <textarea
              value={journal}
              onChange={(e) => setJournal(e.target.value)}
              placeholder="Begin writing..."
              className="w-full bg-transparent resize-none outline-none text-base leading-relaxed min-h-[120px] text-foreground placeholder:text-muted-foreground/50"
            />
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <Button variant="hero" onClick={saveNote}>
                Save note
              </Button>
              <Button variant="outline" onClick={clearDraft}>
                Clear
              </Button>
              <p className="text-xs text-muted-foreground">
                Draft auto-saves in your browser.
              </p>
            </div>

            {savedNotes.length > 0 && (
              <div className="mt-8 space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">
                    Saved notes
                  </p>
                  <p className="text-xs text-muted-foreground">{savedNotes.length} entries</p>
                </div>
                <div className="grid gap-3">
                  {savedNotes.map((note) => (
                    <div key={note.id} className="rounded-3xl border border-border bg-background/80 p-4">
                      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                        <div className="min-w-0">
                          <p className="text-sm leading-relaxed text-foreground break-words">
                            {note.text.length > 160 ? `${note.text.slice(0, 160)}...` : note.text}
                          </p>
                          <p className="mt-3 text-[11px] uppercase tracking-[0.25em] text-muted-foreground">
                            {note.mood ? `${note.mood} · ` : ""}
                            {new Date(note.createdAt).toLocaleString()}
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Button size="sm" variant="outline" onClick={() => loadNote(note)}>
                            Load
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setSavedNotes((notes) => notes.filter((item) => item.id !== note.id))}
                          >
                            Delete
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};
