import { useBodyScrollLock } from "../lib/hooks.js";
import { I } from "../lib/icons.jsx";

// --- About & FAQ ----------------------------------------------------------
function AboutModal({ onClose }) {
  useBodyScrollLock();

  // A section with an icon chip, heading, and free-form body
  const Section = ({
    icon: IconC,
    tone = "poppy",
    eyebrow,
    title,
    children,
  }) => (
    <div className="mb-8">
      <div
        className={`inline-flex items-center gap-2 px-3 py-1 bg-${tone}-50 rounded-full mb-3`}
      >
        <IconC size={12} className={`text-${tone}-600`} />
        <p
          className={`text-[10px] font-bold tracking-[0.2em] uppercase text-${tone}-700`}
        >
          {eyebrow}
        </p>
      </div>
      <h4 className="font-display font-bold text-xl text-ink-900 mb-2">
        {title}
      </h4>
      <div className="text-sm text-ink-700 leading-relaxed space-y-3">
        {children}
      </div>
    </div>
  );

  // A how-to row inside the "Using Poppy" card
  const HowTo = ({ icon: IconC, title, children }) => (
    <div className="flex gap-3">
      <div className="w-9 h-9 shrink-0 flex items-center justify-center rounded-full bg-cream-50 border-2 border-cream-100 text-ink-600">
        <IconC size={16} />
      </div>
      <div className="flex-1">
        <p className="font-bold text-sm text-ink-900 mb-0.5">{title}</p>
        <p className="text-sm text-ink-700 leading-relaxed">{children}</p>
      </div>
    </div>
  );

  // A single tip pill
  const Tip = ({ children }) => (
    <div className="flex items-start gap-2 p-3 bg-cream-50 border-2 border-cream-100 rounded-2xl">
      <I.check size={14} className="shrink-0 mt-0.5 text-leaf-600" />
      <span className="text-sm text-ink-700 leading-relaxed">{children}</span>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-6">
      <div
        className="absolute inset-0 bg-ink-900/40 backdrop-blur-sm"
        onClick={onClose}
      ></div>

      <div
        data-testid="about-modal"
        className="relative bg-white max-w-2xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-y-auto p-6 sm:p-8 rounded-t-3xl sm:rounded-3xl shadow-2xl fade-up"
      >
        <button
          data-testid="about-close"
          onClick={onClose}
          aria-label="Close"
          className="absolute top-3 right-3 text-ink-500 p-2 active:scale-90"
        >
          <I.x size={22} />
        </button>

        <div className="inline-flex items-center gap-2 px-3 py-1 bg-poppy-50 rounded-full mb-3">
          <I.help size={12} className="text-poppy-600" />
          <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-poppy-700">
            About
          </p>
        </div>

        <h3 className="font-display font-bold text-2xl sm:text-3xl mb-6 text-ink-900">
          Hello, and welcome to <em className="text-poppy-600">Poppy.</em>
        </h3>

        <Section
          icon={I.heart}
          tone="petal"
          eyebrow="About me"
          title="About the app creator"
        >
          <p>
            Hi, I'm Robyn — a software engineer, a mom, and a stereotypically
            unfashionable Seattleite.
          </p>
          <p>
            After my daughter was born I hit a bit of an aesthetic identity
            crisis and started spending way too much time thinking about
            clothes.
          </p>
          <p>
            Poppy is what I've built, in bits of free time, to make sense of it
            all: a way to track what's actually in my closet, plan packing lists
            and seasonal rotations, and add a little creativity to my everyday
            outfits.
          </p>
          <p>
            It's my roadmap through the maze of personal-style vocabulary, color
            seasons, image identities, and more.
          </p>
          <p>
            If you're on a similar journey, give it a try — and please reach
            out. I'd love to hear from you.
          </p>
        </Section>

        <Section
          icon={I.sparkles}
          tone="buttercup"
          eyebrow="Why Poppy"
          title="Why I created this app"
        >
          <p>
            At its heart, Poppy is a tool for appreciating what you already
            have. My hope is to make spending time with your existing wardrobe
            as engaging and beautiful as shopping for the next new thing.
          </p>
          <p>
            What if we saw the clothes we already own in the same aspirational
            light as the ads all around us? Instead of always chasing something
            new, let's sell ourselves on what's already hanging in the closet.
          </p>
        </Section>

        <Section
          icon={I.camera}
          tone="sky2"
          eyebrow="Photo tips"
          title="Tips for cataloging your clothes"
        >
          <p>
            Good photos are what make your closet feel aspirational instead of
            utilitarian. A few ways to get them:
          </p>
          <div className="grid gap-2 mt-1">
            <Tip>
              <strong>Aim for clean, consistent images.</strong> Poppy looks
              best with well-lit photos of a single item, isolated on a plain or
              transparent background.
            </Tip>
            <Tip>
              <strong>Borrow the product photo.</strong> The easiest way to get
              a great shot is to reuse the image made to sell the item — the
              platonic ideal of your well-loved tee, shot by pros to look better
              than anything you'd manage at home. Even for second-hand pieces or
              years-old favorites, it's worth a quick search; the brand name
              plus a short description and a couple of identifying details will
              usually turn one up.
            </Tip>
            <Tip>
              <strong>Fake it for the basics.</strong> For something really
              simple — black leggings, a gray crewneck tee — you don't need a
              photo of your exact piece. Grab an image of a similar product
              instead. No one will ever know.
            </Tip>
            <Tip>
              <strong>Shoot your own.</strong> For one-of-a-kind pieces you
              can't find online, your own photos work too. Use natural light,
              shoot from straight overhead, line up the shoulders, and smooth
              out wrinkles. For a little extra polish, try running the result
              through a photo-generating AI to give it that otherworldly sense
              of perfection.
            </Tip>
          </div>
        </Section>

        <Section
          icon={I.shirt}
          tone="poppy"
          eyebrow="Using Poppy"
          title="How to use the app"
        >
          <div className="space-y-4">
            <HowTo icon={I.plus} title="Add an item">
              Tap the <strong>+</strong> button in the Closet to add a piece.
              Snap or upload a photo, then fill in details like category, brand,
              season, and the year you bought it. The more you fill in, the
              richer your stats get.
            </HowTo>
            <HowTo icon={I.sunglasses} title="Create outfits (Looks)">
              Head to the <strong>Looks</strong> tab and start a new look. Pick
              pieces from your closet to combine them into a complete outfit,
              then save it. Looks are perfect for planning what to wear or
              remembering combos you love.
            </HowTo>
            <HowTo icon={I.camera} title="Save snaps">
              Open the <strong>Snaps</strong> tab to add photos of yourself
              wearing an outfit. They're organized by the date each photo was
              taken and grouped by month. Link a snap to a look — from the look
              builder or the snap's own screen — to remember how you actually
              wore it. Every snap also counts as a wear for each piece in that
              look, so your <strong>Most worn</strong> stats reflect what you
              really reach for.
            </HowTo>
            <HowTo icon={I.suitcase} title="Build collections">
              Open the <strong>Collections</strong> tab to group items and looks
              around a theme — think "Summer capsule," "Work," or "Italy trip."
              Tap any collection to filter your closet down to just those
              pieces.
            </HowTo>
            <HowTo icon={I.tag} title="Add tags">
              While editing an item, add your own <strong>custom tags</strong>{" "}
              (like "cozy," "going out," or "needs tailoring"). Tags are
              searchable and show up in your stats, so you can slice your
              wardrobe any way you think about it.
            </HowTo>
            <HowTo icon={I.pie} title="View your stats">
              Open <strong>Stats</strong> from this menu to see your closet by
              the numbers — breakdowns by category, season, and brand, your
              most-worn pieces, and how much of your closet you actually put
              into looks.
            </HowTo>
          </div>
        </Section>

        <Section
          icon={I.shield}
          tone="leaf"
          eyebrow="Privacy"
          title="How your data is used"
        >
          <p>
            Short version: <strong>your closet stays yours.</strong> Poppy
            stores everything — your items, photos, looks, collections, and tags
            — locally on your own device. Nothing is uploaded to a server, and
            there are no accounts, ads, or trackers.
          </p>
          <p>
            Because your data lives on your device, it's a good idea to back it
            up. Use <strong>Save &amp; restore</strong> in this menu to export a
            copy you can keep safe or move to a new device. If you clear your
            browser data or uninstall the app without a backup, your closet may
            be lost.
          </p>
          <p>
            No part of your wardrobe is ever sold, shared, or used to train
            anything.
          </p>
        </Section>

        <Section
          icon={I.code}
          tone="plum"
          eyebrow="Behind the Scenes"
          title="How Poppy was built"
        >
          <p>
            I have <em>very</em> mixed feelings about the current proliferation
            of AI, but it's the water I'm swimming in. Poppy is my own vision,
            brought to life with a generous amount of help from Claude — without
            which I'd never have found the time to get it off the ground.
          </p>
        </Section>

        <div className="pt-2 border-t-2 border-cream-100">
          <p className="text-xs text-ink-400 text-center">
            <a href="https://github.com/robynm/poppy">
              Made with{" "}
              <I.heart size={11} className="inline text-poppy-500 -mt-0.5" />{" "}
              and{" "}
              <I.sparkles size={11} className="inline text-poppy-500 -mt-0.5" />{" "}
              for closets everywhere.
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}

export { AboutModal };
