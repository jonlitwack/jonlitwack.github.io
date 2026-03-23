---
title: "Context Engineering"
date: 2026-03-22T00:00:00.000Z
image: "/images/1774239025225-context-engineering.png"
---

A few months ago I was building a client demo with Claude Code — a working prototype of a dashboard for their internal operations team. The first pass was fine. Functional. Generic. It looked like every other dashboard I'd ever seen.

So I fed the agent their brand guidelines. Then their Figma files. Then the Jira tickets describing what their ops team actually needed. Then the user research interviews I'd pulled from their last discovery sprint. Same prompt. Same model. Radically different output. The thing it built the second time wasn't just better-looking — it understood what it was building and why.

That gap between the first pass and the second is the entire game right now. And the thing that closed the gap wasn't a better prompt. It was better context.

There's a phrase I keep using in conversations with product teams: context engineering. It's not a formal discipline yet — nobody has a certification in it — but it's becoming the single most important skill in AI-powered development. And almost nobody is talking about it clearly.

Here's the basic insight. When you ask an AI agent to build something, the output is only as good as the context the agent has access to. Give it a vague prompt, get a vague result. Give it your Figma files, your Jira backlog, your architecture diagrams, your brand guidelines, and your user research — and you get something that actually understands what it's building and why.

This sounds obvious. It isn't. Because most teams are still treating AI like a faster version of their existing workflow. They type a prompt. They get output. They iterate through conversation. They're using the most powerful tools ever built for software development the same way they'd use autocomplete.

Context engineering is the practice of deliberately structuring and feeding information to AI systems so they can do their best work. It's the difference between "build me a dashboard" and giving the agent access to your design system, your data schema, your user personas, your performance requirements, and your last three sprint retros. Same tool. Radically different output.

The reason this matters now is MCP — Model Context Protocol. I've started calling it the USB-C of AI, because that's essentially what it is: a universal standard for connecting AI models to external tools and data sources. Before MCP, getting context into an AI agent was manual. You'd copy-paste, you'd upload files, you'd describe things in prose. It worked, but it was like plugging every device into your computer with a different proprietary cable.

MCP changes that. It lets an AI agent pull from your Figma files directly. Read your Jira tickets. Query your database. Access your documentation. The context isn't something you manually prepare — it's something the agent accesses natively, in real time, as part of its workflow. And MCP became the fastest-adopted standard I've ever seen. Within months of its release, every major tool had an integration. That speed tells you something about how badly the ecosystem needed a universal context layer.

But here's the part that doesn't get enough attention: having access to context and knowing which context matters are two different problems. The first is a technical problem — MCP largely solves it. The second is a craft problem. It requires judgment.

When I'm working with Claude Code on a complex build, I spend as much time thinking about context as I do about the thing I'm building. Which files does the agent need to see? What's the right level of architectural guidance versus letting the agent make its own decisions? When do I give it the full picture and when do I constrain its scope? I've learned the hard way that dumping everything into the context window is almost as bad as giving it nothing — the agent gets overwhelmed, starts making weird connections, loses the thread. There's an art to knowing what to include and what to leave out.

These are editorial decisions. They're the same kind of judgment calls that a good creative director makes — not doing the work, but shaping the conditions under which the work happens.

This is why context engineering is a design skill, not just a technical skill. It's about understanding what the agent needs to know, in what order, at what level of detail, to produce work that's actually good. And "good" here doesn't mean "technically correct." It means coherent, intentional, aligned with the larger vision. The same skills that make someone a great design leader — the ability to set direction, to provide the right constraints, to know when to be specific and when to be open-ended — are exactly the skills that make someone great at context engineering.

The teams that are getting the most out of AI right now aren't the ones with the best prompts. They're the ones with the best context architectures. They've thought about what information lives where, how it connects, and how to make it available to AI agents at the moment of need. They've turned context from an afterthought into infrastructure.

If your AI output feels generic, the problem probably isn't the model. It's the context. And the fix isn't a better prompt — it's a better understanding of what the agent needs to know to do work that actually matters.