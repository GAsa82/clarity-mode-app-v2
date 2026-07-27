-- Original starter content for the Research Papers library.
-- Written entirely by Claude (original prose, no copied/scraped text, no
-- fabricated citations or invented credentialed authors) to fill the empty
-- library flagged in CMS_AUDIT_REPORT §16. Attributed honestly as editorial
-- content, not a peer-reviewed paper. Real, honest word counts and page
-- estimates only — no fake ratings/reviews/download counts (none exist on
-- this table; view_count/download_count default to 0, which is correct).
--
-- NOT YET APPLIED — the Supabase MCP connection was unauthorized all session;
-- apply via the SQL editor or once MCP access is restored.
--
-- Categories match CATEGORY_LABELS in src/pages/ResearchPage.tsx exactly:
-- decision_making, focus, mental_clarity, productivity, emotional_regulation,
-- personal_growth.

insert into public.research_papers
  (website_id, title, author, category, abstract, pages, price, visibility, status, tags)
select
  (select id from public.websites where slug = 'clarity-mode'),
  v.title, 'Clarity Mode Editorial', v.category, v.abstract, v.pages, v.price, v.visibility, 'published', v.tags
from (values
  (
    'The Decision Fatigue You Don''t Notice',
    'decision_making',
    'Every choice you make today draws from the same finite mental reserve — what to wear, what to eat, which email to answer first. Psychologists call this ego depletion: the idea that self-control and decision-making pull from a shared, limited resource that depletes with use over the course of a day. You don''t feel it draining in the moment. You feel it as the 4 p.m. slump where a simple choice — where to eat dinner — suddenly feels exhausting, or as the late-evening impulse buy you wouldn''t have made at 9 a.m.

The practical fix isn''t willpower. It''s architecture. Reduce the number of low-stakes decisions competing for the same reserve as your important ones. Wear a version of the same outfit. Decide what you''re eating for lunch the night before. Batch small approvals into one block instead of scattering them across the day. None of this is about discipline — it''s about not spending your best decision-making capacity on questions that don''t deserve it.

The second lever is sequencing: do your hardest, highest-stakes thinking first, while the reserve is full, and push routine or low-risk choices to later in the day when fatigue has already set in and the cost of a slightly worse decision is low. A financial decision made at 9 a.m. and the same decision made at 9 p.m. are not made by the same brain, even though the facts haven''t changed.

None of this eliminates fatigue — it''s a finite resource by design, not a bug to patch. The goal is simply to spend it on purpose instead of by accident.',
    4, 0, 'public',
    ARRAY['decision fatigue','willpower','daily structure']
  ),
  (
    'Why Willpower Isn''t the Point',
    'focus',
    'Most focus advice assumes the problem is motivation — that if you wanted it enough, you''d simply concentrate. In practice, focus fails for a much more mechanical reason: the environment keeps interrupting the state before it can form. Deep, sustained attention takes measurable time to enter — often cited informally as somewhere in the 10–20 minute range — and a single notification, tab switch, or unrelated thought is enough to reset that clock to zero, not just pause it.

This reframes the problem entirely. The goal isn''t to build more willpower to resist distraction in the moment — it''s to remove the trigger before the moment arrives. A phone in another room isn''t a discipline trick; it''s the removal of a decision point that would otherwise cost attention every single time it appears, whether or not you act on it. Seeing a notification and choosing to ignore it still taxes the same attentional system as acting on it.

A useful practical structure: define one visible outcome for the block before starting (a single sentence, not a vague intention), remove every plausible interruption you have control over, and set a fixed time boundary so the brain isn''t negotiating "when do I stop" as a live decision throughout the session. The boundary matters as much as the removal — open-ended focus time tends to dissolve into low-grade multitasking because there''s no clear finish line pulling effort toward it.

Focus, in this frame, isn''t a personality trait some people have and others don''t. It''s closer to a room you can set up correctly or incorrectly — and most focus failures are room failures, not willpower failures.',
    3, 0, 'public',
    ARRAY['deep work','attention','distraction']
  ),
  (
    'The Physiology of Calm: Why Breathing Comes First',
    'mental_clarity',
    'When the mind is racing, most people try to think their way out of it — reasoning with the anxious thought, arguing against it, planning around it. This usually fails, and not because the reasoning is wrong. It fails because a physiologically activated nervous system doesn''t process calm reasoning well; the body has to come down first, or the thinking has nowhere to land.

The most direct lever on that physiology is breath, specifically the length of the exhale relative to the inhale. A longer, slower exhale activates the parasympathetic ("rest and digest") branch of the nervous system, which is the same branch that has to be engaged for genuine calm to take hold — you cannot think your way into parasympathetic activation, but you can breathe your way into it in under a minute. A simple, well-known pattern — inhale for a count of four, hold briefly, exhale for a count of six to eight — biases the ratio toward the exhale and produces a noticeably calmer state within several cycles for most people.

This is worth doing *before* trying to address whatever triggered the racing mind, not instead of it. Trying to solve a problem or reframe a worry while the body is still physiologically activated is like trying to have a calm conversation while shouting — the content might be right, but the delivery system is working against it. Ninety seconds of deliberate breathing first means the actual thinking that follows has a functioning nervous system to work with.

This isn''t a cure for anxiety or a substitute for real support when it''s needed — it''s a reset switch for the specific, common case of a mind that''s racing faster than the moment requires.',
    3, 0, 'public',
    ARRAY['breathing','nervous system','anxiety']
  ),
  (
    'The Habit Loop, Rebuilt',
    'personal_growth',
    'The most cited model of habit formation describes a three-part loop: a cue that triggers the behavior, the routine itself, and a reward that reinforces the loop so it''s more likely to fire again next time the cue appears. Most attempts to build a new habit skip straight to the routine — "I will exercise every morning" — without engineering the cue or the reward, which is why so many of them quietly stop working within a few weeks.

The cue is the most commonly neglected piece. A habit anchored to willpower alone ("I''ll remember to do it") competes with every other demand on your attention that day and reliably loses. A habit anchored to an existing, already-automatic cue — right after you pour your morning coffee, right after you sit down at your desk — borrows the reliability of a behavior you already do without thinking, and attaches the new behavior to it.

The reward matters just as much, and it has to be immediate, not just eventual. "Better health in a year" is a real reward but too distant to reinforce today''s repetition. A small, immediate marker — checking a box, a two-minute note on what you noticed, even just the physical sensation of having done it — gives the loop something to close on today, which is what actually drives repetition tomorrow.

Two smaller structural points compound this: the size of the routine should start deliberately small enough that skipping it feels harder to justify than doing it, and the environment should make the cue and the first step of the routine physically visible — habits that require searching for something to begin are far more fragile than habits where the first step is already in front of you.

None of this requires more motivation. It requires a loop that''s actually built to close.',
    4, 0, 'public',
    ARRAY['habits','behavior change','routine design']
  ),
  (
    'Naming the Feeling: A Practical Look at Affect Labeling',
    'emotional_regulation',
    'There''s a specific, well-documented effect where the simple act of putting a feeling into words — "I''m anxious about this meeting," rather than just feeling the anxiety unnamed — measurably reduces the intensity of the emotional response itself. This is sometimes described informally as "name it to tame it." It isn''t a platitude; it reflects a real interaction between the brain''s emotional-response systems and the regions involved in language and reasoning, where engaging the latter appears to dampen the former.

The mechanism matters for how you apply it. Vague naming ("I feel bad") does less work than specific naming ("I feel dismissed" or "I feel behind"). Specificity forces a small amount of actual processing of the experience rather than a generic acknowledgment of it, and that processing step seems to be where most of the calming effect comes from. This is also why simply distracting yourself from a feeling doesn''t produce the same effect as labeling it — distraction avoids the feeling; labeling metabolizes it.

A second, less intuitive point: labeling the emotion is not the same as agreeing with the thought that produced it. You can accurately label "I feel humiliated" without agreeing that the underlying event was actually humiliating — the labeling is about the internal state, not a verdict on the external situation. Conflating the two is what makes people avoid this practice; they worry that naming a feeling validates an unfair narrative. It doesn''t. It just gives the nervous system something concrete to process instead of an undifferentiated wave to be swept along by.

In practice: when something lands hard, pause and find one specific, accurate word for what you''re feeling before deciding what to do about it. The doing-something-about-it part goes better once the naming part is finished.',
    3, 0, 'premium',
    ARRAY['emotional regulation','affect labeling','self-awareness']
  ),
  (
    'The Two-Minute Rule and the Cost of Starting',
    'productivity',
    'Most procrastination isn''t resistance to the task itself — it''s resistance to the size of the task as your brain currently perceives it. "Write the report" and "write one sentence of the report" are the same eventual destination, but they are not remotely the same request to a brain deciding whether to start right now. The friction lives almost entirely in the starting, not in the doing.

The two-minute framing (often associated with getting-things-done style productivity systems) exploits this directly: shrink the entry point to something so small it''s harder to justify avoiding than doing. Not because two minutes accomplishes much on its own, but because the hardest part of most work is the transition from not-working to working, and once that transition has happened, momentum tends to carry the effort past the artificial two-minute boundary far more often than not.

This only works if the two-minute version is genuinely, honestly tiny — not a two-minute version that''s secretly a trick to guilt yourself into an hour. "Open the document and write a title" is a real two-minute task. "Finish the first section" usually isn''t, no matter how it''s framed, and using it as a fake two-minute task just teaches your brain to distrust the framing next time.

The broader principle underneath this is that motivation reliably follows action more often than it precedes it. Waiting to feel ready before starting is usually waiting for a signal that only shows up after starting has already happened. The two-minute version isn''t a trick to fool yourself — it''s a deliberately small enough action that it doesn''t require the motivation you don''t have yet.',
    3, 0, 'premium',
    ARRAY['procrastination','starting friction','momentum']
  )
) as v(title, category, abstract, pages, price, visibility, tags)
where not exists (
  select 1 from public.research_papers rp
  where rp.title = v.title
    and rp.website_id = (select id from public.websites where slug = 'clarity-mode')
);
