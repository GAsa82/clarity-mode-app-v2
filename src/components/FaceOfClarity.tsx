import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { Upload, Star, Crown, Check, X, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

const STORAGE_KEY_SUBMISSIONS = "clarity-face-submissions";
const STORAGE_KEY_APPROVED = "clarity-face-approved";

type Submission = {
  username: string;
  image: string; // data URL
  submittedAt: string;
};

const rules = [
  "No explicit or sexual content",
  "No hateful or abusive images",
  "No spam or illegal content",
  "Keep submissions respectful",
];

const currentClarityMembers = [
  {
    name: "Maya R.",
    role: "Product designer, 26",
    emoji: "🧘",
  },
  {
    name: "Jordan T.",
    role: "Founder, 31",
    emoji: "🌅",
  },
  {
    name: "Sam K.",
    role: "Med student, 24",
    emoji: "⚡",
  },
];

function getPendingSubmissions(): Submission[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_SUBMISSIONS);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function getApprovedSubmissions(): Submission[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_APPROVED);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function savePendingSubmissions(list: Submission[]) {
  localStorage.setItem(STORAGE_KEY_SUBMISSIONS, JSON.stringify(list));
}

function saveApprovedSubmissions(list: Submission[]) {
  localStorage.setItem(STORAGE_KEY_APPROVED, JSON.stringify(list));
}

export const FaceOfClarity = () => {
  const [showForm, setShowForm] = useState(false);
  const [username, setUsername] = useState("");
  const [image, setImage] = useState<string | null>(null);
  const [imageError, setImageError] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [approved, setApproved] = useState<Submission[]>([]);
  const [showRules, setShowRules] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setApproved(getApprovedSubmissions());
  }, []);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setImageError(true);
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setImageError(true);
      return;
    }

    setImageError(false);
    const reader = new FileReader();
    reader.onload = (ev) => {
      setImage(ev.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = () => {
    setSubmitError(null);

    if (!username.trim()) {
      setSubmitError("Please enter a username.");
      return;
    }
    if (!image) {
      setSubmitError("Please upload a profile picture.");
      return;
    }

    const submission: Submission = {
      username: username.trim(),
      image,
      submittedAt: new Date().toISOString(),
    };

    const pending = getPendingSubmissions();
    pending.push(submission);
    savePendingSubmissions(pending);

    setSubmitted(true);

    const currentApproved = getApprovedSubmissions();
    currentApproved.unshift(submission);
    saveApprovedSubmissions(currentApproved);
    setApproved(currentApproved);
  };

  const todayMember = approved.length > 0
    ? approved[0]
    : null;

  const allMembers = [...approved, ...currentClarityMembers];

  return (
    <section className="py-24 md:py-32 relative">
      <div className="container">
        <div className="max-w-2xl mb-12">
          <p className="text-xs uppercase tracking-[0.25em] text-primary mb-4 flex items-center gap-2">
            <Crown className="w-3.5 h-3.5" />
            Community Spotlight
          </p>
          <h2 className="font-display text-4xl md:text-5xl font-light leading-tight">
            Become the <span className="text-silver italic">Face of Clarity</span> for a day.
          </h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px] gap-6 items-start">
          {/* Left column — Upload section */}
          <div>
            {/* Upload section */}
            {!showForm ? (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.1 }}
              >
                {submitted ? (
                  <div className="relative rounded-2xl bg-card-elevated border border-border p-8 text-center">
                    <Check className="w-10 h-10 text-primary mx-auto mb-4" />
                    <p className="font-display text-xl font-light text-gradient mb-2">
                      Submission received!
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Your profile is under review. Selected members appear here for 24 hours.
                    </p>
                  </div>
                ) : (
                  <div className="relative rounded-2xl bg-card-elevated border border-border p-8 md:p-10">
                    <p className="font-display text-2xl font-light mb-3">
                      Upload your profile picture & username
                    </p>
                    <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                      Selected users become <span className="text-primary font-medium">"Clarity Member Of The Day"</span> — featured on our homepage for 24 hours.
                    </p>

                    <div className="flex flex-wrap gap-3 mb-6">
                      <Button variant="hero" onClick={() => setShowForm(true)}>
                        <Upload className="w-4 h-4 mr-2" />
                        Upload now
                      </Button>
                      <Button
                        variant="glass"
                        size="sm"
                        onClick={() => setShowRules(!showRules)}
                      >
                        <AlertTriangle className="w-3.5 h-3.5 mr-1.5" />
                        Community rules
                      </Button>
                    </div>

                    {showRules && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        className="overflow-hidden"
                      >
                        <div className="rounded-xl border border-border bg-background/50 p-4 mb-4">
                          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-3">
                            Community Upload Rules
                          </p>
                          <ul className="space-y-2">
                            {rules.map((rule, i) => (
                              <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                                <span className="text-primary mt-0.5">•</span>
                                {rule}
                              </li>
                            ))}
                          </ul>
                          <p className="mt-3 text-[10px] text-muted-foreground/60">
                            Uploads violating rules will be removed and accounts may be restricted. <span className="text-primary">Admin Approval Required.</span>
                          </p>
                        </div>
                      </motion.div>
                    )}

                    <p className="text-xs text-muted-foreground/60 italic">
                      Join the movement against digital burnout.
                    </p>
                  </div>
                )}
              </motion.div>
            ) : (
              /* Upload form */
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="relative rounded-2xl bg-card-elevated border border-border p-8 md:p-10"
              >
                <div className="flex flex-col md:flex-row gap-8">
                  <div className="flex flex-col items-center gap-4 shrink-0">
                    <div
                      className="w-28 h-28 rounded-full bg-secondary border-2 border-dashed border-border hover:border-primary/50 transition-colors overflow-hidden cursor-pointer flex items-center justify-center"
                      onClick={() => fileRef.current?.click()}
                    >
                      {image ? (
                        <img src={image} alt="Preview" className="w-full h-full object-cover" />
                      ) : (
                        <Upload className="w-8 h-8 text-muted-foreground/50" />
                      )}
                    </div>
                    <input
                      ref={fileRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleImageSelect}
                    />
                    <Button variant="glass" size="sm" onClick={() => fileRef.current?.click()}>
                      {image ? "Change photo" : "Choose photo"}
                    </Button>
                    <p className="text-[10px] text-muted-foreground/60 text-center">Max 2MB</p>
                    {imageError && (
                      <p className="text-[10px] text-destructive">Invalid file. Use an image under 2MB.</p>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-2">
                      Your username
                    </p>
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="e.g. clarity_seeker"
                      maxLength={30}
                      className="w-full px-5 py-3.5 rounded-full bg-background/60 border border-border focus:border-primary outline-none text-sm transition-colors mb-4"
                    />

                    <div className="rounded-xl border border-border bg-background/40 p-4 mb-6">
                      <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-2">
                        Rules
                      </p>
                      <ul className="space-y-1">
                        {rules.map((rule, i) => (
                          <li key={i} className="text-[11px] text-muted-foreground flex items-start gap-2">
                            <span className="text-primary">•</span>
                            {rule}
                          </li>
                        ))}
                      </ul>
                      <p className="mt-2 text-[10px] text-muted-foreground/60">
                        <span className="text-primary">Admin Approval Required.</span> Violations will be removed.
                      </p>
                    </div>

                    {submitError && (
                      <p className="text-xs text-destructive mb-4">{submitError}</p>
                    )}

                    <div className="flex gap-3">
                      <Button variant="glass" onClick={() => setShowForm(false)}>
                        <X className="w-3.5 h-3.5 mr-1.5" />
                        Cancel
                      </Button>
                      <Button variant="hero" onClick={handleSubmit}>
                        <Check className="w-3.5 h-3.5 mr-1.5" />
                        Submit for review
                      </Button>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </div>

          {/* Right sidebar — Clarity Member of the Day */}
          <div className="flex flex-col gap-4 lg:sticky lg:top-28">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="relative rounded-2xl bg-card-elevated border border-border overflow-hidden"
            >
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,hsl(215_90%_30%/0.15),transparent_60%)] pointer-events-none" />
              <div className="relative p-6 text-center">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full glass mb-5">
                  <Star className="w-2.5 h-2.5 text-primary fill-primary" />
                  <span className="text-[9px] uppercase tracking-[0.2em] text-primary font-medium">
                    Member of the Day
                  </span>
                </div>

                {todayMember ? (
                  <div className="flex flex-col items-center">
                    <div className="w-16 h-16 rounded-full overflow-hidden ring-2 ring-primary/40 ring-offset-2 ring-offset-background mb-3">
                      <img
                        src={todayMember.image}
                        alt={todayMember.username}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <p className="font-display text-lg font-light text-gradient">
                      @{todayMember.username}
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-1">
                      Featured today
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center">
                    <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mb-3">
                      <Crown className="w-6 h-6 text-muted-foreground/50" />
                    </div>
                    <p className="font-display text-base font-light text-muted-foreground">
                      No member featured yet
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-1">
                      Be the first to upload.
                    </p>
                  </div>
                )}
              </div>
            </motion.div>

            {/* Clarity Members list */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="relative rounded-2xl bg-card-elevated border border-border p-4 overflow-hidden"
            >
              <div className="relative">
                <div className="flex items-center gap-2 mb-3">
                  <Crown className="w-3.5 h-3.5 text-primary" />
                  <p className="text-[10px] uppercase tracking-[0.2em] text-primary font-medium">
                    Clarity Members
                  </p>
                </div>
                <div className="space-y-3">
                  {allMembers.slice(0, 5).map((m, i) => (
                    <div key={i} className="flex items-center gap-3 rounded-xl px-2 py-1.5 hover:bg-primary/10 transition-colors group">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm shrink-0">
                        {"emoji" in m ? m.emoji : "🧑"}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium text-foreground truncate group-hover:text-primary transition-colors">
                          {"name" in m ? m.name : `@${(m as Submission).username}`}
                        </p>
                        <p className="text-[10px] text-muted-foreground truncate">
                          {"role" in m ? m.role : "Clarity Member"}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
};