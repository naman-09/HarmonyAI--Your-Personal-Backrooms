'use client';

import { useMemo, useState } from 'react';
import { ChevronDown, Search, Wind, Anchor, Phone, BookOpen, Dumbbell } from 'lucide-react';
import { BreathingExercise } from '@/components/breathing-exercise';
import { Sidebar } from '@/components/sidebar';
import { ClientStyle } from '@/components/client-style';

type ResourceType = 'article' | 'exercise';
interface Resource {
  id:          string;
  title:       string;
  blurb:       string;
  category:    string;
  type:        ResourceType;
  readTime:    string;
  content:     string;   // markdown-ish body shown when expanded
}

// ─── Resource library (with full content) ────────────────────────
const RESOURCES: Resource[] = [
  {
    id: 'anxiety-101',
    title: 'Understanding Anxiety',
    blurb: 'What anxiety actually is, and why your body reacts the way it does.',
    category: 'anxiety',
    type: 'article',
    readTime: '4 min read',
    content: `Anxiety isn't a flaw — it's your nervous system doing exactly what it evolved to do, just on the wrong timing. When you sense a threat (real or imagined), your body floods with adrenaline and cortisol. Heart races. Breath shortens. Muscles tense.

In a real emergency, that's lifesaving. In a Tuesday-afternoon meeting, it's just exhausting.

WHAT HELPS IN THE MOMENT
• Slow your exhale longer than your inhale (4 in, 6 out) — this signals safety to your vagus nerve.
• Name what you feel out loud. "I notice my chest is tight." Labeling reduces the intensity by ~30%.
• Move. A 60-second walk, even pacing in a room, burns off the adrenaline.

WHAT HELPS LONG-TERM
• Caffeine and sleep matter more than you think. Cut one, fix the other.
• Anxiety often points to a worry you've been avoiding. Sitting with it on paper (not in your head) often shrinks it.
• If anxiety stops you from doing things that matter to you, talking to a professional is the most efficient path forward — not a last resort.`,
  },
  {
    id: 'grounding-54321',
    title: 'The 5-4-3-2-1 Grounding Technique',
    blurb: 'A 60-second exercise to pull yourself out of a spiral.',
    category: 'anxiety',
    type: 'exercise',
    readTime: '1 min practice',
    content: `When your mind is spinning, your senses are the fastest way back to the present.

Pause wherever you are and find:

5 — things you can SEE
Look around. Notice them slowly. The pattern of the floor. A speck on the wall.

4 — things you can TOUCH
The texture of your clothes. The temperature of the air. Press your feet into the ground.

3 — things you can HEAR
Distant traffic. A fan. Your own breath.

2 — things you can SMELL
The room. Your skin. A nearby drink.

1 — thing you can TASTE
The inside of your mouth counts.

By the time you finish, the worst spike usually has passed. This isn't about fixing the feeling — it's about coming back to your body, where you can actually deal with it.`,
  },
  {
    id: 'pmr',
    title: 'Progressive Muscle Relaxation',
    blurb: 'Release stress your body has been holding all day without you noticing.',
    category: 'stress',
    type: 'exercise',
    readTime: '8 min practice',
    content: `Stress lives in your muscles. Most people carry it in their jaw, shoulders, and lower back without realizing.

Lie down or sit comfortably. For each muscle group below, tense it hard for 5 seconds, then release for 10 seconds. Notice the contrast.

1. Hands — clench fists tight, then release.
2. Arms — flex biceps, then drop.
3. Shoulders — pull up toward ears, then drop heavily.
4. Face — scrunch everything (eyes, mouth, brow), then soften.
5. Jaw — clench teeth, then let your mouth fall slightly open.
6. Chest — take a deep breath and hold, then exhale completely.
7. Stomach — pull in tight, then release.
8. Legs — straighten, point toes hard, then let go.
9. Whole body — tense everything at once for 5 seconds, then collapse.

End with three slow breaths. Notice where you feel different than when you started.

This is one of the most-studied techniques for sleep and chronic stress — and it costs nothing.`,
  },
  {
    id: 'depression',
    title: 'Dealing with Depression',
    blurb: "Small steps when everything feels heavy and motivation is gone.",
    category: 'depression',
    type: 'article',
    readTime: '5 min read',
    content: `Depression lies. It tells you nothing will help, you're a burden, this is just who you are now. None of that is true — but the chemistry making you believe it is real.

The cruel trick of depression is that it removes motivation precisely when motivation is what you need. So don't wait for motivation. Action comes first, motivation follows.

THE 2-MINUTE RULE
Whatever feels impossible — pick the smallest version. Don't "exercise"; put on socks. Don't "clean the apartment"; pick up one cup. Don't "see friends"; reply to one text.

You're not trying to fix your life. You're trying to prove to your brain that you can still move.

WHAT DEPRESSION DOESN'T WANT YOU TO DO
• Get outside, even for 5 minutes. Sunlight is medicine.
• Eat something with protein. Low blood sugar amplifies despair.
• Talk to one person who knew you before this. They remember who you are when you can't.

WHEN TO REACH OUT
If you've felt this way for more than 2 weeks, if it's hard to function, or if you're having thoughts of harming yourself — please talk to a professional. Not because you're broken, but because depression is treatable, and you deserve to feel better. iCall: 9152987821.`,
  },
  {
    id: 'anger',
    title: 'Managing Anger Constructively',
    blurb: 'Anger is information. Here\'s how to read it without burning everything down.',
    category: 'anger',
    type: 'article',
    readTime: '4 min read',
    content: `Anger isn't bad — it's a signal. It usually means a boundary was crossed, a value was violated, or you feel powerless about something. The problem isn't the feeling, it's what you do in the 90 seconds after.

THE 90-SECOND RULE
The neurochemical surge of anger lasts about 90 seconds. Anything longer is you re-feeding it with thoughts. Buy yourself those 90 seconds:

• Walk away from the room. Literally. Movement.
• Cold water on your wrists or face — drops your heart rate fast.
• Don't argue with yourself about whether the anger is "justified." Just wait it out.

AFTER THE WAVE
Now ask: what's underneath? Anger is almost always sitting on top of something else.
• Hurt? ("They didn't even listen.")
• Fear? ("If I don't speak up I'll be taken advantage of.")
• Shame? ("I let them see I cared.")

Naming the underneath is what lets you respond instead of react. The other person hasn't changed — but you have the words now.

DON'T
• Don't suppress it. Bottled anger leaks out as resentment or comes back as anxiety.
• Don't text the person while you're hot. Tomorrow-you will thank you.`,
  },
  {
    id: 'grief',
    title: 'Coping with Grief',
    blurb: "Grief isn't linear. Giving yourself permission to feel.",
    category: 'grief',
    type: 'article',
    readTime: '4 min read',
    content: `There is no right way to grieve, and there is no timeline. The "five stages" everyone talks about were never meant to be sequential — Kübler-Ross herself said that.

What grief actually feels like is waves. Some days you feel okay. Then a song plays, or you reach for the phone to call them, and the floor drops out again. That's not regression. That's grief.

PERMISSION SLIPS
• It's okay to laugh. It doesn't mean you've forgotten.
• It's okay to not cry. Grief doesn't have to look like the movies.
• It's okay to feel relief if their suffering ended, even alongside the sadness.
• It's okay to be angry at them for leaving.

WHAT HELPS
• Keep a small ritual — light a candle, look at one photo, say their name out loud.
• Eat and sleep on a schedule, even when you don't feel like it. Grief is physically depleting.
• Talk about them. People are afraid to bring them up because they don't want to make you sad. Tell people you want to hear their name.

WHEN TO ASK FOR MORE
If after 6+ months you can't function, can't sleep, or feel stuck in a single moment of pain — that's "complicated grief," and grief-specialized therapists can genuinely help.`,
  },
  {
    id: 'boundaries',
    title: 'Building Healthy Relationships',
    blurb: 'Boundaries, expressing needs, and connection without losing yourself.',
    category: 'relationships',
    type: 'article',
    readTime: '5 min read',
    content: `A boundary isn't a wall. It's a doorway with a clear sign on it.

People often confuse boundaries with controlling other people. Real boundaries are about YOU — what you will and won't do, what you can offer, what you need to step away from. You can't make someone behave a certain way. You can decide what you'll do when they don't.

THE SCRIPT
"When _____ happens, I feel _____. What I need is _____."

Example: "When you check your phone while I'm talking, I feel unseen. What I need is for us to put phones away during dinner."

This isn't about blame. It's information they didn't have.

SIGNS YOUR BOUNDARIES ARE TOO POROUS
• You say yes when you mean no, and resent it later.
• You feel responsible for managing other people's emotions.
• You apologize for things that weren't your fault.
• You're exhausted after time with certain people.

SIGNS YOUR WALLS ARE TOO HIGH
• You shut down at the first sign of conflict.
• You assume people will hurt you, so you keep them at arm's length.
• You "ghost" instead of having a hard conversation.

The work is finding the doorway. Open enough for connection. Clear enough to protect what matters.`,
  },
  {
    id: 'sleep',
    title: 'Sleep Hygiene Tips',
    blurb: 'Boring but powerful changes that compound over weeks.',
    category: 'stress',
    type: 'article',
    readTime: '3 min read',
    content: `Sleep affects mood more than almost anything else. Most "I'm depressed" weeks have a sleep-debt week hiding under them.

THE NON-NEGOTIABLES
• Same wake-up time every day, including weekends. Your body schedules everything around it.
• No phone in bed. Not "less phone." None. Charge it across the room.
• Cool, dark, quiet. Below 19°C if you can. Blackout curtains or a sleep mask. Earplugs if needed.

THE BIG LEVERS
• No caffeine after 2pm. Half-life is 6 hours; it's still active at midnight.
• No alcohol within 3 hours of bed. It knocks you out but destroys REM sleep.
• Sunlight in your eyes within 30 minutes of waking. This sets your whole day.

THE NIGHTLY WIND-DOWN
30 minutes before bed: dim lights, no screens, do something boring on purpose. The transition is what your brain needs — going straight from stimulation to sleep is like flooring the brakes at 100km/h.

If you can't fall asleep in 20 minutes, get up. Read something dull in low light. Go back when sleepy. Lying awake trains your brain that bed = anxiety.`,
  },
  {
    id: 'self-compassion',
    title: 'Self-Compassion Practice',
    blurb: 'Treat yourself the way you\'d treat a friend going through the same thing.',
    category: 'depression',
    type: 'exercise',
    readTime: '5 min practice',
    content: `Most of us talk to ourselves in a way we'd never let someone talk to our friend. Self-compassion isn't self-pity, and it isn't letting yourself off the hook. It's the same kindness you naturally give others, turned inward.

THE PRACTICE
1. Bring to mind something you're being hard on yourself about.

2. Notice three things, slowly:
   • "This is a moment of suffering." (Just acknowledging it.)
   • "Suffering is part of being human." (You're not uniquely broken.)
   • "May I be kind to myself right now." (Whatever that means in this moment.)

3. Put a hand on your heart or your cheek. Sounds silly. Works anyway — touch releases oxytocin even when it's your own.

THE LETTER
Write a letter to yourself from the perspective of a friend who deeply loves and accepts you. What would they say about what you're going through? Don't fix anything. Just witness yourself the way they would.

Research shows self-compassion predicts wellbeing better than self-esteem does. You can build it. Like anything else, it gets easier with practice.`,
  },
  {
    id: 'journaling',
    title: 'Journaling for Mental Health',
    blurb: 'Why writing things down works — and the simplest way to start.',
    category: 'stress',
    type: 'article',
    readTime: '3 min read',
    content: `Thoughts in your head loop. Thoughts on paper end. That's the whole magic of journaling.

You don't need a beautiful notebook, a habit tracker, or twenty minutes. Three lines is enough.

THE 3-LINE METHOD
1. What's heavy right now?
2. What's one thing I'm grateful for, however small?
3. What's one thing I'll do today that's just for me?

Do it for a week. Notice what shows up repeatedly. That's the thing worth talking about — in therapy, with a friend, or with Harmony.

WHEN TO WRITE MORE
If something is keeping you up or looping all day, set a timer for 10 minutes and free-write. Don't edit. Don't worry about grammar. Just dump.

When the timer ends, you'll usually notice one of three things:
• The problem was smaller than it felt.
• There's a specific action you've been avoiding.
• You're sad about something you hadn't fully admitted.

All three are useful. None of them happen when the thoughts stay in your head.

This app's Journal tab is built for exactly this — quick, no pressure, just enough structure to make showing up easy.`,
  },
];

