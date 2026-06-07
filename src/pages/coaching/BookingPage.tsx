import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import {
  Calendar, Clock, User, Mail, Phone, MessageSquare,
  ChevronLeft, ChevronRight, Shield, Loader2, CheckCircle
} from "lucide-react";

declare global { interface Window { Razorpay: any } }

const STEP_LABELS = ["Select Date", "Select Time", "Your Details", "Confirm & Pay"];

function loadRazorpay(): Promise<boolean> {
  return new Promise(resolve => {
    if (window.Razorpay) return resolve(true);
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload  = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

function getDayLabel(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-IN", { weekday: "short" });
}

function getDayNum(dateStr: string) {
  return new Date(dateStr + "T00:00:00").getDate();
}

function getMonthLabel(dateStr: string) {
  return new Date(dateStr + "T00:00:00").toLocaleDateString("en-IN", { month: "short" });
}

export default function BookingPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [slots, setSlots]   = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState<string | null>(null);

  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("");
  const [form, setForm] = useState({ name: "", email: "", phone: "", challenge: "" });
  const [paying, setPaying] = useState(false);

  useEffect(() => {
    fetch("/api/coaching/slots")
      .then(r => r.json())
      .then(d => { setSlots(d.slots || {}); setLoading(false); })
      .catch(() => { setError("Failed to load available slots. Please refresh."); setLoading(false); });
  }, []);

  const dates = Object.keys(slots).sort();

  async function handlePay() {
    if (!form.name || !form.email) return;
    setPaying(true);
    setError(null);

    const loaded = await loadRazorpay();
    if (!loaded) { setError("Failed to load payment gateway. Check your connection."); setPaying(false); return; }

    try {
      const res = await fetch("/api/coaching/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientName:  form.name,
          clientEmail: form.email,
          sessionDate: selectedDate,
          sessionTime: selectedTime,
        }),
      });
      const order = await res.json();
      if (order.error) throw new Error(order.error);

      const options = {
        key:         import.meta.env.VITE_RAZORPAY_KEY_ID,
        amount:      order.amount,
        currency:    order.currency,
        name:        "Clarity Mode",
        description: "1-on-1 Breakthrough Session · 120 Min",
        order_id:    order.orderId,
        prefill:     { name: form.name, email: form.email, contact: form.phone },
        theme:       { color: "#7c3aed" },
        handler: async (response: any) => {
          const verify = await fetch("/api/coaching/verify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              razorpay_order_id:   response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature:  response.razorpay_signature,
              clientName:      form.name,
              clientEmail:     form.email,
              clientPhone:     form.phone,
              clientChallenge: form.challenge,
              sessionDate:     selectedDate,
              sessionTime:     selectedTime,
            }),
          });
          const result = await verify.json();
          if (result.success) {
            navigate(
              `/coaching/confirmation?id=${result.sessionId}&date=${selectedDate}&time=${encodeURIComponent(selectedTime)}&name=${encodeURIComponent(form.name)}&meet=${encodeURIComponent(result.meetLink || "")}`
            );
          } else {
            setError(result.error || "Payment verified but booking failed. Contact support.");
            setPaying(false);
          }
        },
        modal: { ondismiss: () => setPaying(false) },
      };

      new window.Razorpay(options).open();
    } catch (err: any) {
      setError(err.message || "Payment failed. Please try again.");
      setPaying(false);
    }
  }

  const canProceedStep1 = !!selectedDate;
  const canProceedStep2 = !!selectedTime;
  const canProceedStep3 = form.name.trim().length > 1 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email);

  return (
    <main className="min-h-screen bg-transparent relative z-0 overflow-x-hidden">
      <Navbar />

      <section className="pt-28 pb-20 px-4">
        <div className="max-w-xl mx-auto">

          {/* Header */}
          <div className="text-center mb-10">
            <h1 className="text-3xl font-bold mb-2">Book Your Session</h1>
            <p className="text-muted-foreground text-sm">
              1-on-1 Deep Clarity Breakthrough · 120 Min · ₹3,000
            </p>
          </div>

          {/* Step indicator */}
          <div className="flex items-center justify-between mb-10 relative">
            <div className="absolute top-4 left-0 right-0 h-px bg-white/10 -z-0" />
            {STEP_LABELS.map((label, i) => (
              <div key={label} className="flex flex-col items-center gap-2 z-10">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
                  i < step ? "bg-primary text-white" :
                  i === step ? "bg-primary/20 border-2 border-primary text-primary" :
                  "bg-white/5 border border-white/10 text-muted-foreground"
                }`}>
                  {i < step ? <CheckCircle className="w-4 h-4" /> : i + 1}
                </div>
                <span className={`text-[10px] font-medium hidden sm:block ${i === step ? "text-primary" : "text-muted-foreground"}`}>
                  {label}
                </span>
              </div>
            ))}
          </div>

          {loading && (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          )}

          {error && (
            <div className="p-4 rounded-xl border border-destructive/30 bg-destructive/5 text-destructive text-sm mb-6 text-center">
              {error}
            </div>
          )}

          {!loading && (
            <>
              {/* ── Step 0: Date ──────────────────────────────────── */}
              {step === 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-6">
                    <Calendar className="w-4 h-4 text-primary" />
                    <h2 className="font-semibold">Choose a Date</h2>
                  </div>

                  {dates.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground text-sm">
                      No slots available right now. Check back soon or contact us via WhatsApp.
                    </div>
                  ) : (
                    <div className="grid grid-cols-4 sm:grid-cols-7 gap-2 mb-8">
                      {dates.map(date => (
                        <button
                          key={date}
                          onClick={() => { setSelectedDate(date); setSelectedTime(""); }}
                          className={`flex flex-col items-center gap-1 py-3 px-1 rounded-xl border transition-all text-center ${
                            selectedDate === date
                              ? "border-primary bg-primary/10 text-primary"
                              : "border-white/10 hover:border-primary/40 hover:bg-white/5 text-foreground/70"
                          }`}
                        >
                          <span className="text-[10px] uppercase tracking-wide">{getDayLabel(date)}</span>
                          <span className="text-xl font-bold">{getDayNum(date)}</span>
                          <span className="text-[10px] text-muted-foreground">{getMonthLabel(date)}</span>
                        </button>
                      ))}
                    </div>
                  )}

                  <Button
                    className="w-full"
                    variant="hero"
                    disabled={!canProceedStep1}
                    onClick={() => setStep(1)}
                  >
                    Continue <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              )}

              {/* ── Step 1: Time ──────────────────────────────────── */}
              {step === 1 && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="w-4 h-4 text-primary" />
                    <h2 className="font-semibold">Choose a Time</h2>
                  </div>
                  <p className="text-xs text-muted-foreground mb-6">{formatDate(selectedDate)} · All times in IST</p>

                  <div className="grid grid-cols-2 gap-3 mb-8">
                    {(slots[selectedDate] || []).map(time => (
                      <button
                        key={time}
                        onClick={() => setSelectedTime(time)}
                        className={`py-4 rounded-xl border font-medium transition-all text-sm ${
                          selectedTime === time
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-white/10 hover:border-primary/40 hover:bg-white/5"
                        }`}
                      >
                        {time} IST
                        <span className="block text-xs text-muted-foreground mt-1">
                          {time} — {(() => {
                            const isPM = time.includes("PM");
                            const [h] = time.replace(" AM","").replace(" PM","").split(":").map(Number);
                            let end = h + 2;
                            if (isPM && h !== 12) end = (h + 12) + 2;
                            const endH = end > 12 ? end - 12 : end;
                            const period = end >= 12 && end < 24 ? "PM" : (end >= 24 ? "AM" : "AM");
                            return `${endH}:00 ${period}`;
                          })()}
                        </span>
                      </button>
                    ))}
                  </div>

                  <div className="flex gap-3">
                    <Button variant="glass" className="flex-1" onClick={() => setStep(0)}>
                      <ChevronLeft className="w-4 h-4 mr-1" /> Back
                    </Button>
                    <Button variant="hero" className="flex-1" disabled={!canProceedStep2} onClick={() => setStep(2)}>
                      Continue <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                  </div>
                </div>
              )}

              {/* ── Step 2: Details ───────────────────────────────── */}
              {step === 2 && (
                <div>
                  <div className="flex items-center gap-2 mb-6">
                    <User className="w-4 h-4 text-primary" />
                    <h2 className="font-semibold">Your Details</h2>
                  </div>

                  <div className="space-y-4 mb-8">
                    <div>
                      <label className="block text-xs text-muted-foreground mb-1.5">Full Name *</label>
                      <div className="relative">
                        <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <input
                          type="text"
                          placeholder="Your full name"
                          value={form.name}
                          onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                          className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/5 border border-white/10 focus:border-primary outline-none text-sm transition-colors"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs text-muted-foreground mb-1.5">Email Address *</label>
                      <div className="relative">
                        <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <input
                          type="email"
                          placeholder="your@email.com"
                          value={form.email}
                          onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                          className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/5 border border-white/10 focus:border-primary outline-none text-sm transition-colors"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs text-muted-foreground mb-1.5">
                        WhatsApp Number <span className="text-muted-foreground/60">(for 7-day support)</span>
                      </label>
                      <div className="relative">
                        <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <input
                          type="tel"
                          placeholder="+91 98765 43210"
                          value={form.phone}
                          onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                          className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/5 border border-white/10 focus:border-primary outline-none text-sm transition-colors"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs text-muted-foreground mb-1.5">
                        What do you want clarity on? <span className="text-muted-foreground/60">(optional)</span>
                      </label>
                      <div className="relative">
                        <MessageSquare className="absolute left-3.5 top-3.5 w-4 h-4 text-muted-foreground" />
                        <textarea
                          rows={3}
                          placeholder="Describe your challenge briefly so we can prepare for your session..."
                          value={form.challenge}
                          onChange={e => setForm(f => ({ ...f, challenge: e.target.value }))}
                          className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/5 border border-white/10 focus:border-primary outline-none text-sm transition-colors resize-none"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <Button variant="glass" className="flex-1" onClick={() => setStep(1)}>
                      <ChevronLeft className="w-4 h-4 mr-1" /> Back
                    </Button>
                    <Button variant="hero" className="flex-1" disabled={!canProceedStep3} onClick={() => setStep(3)}>
                      Review Booking <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                  </div>
                </div>
              )}

              {/* ── Step 3: Confirm & Pay ─────────────────────────── */}
              {step === 3 && (
                <div>
                  <h2 className="font-semibold mb-6">Confirm & Pay</h2>

                  {/* Summary card */}
                  <div className="glass border border-white/10 rounded-2xl p-6 mb-6 space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Service</span>
                      <span className="font-medium">1-on-1 Breakthrough Session</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Date</span>
                      <span>{formatDate(selectedDate)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Time</span>
                      <span>{selectedTime} IST</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Duration</span>
                      <span>120 Minutes</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Name</span>
                      <span>{form.name}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Email</span>
                      <span className="truncate max-w-[180px]">{form.email}</span>
                    </div>
                    <div className="border-t border-white/10 pt-3 flex justify-between font-semibold">
                      <span>Total</span>
                      <span className="text-primary text-lg">₹3,000</span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      + 7 Days WhatsApp Support · Session Summary Notes
                    </div>
                  </div>

                  {/* Guarantee note */}
                  <div className="flex items-start gap-3 p-4 rounded-xl bg-primary/5 border border-primary/20 mb-6">
                    <Shield className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                    <p className="text-xs text-foreground/70 leading-relaxed">
                      Protected by our Satisfaction Promise. If you attend the full session and receive
                      no value, contact us within 24 hours for a review and resolution.
                    </p>
                  </div>

                  <div className="flex gap-3">
                    <Button variant="glass" className="flex-1" disabled={paying} onClick={() => setStep(2)}>
                      <ChevronLeft className="w-4 h-4 mr-1" /> Back
                    </Button>
                    <Button
                      variant="hero"
                      className="flex-1"
                      disabled={paying}
                      onClick={handlePay}
                    >
                      {paying
                        ? <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Processing…</>
                        : "Pay ₹3,000 Securely"
                      }
                    </Button>
                  </div>

                  <p className="text-center text-xs text-muted-foreground mt-4">
                    Secured by Razorpay · UPI · Cards · Net Banking
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </section>

      <Footer />
    </main>
  );
}
