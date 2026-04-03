---
title: "The Agent Hype Is 1999. Build Like It's 2003."
date: 2026-04-03T15:18:16.897Z
image: "/images/1775229496237-og-the-agent-hype-is-1999-build-like-its-2003.png"
---

In 1999, Pets.com raised $82.5 million in an IPO. Nine months later it was gone. The internet was real. The business model wasn't. The mistake wasn't believing in the technology — it was believing the trust and infrastructure would catch up on the schedule the pitch deck required.

I keep thinking about Pets.com when I hear people talk about autonomous AI agents.

Not because agents aren't real. They are. I've been building with them for two years — for enterprises, for logistics platforms, for my own products. They're genuinely transformative. But the mental model driving most of the hype right now is the same category of wrong that took down most of the dot-com era: confusing a correct vision with a present reality.

Here's what I mean.

## The core confusion

When people say "agent," what they picture is automation. Deploy it, walk away, collect the output. Set it and forget it. The dream is a bot that runs your workflows while you sleep — deterministic, reliable, unsupervised.

That's not what agents are.

Automation is deterministic. You encode a process, it runs the process, same output every time. That's the whole value proposition — consistency. Predictability. You trust it to run unsupervised *because it does the same thing every time.*

Agents are probabilistic. They are, at their core, giant probability machines. Every output is a best estimate given context. Two identical inputs can produce meaningfully different outputs. Exceptions aren't handled explicitly — they're guessed at.

That's not a flaw. It's what makes them extraordinary. But it also means the mental model of "automation, but smarter" isn't just wrong — it's the kind of wrong that compounds.

## The math nobody wants to look at

When I was building with Cline and watching the context window fill up, I learned something visceral about how these systems fail. It's not one dramatic crash. It's a thousand small wrong turns, each one looking reasonable in isolation.

```chart
{
  "title": "Process success rate by step count",
  "source": "Compound probability: success rate = reliability ^ steps. Even optimistic assumptions collapse over multi-step processes.",
  "type": "line",
  "height": 260,
  "xLabels": ["0","1","2","3","4","5","6","7","8","9","10","11","12","13","14","15","16","17","18","19","20"],
  "xSuffix": " steps",
  "ySuffix": "%",
  "yMin": 0,
  "yMax": 100,
  "datasets": [
    {
      "label": "99% per-step reliability",
      "color": "#e8e6df",
      "width": 2.5,
      "data": [100,99,98,97,96.1,95.1,94.1,93.2,92.3,91.4,90.4,89.5,88.6,87.8,86.9,86,85.1,84.3,83.5,82.6,81.8]
    },
    {
      "label": "95% per-step reliability",
      "color": "#888780",
      "width": 2.5,
      "data": [100,95,90.3,85.7,81.5,77.4,73.5,69.8,66.3,63,59.9,56.9,54,51.3,48.8,46.3,44,41.8,39.7,37.7,35.8]
    },
    {
      "label": "90% per-step reliability",
      "color": "#c84b2a",
      "width": 2.5,
      "data": [100,90,81,72.9,65.6,59,53.1,47.8,43,38.7,34.9,31.4,28.2,25.4,22.9,20.6,18.5,16.7,15,13.5,12.2]
    }
  ]
}
```

A 20-step agentic process at 95% per-step reliability — optimistic — only succeeds **36% of the time**. Demis Hassabis put it plainly: *"If your AI model has a 1% error rate and you plan over 5,000 steps, that 1% compounds like compound interest."* By the time you notice, the agent has been confidently wrong for a long time.

I watched this in my own work. The model would declare a feature complete. I'd go look at it. Something was subtly off — not broken, just *wrong* — in a way that only became obvious three features later when everything built on top of it stopped making sense. The agent had no idea. It was already on to the next thing.

Only 15% of technology leaders are actually deploying autonomous agents in production. The rest are stuck in pilot mode — running demos that look impressive and never make it past testing. That gap between demo and production isn't a capability problem. It's a reliability problem that the autonomy framing makes impossible to solve.

## The signals that were flashing in 1999

Here's the thing about the dot-com crash: the internet was real. The vision was correct. Amazon, Google, eBay — they're exactly what the boosters said the internet would produce. The mistake wasn't the vision. It was the assumption that trust and infrastructure would follow capability on the venture timeline.

The data on internet trust adoption tells this story clearly.

```chart
{
  "hero":true,
  "title": "The trust arc — % of US adults by category, 1995–2026",
  "source": "Internet: Pew Research Center adoption surveys (1995–2015); US Census Bureau e-commerce data (1999–2014); Pew online banking surveys (2000–2013). AI: Pew ChatGPT usage surveys (2023–2025); Fed Reserve Bank of St. Louis generative AI data (2024–2025).",
  "type": "line",
  "height": 300,
  "xLabels": ["1995","1996","1997","1998","1999","2000","2001","2002","2003","2004","2005","2006","2007","2008","2009","2010","2011","2012","2013","2014","2015","2016","2017","2018","2019","2020","2021","2022","2023","2024","2025","2026"],
  "ySuffix": "%",
  "yMin": 0,
  "yMax": 100,
  "datasets": [
    {
      "label": "Information (internet)",
      "color": "#888780",
      "width": 2.5,
      "data": [14,18,22,31.5,41,46,57,60,63,65.5,68,70.5,73,75,77,79,80,81,85,87,null,null,null,null,null,null,null,null,null,null,null,null]
    },
    {
      "label": "ID & Access (internet)",
      "color": "#1D9E75",
      "width": 2.5,
      "data": [null,null,null,null,null,null,null,null,null,null,5,8,14.5,21,37,46,50,55,57,58,65,null,null,null,null,null,null,null,null,null,null,null]
    },
    {
      "label": "Logistics (internet)",
      "color": "#378ADD",
      "width": 2.5,
      "data": [null,null,null,null,4,6,8.5,11,12.5,14,17,20,22.5,25,27,29,32.5,36,41,46,null,null,null,null,null,null,null,null,null,null,null,null]
    },
    {
      "label": "Finance (internet)",
      "color": "#c84b2a",
      "width": 2.5,
      "data": [null,null,null,null,null,8,11,14,18,22,28,32,34,36,41,46,48,49.5,51,53,null,null,null,null,null,null,null,null,null,null,null,null]
    },
    {
      "label": "Information (AI)",
      "color": "#c0bfba",
      "width": 2,
      "data": [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,5,17,23,34,45]
    },
    {
      "label": "ID & Access (AI)",
      "color": "#7ecfb0",
      "width": 2,
      "data": [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,1,4,9,16,26]
    },
    {
      "label": "Logistics (AI)",
      "color": "#8fc5e8",
      "width": 2,
      "data": [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,0,1,3,7,13]
    },
    {
      "label": "Finance (AI)",
      "color": "#e8a882",
      "width": 2,
      "data": [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,0,0,1,3,6]
    }
  ]
}
```

