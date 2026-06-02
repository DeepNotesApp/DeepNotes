> **⚠️ Past Snapshot — Jun 2026**
>
> This document captures a moment-in-time snapshot of product feedback from the greenfield project's early stable state. It is **not actively maintained**; the engineering roadmap derived from it lives in [`UI_POLISH_PLAN.md`](./UI_POLISH_PLAN.md), which translates these observations into concrete tasks with file references, legacy comparisons, and implementation priorities.
>
> If you are looking for the current plan or progress tracker, see:
> - [`UI_POLISH_PLAN.md`](./UI_POLISH_PLAN.md) — Legacy vs new comparison & roadmap
> - [`UI_POLISH_PROGRESS.md`](./UI_POLISH_PROGRESS.md) — Execution tracker

---

We kind of reached a somewhat stable state in the greenfield project. But there are still lots of problems. Here I'll put everything I notice.

In the marketing app. I kind of like the homepage.
I don't like the pricing page. The plan cards are too big. When Yearly is activated, the toggle is shifted to the left by the "Save 20%" badge.
The whitepaper page is good, but I'd like the scroll to determine the highlighted item in the index. The same should happen in the Privacy Policy and in the Terms of Service pages.
One thing I don't like: when you navigate, the scroll isn't reset to the top of the page. For example, when you go from the homepage to the Privacy Policy page. Basically from any marketing page to any other marketing page.

In the web app. I kind of like the header, but I don't like the Note, Arrow, Zoom, Pages, Groups, Notifications, and Account buttons. I think it should have only these: Notifications (icon button), theme toggle, profile menu with things inside like Settings and Logout.

On the left sidebar. I don't like the "Server collab" panel. I think we should try to do similar to legacy, but with each section as a separate tab. Each tab button has an icon only.
On the main section. This is the most problematic part of the app. The main toolbar is missing completely. There are too many buttons on the right side. The notes are very broken. Very few things work. For example: I can't resize a note vertically at all, double-clicking on a note creates another note instead of entering edit mode for the note, the resize handles are always visible, innummerous problems. My suggestion here is to keep everything in this section in terms of UI as close as possible to legacy, but with support for light and dark themes. We can try later to improve the UI.
On the right sidebar. It is very ugly. My suggestion here is to also copy as much as possible from legacy, but using Shadcn instead of Quasar components. It also has some problems, like, there's no option to create a new page, which is a central part of the app.

The account page is also incredibly ugly. Although, legacy is ugly too. Make it prettier.