const CATEGORY_LABELS: Record<string, { emoji: string; label: string }> = {
  all:            { emoji: '✨', label: 'All' },
  anxiety:        { emoji: '🌊', label: 'Anxiety' },
  depression:     { emoji: '🌧️', label: 'Depression' },
  stress:         { emoji: '🍃', label: 'Stress' },
  anger:          { emoji: '🔥', label: 'Anger' },
  grief:          { emoji: '🕯️', label: 'Grief' },
  relationships:  { emoji: '🤝', label: 'Connection' },
};

export default function ResourcesClient() {
  const [filter, setFilter]               = useState('all');
  const [search, setSearch]               = useState('');
  const [showBreathing, setShowBreathing] = useState(false);
  const [expandedId, setExpandedId]       = useState<string | null>(null);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return RESOURCES.filter((r) => {
      if (filter !== 'all' && r.category !== filter) return false;
      if (!term) return true;
      return (
        r.title.toLowerCase().includes(term) ||
        r.blurb.toLowerCase().includes(term) ||
        r.content.toLowerCase().includes(term)
      );
    });
  }, [filter, search]);

  return (
    <div className="app-shell">
      <Sidebar />
      <main className="resources-main">
        {/* ── Header ──────────────────────────────────────────── */}
        <div className="page-header">
          <div>
            <h1>Resources</h1>
            <p>Practices and reading for whatever you&apos;re carrying today</p>
          </div>
        </div>

      {/* ── "Need help now" quick actions ──────────────────── */}
      <section className="quick-actions">
        <p className="section-eyebrow">If you need something right now</p>
        <div className="quick-grid">
          <button
            className="quick-card quick-card-primary"
            onClick={() => setShowBreathing(true)}
          >
            <Wind size={22} />
            <div>
              <p className="quick-card-title">Breathe</p>
              <p className="quick-card-sub">Box, 4-7-8, or calm breathing</p>
            </div>
          </button>
          <button
            className="quick-card"
            onClick={() => setExpandedId('grounding-54321')}
          >
            <Anchor size={22} />
            <div>
              <p className="quick-card-title">Ground</p>
              <p className="quick-card-sub">5-4-3-2-1 senses technique</p>
            </div>
          </button>
          <a href="tel:9152987821" className="quick-card quick-card-urgent">
            <Phone size={22} />
            <div>
              <p className="quick-card-title">Talk to someone</p>
              <p className="quick-card-sub">iCall: 9152987821</p>
            </div>
          </a>
        </div>
      </section>

      {/* ── Breathing exercise (inline expansion) ──────────── */}
      {showBreathing && (
        <div style={{ marginBottom: '1.5rem' }}>
          <BreathingExercise onClose={() => setShowBreathing(false)} />
        </div>
      )}

      {/* ── Search ─────────────────────────────────────────── */}
      <div className="search-wrap">
        <Search size={15} className="search-icon" />
        <input
          type="text"
          placeholder="Search resources…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="search-input"
        />
      </div>

      {/* ── Category filter ────────────────────────────────── */}
      <div className="category-row">
        {Object.entries(CATEGORY_LABELS).map(([cat, meta]) => (
          <button
            key={cat}
            onClick={() => setFilter(cat)}
            className={`category-pill ${filter === cat ? 'category-pill-active' : ''}`}
          >
            <span>{meta.emoji}</span> {meta.label}
          </button>
        ))}
      </div>

      {/* ── Resource list ──────────────────────────────────── */}
      <p className="section-eyebrow" style={{ marginTop: '1.5rem' }}>
        {filtered.length} {filtered.length === 1 ? 'resource' : 'resources'}
        {filter !== 'all' && <> in <strong>{CATEGORY_LABELS[filter].label.toLowerCase()}</strong></>}
      </p>

      {filtered.length === 0 ? (
        <div className="empty-resource">
          <p>No resources match &quot;{search}&quot;.</p>
          <button onClick={() => { setSearch(''); setFilter('all'); }} className="reset-btn">
            Clear filters
          </button>
        </div>
      ) : (
        <div className="resource-list">
          {filtered.map((r) => {
            const expanded = expandedId === r.id;
            const Icon = r.type === 'exercise' ? Dumbbell : BookOpen;
            return (
              <article
                key={r.id}
                className={`resource-card ${expanded ? 'resource-card-open' : ''}`}
              >
                <button
                  className="resource-head"
                  onClick={() => setExpandedId(expanded ? null : r.id)}
                  aria-expanded={expanded}
                >
                  <div className="resource-head-left">
                    <span className={`resource-icon resource-icon-${r.type}`}>
                      <Icon size={16} />
                    </span>
                    <div style={{ minWidth: 0 }}>
                      <h3>{r.title}</h3>
                      <p className="resource-blurb">{r.blurb}</p>
                      <div className="resource-meta">
                        <span className="resource-tag">{CATEGORY_LABELS[r.category].emoji} {CATEGORY_LABELS[r.category].label}</span>
                        <span className="resource-dot">·</span>
                        <span>{r.readTime}</span>
                      </div>
                    </div>
                  </div>
                  <ChevronDown
                    size={18}
                    className="resource-chevron"
                    style={{ transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)' }}
                  />
                </button>
                {expanded && (
                  <div className="resource-body">
                    {r.content.split('\n').map((line, i) => {
                      const trimmed = line.trim();
                      if (!trimmed) return <div key={i} style={{ height: 8 }} />;
                      // Section headers (ALL CAPS or ending in colon)
                      if (/^[A-Z][A-Z\s'-]{2,}$/.test(trimmed)) {
                        return <h4 key={i} className="resource-h4">{trimmed}</h4>;
                      }
                      if (trimmed.startsWith('•')) {
                        return <p key={i} className="resource-bullet">{trimmed}</p>;
                      }
                      if (/^\d+\.\s/.test(trimmed)) {
                        return <p key={i} className="resource-bullet">{trimmed}</p>;
                      }
                      return <p key={i} className="resource-p">{trimmed}</p>;
                    })}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}

      <p className="footer-note">
        Resources here are educational, not medical advice. If you&apos;re in crisis, call iCall at <a href="tel:9152987821">9152987821</a>.
      </p>

      {/* ── Styles ───────────────────────────────────────── */}
      <ClientStyle>{`
        .resources-main {
          flex: 1;
          min-width: 0;
          overflow-y: auto;
          padding: 2.5rem 2rem 3rem;
        }
        .resources-main > * { max-width: 720px; margin-left: auto; margin-right: auto; }
        .app-shell { display: flex; min-height: 100vh; background: var(--color-bg); }

        .page-header {
          display: flex; align-items: flex-start; justify-content: space-between;
          gap: 1rem; margin-bottom: 1.5rem;
        }
        .page-header h1 {
          font-size: 26px; font-weight: 500; margin: 0 0 4px;
          font-family: var(--font-serif);
        }
        .page-header p {
          font-size: 14px; color: var(--color-muted); margin: 0;
        }
        .back-link {
          display: inline-flex; align-items: center; gap: 4px;
          font-size: 13px; color: var(--color-muted);
          background: none; border: none; cursor: pointer; padding: 6px 10px;
          border-radius: var(--radius-sm);
        }
        .back-link:hover { color: var(--color-text); background: var(--color-surface); }

        .section-eyebrow {
          font-size: 11px;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          color: var(--color-muted);
          font-weight: 600;
          margin: 0 0 0.65rem;
        }

        /* ── Quick actions ── */
        .quick-actions { margin-bottom: 1.5rem; }
        .quick-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
          gap: 10px;
        }
        .quick-card {
          display: flex; align-items: center; gap: 12px;
          padding: 14px 16px;
          background: var(--color-surface);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-lg);
          text-align: left;
          cursor: pointer;
          color: var(--color-text);
          text-decoration: none;
          transition: all 0.15s ease;
        }
        .quick-card:hover {
          transform: translateY(-1px);
          border-color: color-mix(in srgb, var(--color-primary) 35%, var(--color-border));
          background: color-mix(in srgb, var(--color-primary) 5%, var(--color-surface));
        }
        .quick-card-primary {
          background: color-mix(in srgb, var(--color-primary) 10%, var(--color-surface));
          border-color: color-mix(in srgb, var(--color-primary) 30%, var(--color-border));
          color: var(--color-primary);
        }
        .quick-card-urgent {
          background: color-mix(in srgb, #ef4444 8%, var(--color-surface));
          border-color: rgba(239, 68, 68, 0.3);
        }
        .quick-card-urgent:hover {
          background: color-mix(in srgb, #ef4444 14%, var(--color-surface));
          border-color: rgba(239, 68, 68, 0.5);
        }
        .quick-card-title  { font-size: 14px; font-weight: 600; margin: 0; }
        .quick-card-sub    { font-size: 12px; color: var(--color-muted); margin: 2px 0 0; }
        .quick-card-urgent .quick-card-sub { color: rgba(239, 68, 68, 0.85); }

        /* ── Search ── */
        .search-wrap {
          position: relative;
          margin-bottom: 1rem;
        }
        .search-icon {
          position: absolute; left: 14px; top: 50%;
          transform: translateY(-50%);
          color: var(--color-subtle);
          pointer-events: none;
        }
        .search-input {
          width: 100%;
          padding: 11px 14px 11px 38px;
          background: var(--color-surface);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-md);
          color: var(--color-text);
          font-size: 14px;
          font-family: inherit;
          outline: none;
          transition: border-color 0.15s;
        }
        .search-input:focus { border-color: var(--color-primary); }

        /* ── Categories ── */
        .category-row {
          display: flex; flex-wrap: wrap; gap: 6px;
          margin-bottom: 0.5rem;
        }
        .category-pill {
          display: inline-flex; align-items: center; gap: 5px;
          padding: 6px 12px;
          font-size: 12.5px;
          border-radius: 999px;
          border: 1px solid var(--color-border);
          background: transparent;
          color: var(--color-muted);
          cursor: pointer;
          font-family: inherit;
          transition: all 0.15s;
        }
        .category-pill:hover {
          border-color: color-mix(in srgb, var(--color-primary) 30%, var(--color-border));
          color: var(--color-text);
        }
        .category-pill-active {
          background: color-mix(in srgb, var(--color-primary) 14%, transparent);
          border-color: color-mix(in srgb, var(--color-primary) 50%, var(--color-border));
          color: var(--color-primary);
          font-weight: 500;
        }

        /* ── Resource cards ── */
        .resource-list {
          display: flex; flex-direction: column; gap: 8px;
        }
        .resource-card {
          background: var(--color-surface);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-lg);
          overflow: hidden;
          transition: border-color 0.15s, box-shadow 0.15s;
        }
        .resource-card:hover {
          border-color: color-mix(in srgb, var(--color-primary) 30%, var(--color-border));
        }
        .resource-card-open {
          border-color: color-mix(in srgb, var(--color-primary) 35%, var(--color-border));
          box-shadow: 0 2px 8px color-mix(in srgb, var(--color-primary) 8%, transparent);
        }
        .resource-head {
          width: 100%;
          display: flex; align-items: flex-start; justify-content: space-between;
          gap: 12px;
          padding: 16px 18px;
          background: none; border: none; cursor: pointer;
          color: var(--color-text);
          text-align: left;
          font-family: inherit;
        }
        .resource-head-left {
          display: flex; align-items: flex-start; gap: 12px; flex: 1; min-width: 0;
        }
        .resource-icon {
          width: 34px; height: 34px; flex-shrink: 0;
          display: flex; align-items: center; justify-content: center;
          border-radius: var(--radius-md);
        }
        .resource-icon-article {
          background: color-mix(in srgb, var(--color-primary) 12%, transparent);
          color: var(--color-primary);
        }
        .resource-icon-exercise {
          background: color-mix(in srgb, #34d399 12%, transparent);
          color: #34d399;
        }
        .resource-head h3 {
          font-size: 15px; font-weight: 600; margin: 0 0 3px;
          line-height: 1.4;
        }
        .resource-blurb {
          font-size: 13px; color: var(--color-muted);
          margin: 0; line-height: 1.5;
        }
        .resource-meta {
          display: flex; align-items: center; gap: 6px;
          margin-top: 6px;
          font-size: 11.5px; color: var(--color-subtle);
        }
        .resource-tag {
          font-weight: 500;
          color: var(--color-muted);
        }
        .resource-dot { opacity: 0.5; }
        .resource-chevron {
          color: var(--color-muted);
          flex-shrink: 0;
          margin-top: 8px;
          transition: transform 0.2s ease;
        }
        .resource-body {
          padding: 4px 18px 18px;
          border-top: 1px solid var(--color-border);
          padding-top: 14px;
          animation: bodyFade 0.25s ease-out;
        }
        .resource-h4 {
          font-size: 11px; font-weight: 700;
          letter-spacing: 0.08em;
          color: var(--color-muted);
          margin: 1rem 0 0.4rem;
        }
        .resource-h4:first-child { margin-top: 0; }
        .resource-p {
          font-size: 14px;
          line-height: 1.7;
          color: var(--color-text);
          margin: 0 0 0.65em;
        }
        .resource-bullet {
          font-size: 14px;
          line-height: 1.7;
          color: var(--color-text);
          margin: 0 0 0.35em;
          padding-left: 0.5em;
        }

        .empty-resource {
          padding: 2rem 1rem;
          text-align: center;
          color: var(--color-muted);
          font-size: 14px;
          background: var(--color-surface);
          border: 1px dashed var(--color-border);
          border-radius: var(--radius-lg);
        }
        .reset-btn {
          margin-top: 0.75rem;
          font-size: 13px;
          color: var(--color-primary);
          background: none; border: none;
          cursor: pointer;
          text-decoration: underline;
        }

        .footer-note {
          margin-top: 2rem;
          font-size: 11.5px;
          color: var(--color-subtle);
          text-align: center;
          line-height: 1.6;
        }
        .footer-note a { color: var(--color-primary); text-decoration: none; }
        .footer-note a:hover { text-decoration: underline; }

        @keyframes bodyFade {
          from { opacity: 0; transform: translateY(-4px); }
          to   { opacity: 1; transform: translateY(0);    }
        }
        @media (max-width: 540px) {
          .resources-main { padding: 1.25rem 1rem 2rem; }
          .quick-grid { grid-template-columns: 1fr; }
        }
      `}</ClientStyle>
      </main>
    </div>
  );
}
