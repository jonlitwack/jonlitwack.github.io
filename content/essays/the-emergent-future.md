---
title: "The Emergent Future of Product Development"
date: 2025-04-24T00:00:00.000Z
---

I've been on an adventure.

I wrote this as a result of six months of equal parts successes and failures with what people now call vibe coding — a term that wouldn't come into existence until three-quarters of the way through this story. My goal is to break down the evolution of this new development process into the atomic ingredients that make it work.

Two years ago, if you asked me what I thought of AI, I'd tell you it's what VR was in the 90s. Sounds really cool, and I'm glad ChatGPT is fun, but I just didn't see the broader application beyond content generation. For product development in particular, I could see the benefits, but only in the ways AI would make things "better." Not different. Sure, I could create the things I've always created faster than before, but I was still fundamentally doing the same job.

In May 2024, that all changed.

I fell in love with Claude. Specifically Sonnet 3.5 — the very first model that could write elegant code and reason with a full codebase without completely crapping its pants. I was struggling with how to build an app, so I decided to ask Sonnet for advice. But it did me one better. It just went ahead and built the damn thing for me.

This was a game changer. I went from taking months or years focusing on just one idea to doing it in minutes or days. By June, I was staying up until ungodly hours of the night building little apps — video transcription scripts, data visualizations, purpose-built content generators. All running on my machine, costing me nothing, violating no InfoSec policies. The world felt like it did in the early 2000s when tech was simpler. My lack of understanding of AWS, or the latest CI/CD pipelines — little of that mattered anymore. With this new partnership, I had access to knowledge of these things in my back pocket. As long as I was curious enough and tenacious enough, I could build almost anything.

With new tools came new challenges. I challenged myself to build something bigger — something I'd normally need a full team for. And of course, it was harder. I was literally copying and pasting code from the Claude Desktop app into VS Code. The initial app that Claude would build would usually break with just one or two new asks. My productivity with the AI component dropped to about 50% useful. Errors piled up. I found myself asking the same question over and over: "Why isn't this working?" This got tedious.

Not only was this not fun anymore — this approach wasn't scalable into real products.

Enter the integrated AI editor. Cursor, Cline, Windsurf — which one do I pick? In July 2024, I'm talking to a former coworker who's gone to a small boutique shop. I ask if it's any different there, and immediately he says: "Oh yeah — we're using AI for everything. Have you checked out Cursor?"

Within the first few hours, Cursor fixed most of the issues with my last app. Within the first few days, I hated Cursor. I started swearing at it. It was creating workaround code and bloating the codebase with unnecessary junk. But it showed promise. Maybe if I knew what was going on under the covers, I could improve it.

After some Reddit lurking, the tool of choice for the emerging underground of AI coding folk was Cline. Like all great open source tools, it offered a "you get what you put into it" experience. And what I loved immediately was the transparency — a clear view into what's going on with the model. Tokens going up and down. Cache usage. And critically, the context window.

The context window was the game changer. I like to think of it as "thinking capacity." Get too close to the limit and the model runs out of room to think. It does stupid stuff — deleting code, writing unnecessary junk. Just like Cursor was doing. This transparency into how the data moved opened my brain up to what was really happening. Or more concretely — WHY Cursor, Claude, and every other tool would eventually choke and spit out garbage.

But understanding the problem didn't solve it. If you're building anything beyond a simple to-do list, you're going to need more than one context window. Starting a new chat means starting from scratch — all that context from the previous chat, gone. And models don't tell you "Wait, I have no idea what you're talking about." They happily generate more code and tell you the task is complete.

So I went back to Reddit and found a concept catching on: memory banks. A place to bank the memory of previous chats. The most popular approach looked something like this — create four files in your codebase that keep an ongoing reference to project context: a project roadmap, current task, tech stack, and codebase summary. Give your AI editor instructions to read these documents before generating code, and to update them after completing a task. A full loop — I could use Claude Desktop to talk through the product idea and generate these documents, then hand them off to the editor.

Which brings me to the most recent chapter.

It's February 2025 and despite fewer hallucinations, the work starts to feel tedious again. I'd become a slave to the AI machine — just there to copy and paste errors out of my terminal and dump them into the chat. It got to the point where Cline was the plant in Little Shop of Horrors yelling "FEED ME SEYMOUR!"

Then I found MCP. Model Context Protocol. The USB-C of AI.