In 1998, 13% of internet users had ever banked online — not because it didn't work, but because trust doesn't follow capability. It accumulates in stages: information first, then identity, then logistics, then money. By 2013 — *eighteen years* after the web went mainstream — 51% of US adults banked online. That's the full arc. And the technology was ready years before the trust was.

We are at year four of that arc with AI. The information rung is climbing fast — AI chatbot use hit ~45% of US adults in 2026. But ID, logistics, and finance are barely off zero. Autonomous agents require trust rung four. We are at rung one. The companies burning capital on autonomous agent deployments right now are Pets.com. The infrastructure isn't there. The trust isn't there. The timeline the pitch deck requires does not exist.

> The companies that survived the dot-com crash weren't the ones with the boldest vision. They were the ones who built for where trust actually was.

Amazon's stock fell 90% in the crash. It survived because it was building real infrastructure for real customer behavior — not projecting trust that hadn't been earned yet. Pets.com died because its business model assumed a trust level that was years away. The product was fine. The timing was delusional.

## But the shock is what should worry you

Here's the part the dot-com parallel makes genuinely unsettling. Trust gaps don't close gradually. They close suddenly, forced by something external nobody planned for.

E-commerce grew at roughly one percentage point of retail share per year for two decades. Steady. Predictable. And then COVID hit.

```chart
{
  "title": "E-commerce as % of US retail sales — the COVID shock",
  "source": "Source: US Census Bureau Quarterly Retail E-Commerce Sales. IBM US Retail Index (2020) estimated COVID accelerated digital adoption by five years in a single quarter.",
  "type": "bar",
  "height": 240,
  "xLabels": ["2016","2017","2018","2019","2020","2021","2022","2023","2024"],
  "ySuffix": "%",
  "yMin": 0,
  "yMax": 20,
  "datasets": [
    {
      "label": "E-commerce % of retail",
      "color": "#c84b2a",
      "fill": true,
      "data": [8.0,8.9,9.7,11.0,14.3,13.2,14.6,15.4,16.1],
      "colors": ["#c0bfba","#c0bfba","#c0bfba","#c0bfba","#c84b2a","#e8a882","#e8a882","#e8a882","#e8a882"]
    }
  ]
}
```

E-commerce sales jumped 43% in 2020 alone — $244 billion added in a single year. IBM estimated the pandemic accelerated digital adoption by five years. Not because the technology improved. Because an external shock removed the alternative.

Something will do this to AI. A competitive shock. A labor event. Something nobody sees coming. And when the trust gap closes suddenly, every organization that designed their workflows around the autonomy model — unsupervised, no checkpoints, probabilistic systems treated as deterministic ones — is going to face cascading failures at a scale they weren't built to handle. The dot-com survivors had infrastructure. The ones who didn't were already gone.

## What the survivors did differently

The question everyone is asking is: *how do we make agents more autonomous?* Wrong question.

The right question is: **how do we make humans radically more productive with agents in the loop?**

I learned this building Protogen. The breakthrough wasn't removing humans from the process. It was getting the right humans closer to the material, faster. The agent handles speed and volume. The human handles judgment and consequence. The loop stays tight. You never let the model run far enough ahead that catching an error means unwinding a cascade.

In my own workflow, the things that actually matter — intent, context, craft, speed of evaluation, taste — none of them come from the agent. They all come from the human directing it. The agent is the engine. The human is the driver. You don't remove the driver because the engine got more powerful.

The dot-com survivors built for where users actually were, not where the pitch deck said they'd be. Amazon built fulfillment infrastructure. Google built search that worked. They didn't wait for users to trust the internet with their money before they had a working business. They built real value at the rung where trust already existed, and grew with the arc.

That's the play. Build real productivity at rung one and two. Design your checkpoints. Measure human output, not agent autonomy. Get your infrastructure right before the shock arrives — because when it does, you won't have time to build it.

---

Two years ago I thought agents were automation — smarter, faster, but fundamentally the same category of tool. I was wrong about that.

What they actually are is something we don't have a clean mental model for yet — probabilistic collaborators that need a human close enough to catch what they miss. Not as a workaround. As the design.

The dot-com crash didn't happen because the internet wasn't real. It happened because people mistook a correct vision for a present reality and built businesses that depended on trust that hadn't been earned.

The agent correction will happen for exactly the same reason.

The question is whether you're building for the crash, or building through it.