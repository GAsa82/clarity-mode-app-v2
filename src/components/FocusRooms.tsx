import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Users, Hash, Monitor, Headphones, Lock, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { focusRooms, type FocusRoom } from "@/lib/focus-rooms";

const FocusRoomCard = ({ room, index }: { room: FocusRoom; index: number }) => {
  const [hovered, setHovered] = useState(false);
  const navigate = useNavigate();
  const fillPercent = Math.round((room.active / room.capacity) * 100);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.06, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="group relative bg-card-elevated border border-border rounded-2xl p-5 hover:border-primary/30 transition-all duration-500 hover:-translate-y-1"
    >
      <div className="absolute inset-0 rounded-2xl bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

      <div className="relative">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center text-lg group-hover:bg-primary/10 transition-colors">
              <span>{room.emoji}</span>
            </div>
            <div>
              <h3 className="font-display text-base font-medium">{room.name}</h3>
              <div className="flex items-center gap-2 mt-0.5">
                <div className="flex items-center gap-1">
                  <Users className="w-3 h-3 text-primary" />
                  <span className="text-[10px] text-muted-foreground tabular-nums">
                    {room.active}/{room.capacity}
                  </span>
                </div>
                {room.locked && (
                  <div className="flex items-center gap-0.5 text-[10px] text-amber-400">
                    <Lock className="w-2.5 h-2.5" />
                    Premium
                  </div>
                )}
              </div>
            </div>
          </div>
          {room.locked ? (
            <Button variant="glass" size="sm" className="text-[10px] px-3 py-1 h-auto" disabled>
              <Lock className="w-2.5 h-2.5 mr-1" />
              Unlock
            </Button>
          ) : (
            <Button
              variant={hovered ? "hero" : "glass"}
              size="sm"
              className="text-[10px] px-3 py-1 h-auto transition-all"
              onClick={() => navigate(`/room/${room.slug}`)}
            >
              <Play className="w-2.5 h-2.5 mr-1" />
              Join
            </Button>
          )}
        </div>

        <p className="text-xs text-muted-foreground leading-relaxed mb-3">
          {room.description}
        </p>

        <div className="flex items-center gap-2 mb-3">
          {room.tags.map((tag) => (
            <span
              key={tag}
              className="text-[9px] px-2 py-0.5 rounded-full bg-secondary text-muted-foreground"
            >
              {tag}
            </span>
          ))}
        </div>

        {/* Capacity bar */}
        <div className="h-1 rounded-full bg-secondary overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            whileInView={{ width: `${fillPercent}%` }}
            viewport={{ once: true }}
            transition={{ delay: index * 0.06 + 0.4, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            className={`h-full rounded-full transition-colors ${
              room.locked
                ? "bg-amber-500/60"
                : fillPercent > 80
                  ? "bg-green-500/60"
                  : "bg-primary/60"
            }`}
          />
        </div>
        <div className="flex items-center justify-between mt-1">
          <span className="text-[9px] text-muted-foreground">{fillPercent}% full</span>
          <span className="text-[9px] text-muted-foreground">
            {room.active} focus{room.active !== 1 ? "ers" : ""} now
          </span>
        </div>
      </div>
    </motion.div>
  );
};

export const FocusRooms = () => {
  const [totalActive, setTotalActive] = useState(0);

  useEffect(() => {
    setTotalActive(focusRooms.reduce((sum, r) => sum + r.active, 0));
  }, []);

  return (
    <section className="py-24 md:py-32 relative">
      <div className="container">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-12">
          <div className="max-w-xl">
            <p className="text-xs uppercase tracking-[0.25em] text-primary mb-4 flex items-center gap-2">
              <Hash className="w-3.5 h-3.5" />
              Live Focus Rooms
            </p>
            <h2 className="font-display text-4xl md:text-5xl font-light leading-tight">
              Focus with <span className="text-silver italic">strangers</span> who get it.
            </h2>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="font-display text-2xl font-light text-gradient">{totalActive}</p>
              <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                Focusing Now
              </p>
            </div>
            <div className="w-px h-10 bg-border" />
            <div className="text-right">
              <p className="font-display text-2xl font-light text-gradient">{focusRooms.length}</p>
              <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                Active Rooms
              </p>
            </div>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="flex items-center gap-3 rounded-2xl bg-card-elevated border border-border p-4"
          >
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Users className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="font-display text-xl font-light text-gradient">{totalActive}</p>
              <p className="text-[9px] uppercase tracking-[0.2em] text-muted-foreground">Live Focusers</p>
            </div>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.15 }}
            className="flex items-center gap-3 rounded-2xl bg-card-elevated border border-border p-4"
          >
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Monitor className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="font-display text-xl font-light text-gradient">{focusRooms.length}</p>
              <p className="text-[9px] uppercase tracking-[0.2em] text-muted-foreground">Focus Rooms</p>
            </div>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="flex items-center gap-3 rounded-2xl bg-card-elevated border border-border p-4"
          >
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Headphones className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="font-display text-xl font-light text-gradient">1.2k</p>
              <p className="text-[9px] uppercase tracking-[0.2em] text-muted-foreground">Sessions Today</p>
            </div>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.25 }}
            className="flex items-center gap-3 rounded-2xl bg-card-elevated border border-border p-4"
          >
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Lock className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <p className="font-display text-xl font-light text-amber-400">1</p>
              <p className="text-[9px] uppercase tracking-[0.2em] text-muted-foreground">Premium Room</p>
            </div>
          </motion.div>
        </div>

        {/* Room grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {focusRooms.map((room, i) => (
            <FocusRoomCard key={room.id} room={room} index={i} />
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.4 }}
          className="mt-8 text-center"
        >
          <p className="text-xs text-muted-foreground/60">
            Rooms reset every hour. Focus streaks are saved to your profile.{' '}
            <span className="text-primary">Join any open room instantly.</span>
          </p>
        </motion.div>
      </div>
    </section>
  );
};