import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";

interface Props {
  open: boolean;
  onDismiss: () => void;
}

export function WelcomeModal({ open, onDismiss }: Props) {
  return (
    <DialogPrimitive.Root
      open={open}
      onOpenChange={(next) => {
        if (!next) onDismiss();
      }}
    >
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay
          className="fixed inset-0 z-[100] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0"
          style={{
            background:
              "radial-gradient(ellipse at top, oklch(0.18 0.07 280 / 0.95), oklch(0.08 0.04 270 / 0.98))",
            backdropFilter: "blur(8px)",
          }}
        />
        <DialogPrimitive.Content
          aria-describedby="welcome-description"
          onOpenAutoFocus={(e) => {
            // Let Radix manage focus trap; default focuses first focusable.
            // Prevent jumping to the close (X) icon by focusing the primary CTA.
            e.preventDefault();
            const primary = document.getElementById("welcome-begin-btn");
            primary?.focus();
          }}
          className="fixed inset-0 z-[101] flex items-center justify-center p-4 md:p-8 overflow-y-auto outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0"
        >
          <div className="absolute inset-0 pointer-events-none starfield opacity-60" aria-hidden="true" />
          <div className="relative w-full max-w-2xl glass rounded-3xl shadow-deep border border-gold/20 my-auto">
            <DialogPrimitive.Close
              aria-label="Close welcome message"
              className="absolute right-4 top-4 z-10 inline-flex h-11 w-11 items-center justify-center rounded-full border border-gold/30 bg-background/40 text-gold transition hover:bg-background/70 focus:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              <X className="h-5 w-5" aria-hidden="true" />
              <span className="sr-only">Close welcome message</span>
            </DialogPrimitive.Close>
            <div className="p-8 md:p-12 space-y-6 max-h-[85vh] overflow-y-auto">
          <div className="text-center space-y-3">
            <div className="inline-block text-4xl md:text-5xl text-gold animate-pulse" aria-hidden>✦</div>
            <p className="text-xs uppercase tracking-[0.4em] text-gold">A Personal Welcome</p>
            <DialogPrimitive.Title className="font-display text-3xl md:text-5xl text-gradient-gold leading-tight">
              Welcome to The Cosmic Blueprint
            </DialogPrimitive.Title>
          </div>

          <DialogPrimitive.Description id="welcome-description" asChild>
          <div className="space-y-4 text-muted-foreground leading-relaxed text-[0.97rem] md:text-base">
            <p>First, thank you.</p>
            <p>
              Thank you for becoming part of <span className="text-gold">The Cosmic Blueprint</span> community.
              Whether you've just created your free account or invested in one of our premium reports, I truly
              appreciate the trust you've placed in this project.
            </p>
            <p>
              For thousands of years, people across nearly every civilization have looked toward the heavens
              searching for meaning. Long before modern science, our ancestors noticed that the movements of
              the Sun, Moon, and planets seemed to coincide with the rhythms of life here on Earth. Over
              centuries, those observations evolved into the rich system we now know as astrology—not as a
              tool to predict every event with certainty, but as a language for understanding ourselves, our
              relationships, our strengths, our challenges, and the opportunities that shape our journey.
            </p>
            <p>
              Today, we have something our ancestors never imagined: the ability to combine centuries of
              astrological wisdom with modern technology. That's exactly why I created The Cosmic Blueprint.
            </p>
            <p>
              These reports are designed to go far beyond generic horoscope descriptions. They are
              personalized specifically for your unique birth chart, offering insights into your personality,
              your relationships, your purpose, your life cycles, your hidden gifts, and the lessons that can
              help you grow into the very best version of yourself.
            </p>
            <p>
              I encourage you to return to your reports often. As life changes, you'll discover that
              different sections begin to speak to you in new ways. What may seem insignificant today could
              become one of your greatest sources of clarity months or even years from now.
            </p>
            <p>
              Remember, astrology doesn't replace your free will—it empowers it.
            </p>
            <p className="text-foreground/90">
              The stars may reveal possibilities, but your choices create your future.
            </p>
            <p>
              No matter where you are in life right now, you possess incredible potential waiting to be
              awakened. Every challenge can become wisdom. Every ending creates the space for a new
              beginning. Every chapter of your story has meaning.
            </p>
            <p>
              I sincerely hope these reports inspire you, encourage you, and help you discover something
              extraordinary about yourself.
            </p>
            <p>Thank you again for allowing me to be a small part of your journey.</p>
            <p>May your path be filled with purpose, confidence, growth, and endless possibilities.</p>
            <p className="text-gold/90">The universe has always been speaking.</p>
            <p className="text-gold/90">Now it's your turn to listen.</p>
            <div className="pt-2">
              <p className="text-muted-foreground">With gratitude,</p>
              <p className="font-display text-xl text-gradient-gold mt-1">Kyle Merritt</p>
              <p className="text-xs uppercase tracking-widest text-muted-foreground">
                Founder, The Cosmic Blueprint
              </p>
            </div>
          </div>
          </DialogPrimitive.Description>

          <div className="pt-4 border-t border-border/40 text-center">
            <p className="italic font-display text-gold/90 text-base md:text-lg leading-relaxed">
              "Every chart tells a story. Thank you for allowing The Cosmic Blueprint to help you discover yours."
            </p>
          </div>

          <div className="pt-4 flex justify-center">
            <button
              id="welcome-begin-btn"
              type="button"
              onClick={onDismiss}
              className="min-h-11 px-8 py-3 rounded-xl bg-gold text-primary-foreground font-display tracking-[0.2em] uppercase text-sm shadow-gold hover:opacity-95 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              Begin My Journey
            </button>
          </div>
            </div>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}