MCP is basically like adding plugins to a model — and I want to pause here to pronounce the magnitude of this. Anthropic and OpenAI are effectively the Coke and Pepsi of AI, and OpenAI adopted MCP as a protocol just weeks after its announcement. This was the fastest standard creation I know of in history. Imagine if Sony, who created Betamax, looked at what JVC was doing with VHS and just said: "Nope. You have it. We're not gonna bother. Well done."

In just a few months, there are hundreds — maybe thousands — of MCP servers you can use like lego bricks to fully automate your product development lifecycle. Designers can use the Figma MCP server to read their design work and generate production-grade frontend components. Product owners can use the Jira MCP server to automate work distribution and analysis. Engineers can use the Playwright MCP server to run user testing before the AI erroneously declares a feature complete.

All the baton tosses and gaps between bits of context we've held in our own heads as unique capabilities or disciplines can now be mashed together into powerful prompts and outputs. If I already have a Figma file, a backlog in Jira, and an architecture diagram in LucidCharts, I can feed that all as context into an LLM and have it spit out what I want.

This brings me to what's actually changing about product development — and why I think we're on the verge of something that makes Agile obsolete.

Let me be careful here, because "Agile is dead" is a tired take and that's not what this is. Agile was the right answer to a real problem. It introduced feedback loops, iteration, collaboration. It made software better. But Agile was designed for a world where the bottleneck was implementation — where writing code was slow and expensive. Sprints, story points, velocity — all of it is machinery for managing a scarce resource: engineering time. What happens when that resource isn't scarce anymore?

Here's the contrast. In June 2024, a client had an idea and wanted to know if it was worth pursuing. That meant initial market sizing and persona definition, wireframing, architectural assumptions, prototyping, and presenting to stakeholders. Total timeline: 4–12 weeks.

Yesterday, a client asked me to help them pitch a concept. I asked them to recite the idea out loud while I recorded them. I looked for some UI concepts that mapped to the idea. Uploaded the recording and the UI concepts into Cline. Guided the development. Deployed a working demo so they could show it off internally. Total timeline: 10 minutes to 2 weeks.

The biggest change between these timelines is that I'm moving the initial research we'd typically perform from the beginning to well after this process. Those were ingredients we needed to get right BEFORE we got funding for a PoC, which could cost thousands to hundreds of thousands of dollars. Today, I can generate a PoC for nearly nothing. Which means I can skip the last few bits of the traditional process and THEN get funding for the actual build.

Here's what I've seen emerge as the atomic ingredients of this new process.

The first is intent. You have to know what you're trying to build and why. This sounds trivial but it's the hardest part, because the safety net of a two-week sprint — where you could figure it out as you went — is gone. When you can build anything in minutes, the question "what should we build?" becomes urgent in a way it never was before.

The second is context. The quality of what the agent produces is directly proportional to the context you give it. Design files, architecture decisions, user research, business constraints — all of it needs to be accessible to the agent, ideally through MCP rather than manual copy-paste. Context engineering is becoming a discipline in its own right.

The third is craft. The agent writes code, but someone still needs to know whether the code is good. Not just "does it work" but "is this the right architecture? Will this scale? Does this feel right?" That judgment doesn't come from the agent. It comes from the people directing it.

The fourth is speed of evaluation. When you can produce working software in minutes, the bottleneck shifts to how fast you can evaluate it. Can you look at the thing, understand what's working and what isn't, and articulate the next iteration? This is closer to editorial judgment than engineering skill. The people who are best at it tend to be the ones with the broadest understanding of the problem — not necessarily the deepest technical knowledge.

The fifth is taste. I keep coming back to this word because nothing else captures it. When the cost of building drops to near zero, the differentiator is what you choose to build. What separates great work from mediocre work is the same thing it's always been — someone with a strong point of view about what the thing should be.

The coolest part of all this? We're on the cusp of a massive SDLC evolution. In Waterfall, a BA and a Designer would work together to come up with the product, then bring in a Developer — but the Developer wasn't included in concept development. In Agile, everyone's included, but the opposite happens: user stories become the basis for the product and we lose sight of the overall vision.

Whatever this is — it represents the ability for the whole team to work directly on the product. A scrum master can be IN the code rather than ask a developer how they're doing. A designer can be IN the code — creating feature branches and having lead devs run PRs. And yes, a lot of developers are uncomfortable with this. They're right to be. There's risk without the right guardrails and training. But there was risk in all the previous forms of software development too.

Those of us that figure this out fastest, and move from anxiety to creativity, will be the winners in this new race.