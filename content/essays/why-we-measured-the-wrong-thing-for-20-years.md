---
title: "Why We Measured the Wrong Thing for 20 Years"
date: 2026-04-12T15:49:53.434Z
image: "/images/1776008992932-og-why-we-measured-the-wrong-thing-for-20-years.png"
---

Everyone's trying to adopt agents. Most are failing. The instinct is to blame the tools, the training, the team's readiness. But the failure is upstream of all of that.

It's the metric.

---

For two decades, we've measured velocity. Story points per sprint. Tickets closed. Output per unit time.

Not because velocity was the right thing to measure. Because it was the only thing we *could* measure.

Think about why velocity exists. A feature ships. Three months later, maybe you learn if it worked. Did users adopt it? Did it move the number? Did it solve the actual problem?

Three months is too long to wait. You can't run a team on a quarterly feedback loop. You need a signal *now* — something you can track weekly, act on immediately, use to steer.

So we invented velocity. A proxy metric. A leading indicator that correlated (we hoped) with eventual outcomes.

It was never the goal. It was the best hack we had given the constraints.

---

Then we forgot it was a hack.

Velocity became the thing. We built sprint rituals around it. Performance reviews. Entire roles exist to measure and optimize it. Teams compete on it. Careers are made on it.

The proxy became reified. We stopped asking what it was *for*.

---

Here's what changed: the constraint that created velocity just disappeared.

You can ship to production in hours now, not months. CI/CD, feature flags, staged rollouts — the infrastructure is solved. And if you can ship in hours, you can *learn* in hours. Instrument it. Watch the behavior. See if it worked.

Time-to-learning used to be measured in quarters. Now it can be measured in days. Sometimes hours.

The latency problem that *created* velocity is gone. But we kept the metric.

---

This is not a small problem. Teams that keep measuring velocity in an agent-accelerated world will optimize for exactly the wrong thing.

They'll ship more tickets faster. Velocity will look great. And they'll still miss outcomes — because nobody's checking if the work *mattered*, only that it *happened*.

I recently heard about an organization that incentivizes engineers on the number of APIs they create each quarter. Think about that for a moment. The metric rewards *more APIs*. Not APIs that get called. Not APIs that solve problems. Just... more of them.

How many APIs could you possibly need? What are you really measuring? You're measuring activity. You could have 200 APIs and zero value. You could have 3 APIs powering the entire business. The metric can't tell the difference.

This is velocity logic taken to its absurd conclusion: the metric incentivizes *more*, but the business needs *better*.

```chart
{
  "type": "line",
  "title": "The disconnect",
  "height": 320,
  "xLabels": ["Sprint 1", "Sprint 2", "Sprint 3", "Sprint 4", "Sprint 5", "Sprint 6", "Sprint 7", "Sprint 8"],
  "datasets": [
    {
      "label": "Velocity (story points)",
      "color": "#534AB7",
      "width": 2.5,
      "data": [24, 28, 31, 36, 42, 45, 48, 52]
    },
    {
      "label": "User adoption (%)",
      "color": "#0F6E56",
      "width": 2.5,
      "dash": [6, 4],
      "data": [12, 12.5, 13, 12.8, 13.2, 13, 13.5, 14]
    }
  ]
}
```

*Velocity doubled. Adoption moved 2 points. The team was rewarded for shipping features nobody used.*

Agents make this worse, not better. Agents can blast through tickets. They're output machines. If your metric is output, agents will help you produce more of what you weren't supposed to be producing in the first place.

The metric becomes the blocker.

---

The shift isn't "adopt agents."

The shift is: stop measuring output, start measuring learning.

Time-to-learning. How long from "we had an idea" to "we know if it works"? That's the metric that matters now. That's the metric that was always supposed to matter. We just couldn't see it fast enough before.

---

Once you change the metric, everything downstream breaks. In a good way.

**Formation has to change.** You can't have handoffs and approval chains when you're measuring time-to-learning. Every handoff is latency. Every approval is delay. The only structure that survives is tight, embedded teams — designer and engineer, in the room with business, building and testing in the same motion. Not because it's philosophically nice. Because it's the only way to hit the number.

**Context has to change.** When the right people are in the room, context actually gets captured. Not as documentation no one reads — as living artifacts that agents can use. Context engineering isn't a discipline you layer on top. It's what becomes possible when formation is right.

**Then — and only then — agents work.** Because they have the context. The humans are structured to supervise them. The metrics reward outcomes instead of output. The system is finally coherent.

---

Everyone wants to start with agents. That's the mistake.

Agents are the last domino, not the first. You can't buy your way into agent adoption. You can't pilot your way there. You have to change the metric, which changes the formation, which changes the context, which makes agents useful.

Tip the first domino. The rest will fall.

Or keep measuring velocity. Keep shipping faster. Keep missing the point.