import { useSearchParams, Link } from "react-router-dom";
import { CheckCircle, Calendar, Clock, MessageCircle, ExternalLink, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";

function buildCalendarUrl(date: string, time: string, meetLink: string) {
  // Build Google Calendar add-event URL
  const [year, month, day] = date.split("-").map(Number);
  const isPM = time.includes("PM");
  const isAM12 = time.includes("AM") && time.startsWith("12");
  const [h] = time.replace(" AM", "").replace(" PM", "").split(":").map(Number);
  let startHour = h;
  if (isPM && h !== 12) startHour = h + 12;
  if (isAM12) startHour = 0;
  const endHour = startHour + 2;

  const pad = (n: number) => String(n).padStart(2, "0");
  const start = `${year}${pad(month)}${pad(day)}T${pad(startHour)}0000`;
  const end   = `${year}${pad(month)}${pad(day)}T${pad(endHour)}0000`;

  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=Clarity+Breakthrough+Session&dates=${start}/${end}&details=Join+here:+${encodeURIComponent(meetLink)}&location=${encodeURIComponent(meetLink)}`;
}

const WHATSAPP_NUMBER = "919871927402";

export default function ConfirmationPage() {
  const [params] = useSearchParams();
  const sessionId  = params.get("id")  || "";
  const date       = params.get("date") || "";
  const time       = params.get("time") || "";
  const name       = params.get("name") || "there";
  // Empty when no real link is configured yet. Never fall back to a fake
  // placeholder URL — the backend now returns null in that case, and the
  // customer is told the link arrives by email before the session.
  const meetLink   = params.get("meet") || "";

  const calendarUrl = date && time
    ? buildCalendarUrl(date, time, meetLink || "Link will be emailed before your session")
    : "#";

  return (
    <main className="min-h-screen bg-transparent relative z-0">
      <Navbar />

      <section className="pt-28 pb-20 px-4">
        <div className="max-w-lg mx-auto">

          {/* Success icon */}
          <div className="text-center mb-10">
            <div className="w-24 h-24 rounded-full bg-green-500/10 border-2 border-green-500/30 flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-12 h-12 text-green-400" />
            </div>
            <h1 className="text-3xl md:text-4xl font-bold mb-3">
              You're Booked, {name.split(" ")[0]}!
            </h1>
            <p className="text-muted-foreground">
              Your Clarity Breakthrough Session is confirmed and paid.
              Check your email for full details.
            </p>
          </div>

          {/* Session details card */}
          <div className="glass border border-white/10 rounded-2xl p-6 mb-6">
            <h2 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground mb-4">
              Session Details
            </h2>
            <div className="space-y-3">
              {date && (
                <div className="flex items-center gap-3">
                  <Calendar className="w-4 h-4 text-primary" />
                  <span className="text-sm">{date}</span>
                </div>
              )}
              {time && (
                <div className="flex items-center gap-3">
                  <Clock className="w-4 h-4 text-primary" />
                  <span className="text-sm">{time} IST · 120 Minutes</span>
                </div>
              )}
              {meetLink && meetLink !== "https://meet.google.com/your-meeting-link" && (
                <div className="flex items-center gap-3">
                  <ExternalLink className="w-4 h-4 text-primary" />
                  <a
                    href={meetLink}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm text-primary hover:underline"
                  >
                    Join Video Call
                  </a>
                </div>
              )}
              <div className="flex items-center gap-3">
                <MessageCircle className="w-4 h-4 text-green-400" />
                <span className="text-sm text-green-400">7-day WhatsApp support activated</span>
              </div>
            </div>
          </div>

          {/* What happens next */}
          <div className="glass border border-white/10 rounded-2xl p-6 mb-6">
            <h2 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground mb-4">
              What Happens Next
            </h2>
            <div className="space-y-3">
              {[
                "Check your email for confirmation and the Meet link",
                "You'll receive a WhatsApp welcome message shortly",
                "Prepare your top 3 challenges before the session",
                "Join the video call 2 minutes early on the day",
                "Receive your action plan and session notes after",
                "7-day WhatsApp check-ins begin the day after your session",
              ].map((step, i) => (
                <div key={step} className="flex items-start gap-3">
                  <span className="w-5 h-5 rounded-full bg-primary/15 text-primary text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                    {i + 1}
                  </span>
                  <span className="text-sm text-foreground/80">{step}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Action buttons */}
          <div className="space-y-3">
            {calendarUrl !== "#" && (
              <a href={calendarUrl} target="_blank" rel="noreferrer">
                <Button variant="glass" className="w-full gap-2">
                  <Calendar className="w-4 h-4" />
                  Add to Google Calendar
                </Button>
              </a>
            )}
            <a
              href={`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(`Hi! I just booked my Clarity Breakthrough Session (${date} at ${time}). Looking forward to it!`)}`}
              target="_blank"
              rel="noreferrer"
            >
              <Button variant="glass" className="w-full gap-2 text-green-400 border-green-400/20 hover:bg-green-400/10">
                <MessageCircle className="w-4 h-4" />
                Message on WhatsApp
              </Button>
            </a>
            <Link to="/">
              <Button variant="glass" className="w-full gap-2">
                Back to badly talks
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>

          {sessionId && (
            <p className="text-center text-xs text-muted-foreground/50 mt-6">
              Booking ref: {sessionId.slice(0, 8).toUpperCase()}
            </p>
          )}
        </div>
      </section>

      <Footer />
    </main>
  );
}
