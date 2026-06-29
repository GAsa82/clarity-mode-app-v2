import { Link } from "react-router-dom";
import {
  BookMarked,
  Store,
  Library,
  Grid3X3,
  Shield,
  FileText,
  Image,
  Video,
  Sparkles,
  MessageSquare,
  ArrowRight,
  Plus,
} from "lucide-react";

const contentTypes = [
  {
    to: "/admin/research-papers",
    icon: BookMarked,
    label: "Research Papers",
    desc: "Upload and manage academic research, studies, and papers.",
    accent: "from-blue-500/15 to-blue-900/30",
    iconColor: "text-blue-400",
  },
  {
    to: "/admin/old-books",
    icon: Store,
    label: "Old Books",
    desc: "List rare and second-hand books for sale.",
    accent: "from-amber-500/15 to-amber-900/30",
    iconColor: "text-amber-400",
  },
  {
    to: "/admin/library",
    icon: Library,
    label: "Premium Library",
    desc: "PDFs, guides, workbooks, and downloadable resources.",
    accent: "from-purple-500/15 to-purple-900/30",
    iconColor: "text-purple-400",
  },
  {
    to: "/admin/frameworks",
    icon: Grid3X3,
    label: "Frameworks",
    desc: "Mental models and decision-making frameworks.",
    accent: "from-emerald-500/15 to-emerald-900/30",
    iconColor: "text-emerald-400",
  },
  {
    to: "/admin/protocols",
    icon: Shield,
    label: "Protocols",
    desc: "Step-by-step focus and clarity protocols.",
    accent: "from-cyan-500/15 to-cyan-900/30",
    iconColor: "text-cyan-400",
  },
  {
    to: "/admin/templates",
    icon: FileText,
    label: "Templates",
    desc: "Fillable templates for journaling, planning, and tracking.",
    accent: "from-rose-500/15 to-rose-900/30",
    iconColor: "text-rose-400",
  },
  {
    to: "/admin/clarity-sessions",
    icon: Video,
    label: "Clarity Sessions",
    desc: "Netflix-style video and audio sessions shown in the browse section.",
    accent: "from-blue-500/15 to-indigo-900/30",
    iconColor: "text-blue-400",
  },
  {
    to: "/admin/media",
    icon: Image,
    label: "Media Library",
    desc: "Browse and manage all uploaded media assets — audio, video, images.",
    accent: "from-slate-500/15 to-slate-800/30",
    iconColor: "text-slate-400",
  },
  {
    to: "/admin/site-content",
    icon: Sparkles,
    label: "Site Content",
    desc: "Edit the landing page hero and toggle homepage sections.",
    accent: "from-yellow-500/15 to-amber-900/30",
    iconColor: "text-yellow-400",
  },
  {
    to: "/admin/testimonials",
    icon: MessageSquare,
    label: "Testimonials",
    desc: "Manage real, published testimonials shown on the website.",
    accent: "from-pink-500/15 to-rose-900/30",
    iconColor: "text-pink-400",
  },
];

export default function ContentStudioPage() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="font-display text-2xl md:text-3xl font-light mb-2">Content Studio</h1>
        <p className="text-muted-foreground text-sm">
          Manage all premium content — research papers, books, frameworks, protocols, and media.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {contentTypes.map((ct) => {
          const Icon = ct.icon;
          return (
            <Link
              key={ct.to}
              to={ct.to}
              className={`group relative bg-gradient-to-br ${ct.accent} border border-border hover:border-primary/30 rounded-2xl p-5 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/5`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className={`p-2.5 rounded-xl bg-background/40 ${ct.iconColor}`}>
                  <Icon className="w-5 h-5" strokeWidth={1.5} />
                </div>
                <ArrowRight className="w-4 h-4 text-muted-foreground/50 group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
              </div>
              <h3 className="font-medium text-sm mb-1">{ct.label}</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">{ct.desc}</p>
            </Link>
          );
        })}
      </div>

      {/* Quick action bar */}
      <div className="mt-8 p-4 rounded-2xl bg-card border border-border">
        <p className="text-xs uppercase tracking-widest text-muted-foreground mb-3">Quick Actions</p>
        <div className="flex flex-wrap gap-2">
          {[
            { to: "/admin/research-papers?new=1", label: "New Research Paper" },
            { to: "/admin/old-books?new=1", label: "List a Book" },
            { to: "/admin/frameworks?new=1", label: "New Framework" },
            { to: "/admin/protocols?new=1", label: "New Protocol" },
            { to: "/admin/templates?new=1", label: "New Template" },
          ].map((qa) => (
            <Link
              key={qa.to}
              to={qa.to}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary hover:bg-primary/10 hover:text-primary border border-transparent hover:border-primary/20 text-xs text-muted-foreground transition-all"
            >
              <Plus className="w-3 h-3" />
              {qa.label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
