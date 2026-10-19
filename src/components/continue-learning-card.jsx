"use client";;
/**
 * Continue Learning Card
 *
 * The "pick up where you left off" card a course platform shows on its
 * dashboard. It leads with the lesson's 16:9 thumbnail: a play button, the
 * watched part as a thin chaptered bar along the bottom edge (in orange, like
 * the course progress below) and the time left. Moving the pointer across the thumbnail scrubs it like a video
 * storyboard: a playhead and a time tooltip follow the pointer and the frame
 * redraws for that moment (the demo frames are drawn locally in SVG: a title
 * slide, a duration chart, an easing curve with a ball riding it, and a code
 * slide). Clicking resumes from that time. With the keyboard, the arrow keys
 * pick a time and Enter resumes. Below sit the course, the overall progress
 * with module ticks, and the next lessons as quiet rows. Pass `thumbnail` to
 * use an image instead of the drawn frames.
 */

import { Play } from "lucide-react";
import Image from "next/image";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";

const KEY_STEP = 10;
const KEY_STEP_LARGE = 60;
const RESUMING_MS = 1400;

const DEFAULT_COURSE = {
  title: "Interface Motion Fundamentals",
  instructor: {
    name: "Mara Okafor",
    avatar:
      "https://api.dicebear.com/9.x/notionists/png?seed=Mara&size=96&backgroundColor=ffdfbf,ffd5dc,d1d4f9,c0aede",
  },
  currentLessonId: "l7",
  watchedSeconds: 564,
  chapters: [
    { start: 0, title: "Introduction" },
    { start: 140, title: "The 300ms rule" },
    { start: 430, title: "Curves compared" },
    { start: 730, title: "Putting it in code" },
  ],
  modules: [
    {
      id: "m1",
      title: "Foundations",
      lessons: [
        { id: "l1", title: "Why motion matters", minutes: 9 },
        { id: "l2", title: "The anatomy of a transition", minutes: 12 },
        { id: "l3", title: "Transform and opacity", minutes: 10 },
        { id: "l4", title: "Reading the frame budget", minutes: 11 },
      ],
    },
    {
      id: "m2",
      title: "Easing and timing",
      lessons: [
        { id: "l5", title: "Ease-out by default", minutes: 9 },
        { id: "l6", title: "Custom cubic-bezier curves", minutes: 13 },
        { id: "l7", title: "Choosing a duration", minutes: 16 },
        { id: "l8", title: "Interruptible transitions", minutes: 9 },
        { id: "l9", title: "Stagger without the wait", minutes: 8 },
      ],
    },
    {
      id: "m3",
      title: "Gestures",
      lessons: [
        { id: "l10", title: "Drag and momentum", minutes: 12 },
        { id: "l11", title: "Velocity-based dismissal", minutes: 11 },
        { id: "l12", title: "Rubber banding", minutes: 7 },
        { id: "l13", title: "Springs or curves", minutes: 10 },
        { id: "l14", title: "Accessible gestures", minutes: 9 },
      ],
    },
    {
      id: "m4",
      title: "Shipping motion",
      lessons: [
        { id: "l15", title: "Respecting reduced motion", minutes: 8 },
        { id: "l16", title: "Measuring jank", minutes: 9 },
        { id: "l17", title: "The animation review", minutes: 6 },
        { id: "l18", title: "Final project", minutes: 12 },
      ],
    },
  ],
};

/* --------------------------------- Helpers -------------------------------- */

const clamp = (value, min, max) =>
  Math.min(max, Math.max(min, value));

const formatClock = (seconds) => {
  const total = Math.max(0, Math.round(seconds));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
};

const initialsOf = (name) =>
  name
    .split(" ")
    .map((part) => part[0] ?? "")
    .join("")
    .slice(0, 2)
    .toUpperCase();

const flatten = course => course.modules
  .flatMap((module, moduleIndex) =>
    module.lessons.map((lesson) => ({ ...lesson, moduleIndex, index: 0 }))
  )
  .map((lesson, index) => ({ ...lesson, index }));

const chapterIndexAt = (chapters, seconds) => {
  let found = 0;
  for (const [i, chapter] of chapters.entries()) {
    if (seconds >= chapter.start) {
      found = i;
    }
  }
  return found;
};

/** Share of the course's minutes watched, as a whole percentage. */
const coursePercent = (
  lessons,
  currentIndex,
  watchedSeconds
) => {
  let total = 0;
  let watched = watchedSeconds / 60;
  for (const lesson of lessons) {
    total += lesson.minutes;
    if (lesson.index < currentIndex) {
      watched += lesson.minutes;
    }
  }
  return total > 0 ? Math.round((watched / total) * 100) : 0;
};

/** Point on the cubic-bezier(0.23, 1, 0.32, 1) curve at parameter s. */
const easeOutPoint = (s) => {
  const u = 1 - s;
  const b1 = 3 * u * u * s;
  const b2 = 3 * u * s * s;
  const b3 = s * s * s;
  return { x: b1 * 0.23 + b2 * 0.32 + b3, y: b1 + b2 + b3 };
};

/* ------------------------------ Drawn frames ------------------------------ */

const FRAME_W = 320;
const FRAME_H = 180;
const DURATIONS = [
  { label: "Tooltip", ms: 150 },
  { label: "Dropdown", ms: 200 },
  { label: "Modal", ms: 300 },
  { label: "Drawer", ms: 450 }
];
const CODE_LINES = [
  ".sheet {",
  "  transform: translateY(100%);",
  "  transition: transform 240ms",
  "    cubic-bezier(0.23, 1, 0.32, 1);",
  "}"
];

function FrameHeader({
  label
}) {
  return (
    <g>
      <text
        className="fill-neutral-500"
        fontSize="8"
        fontWeight="500"
        x="18"
        y="22"
      >
        {label}
      </text>
      <text
        className="fill-neutral-400 dark:fill-neutral-600"
        fontSize="8"
        textAnchor="end"
        x="302"
        y="22"
      >
        07
      </text>
    </g>
  );
}

function TitleFrame({
  t
}) {
  return (
    <g>
      <FrameHeader label="Interface Motion Fundamentals" />
      <text className="fill-neutral-500" fontSize="9" x="18" y="80">
        Lesson 7
      </text>
      <text
        className="fill-neutral-900 dark:fill-neutral-100"
        fontSize="21"
        fontWeight="600"
        letterSpacing="-0.4"
        x="18"
        y="106"
      >
        Choosing a duration
      </text>
      <rect
        className="fill-neutral-200 dark:fill-white/[0.1]"
        height="1.5"
        rx="0.75"
        width="120"
        x="18"
        y="120"
      />
      <rect
        className="fill-neutral-700 dark:fill-neutral-300"
        height="1.5"
        rx="0.75"
        width={Math.max(2, 120 * t)}
        x="18"
        y="120"
      />
    </g>
  );
}

function DurationFrame({
  t
}) {
  const active = Math.min(
    DURATIONS.length - 1,
    Math.floor(t * DURATIONS.length)
  );
  const scale = 0.4;
  return (
    <g>
      <FrameHeader label="The 300ms rule" />
      {DURATIONS.map((item, i) => {
        const y = 48 + i * 26;
        const on = i === active;
        return (
          <g key={item.label}>
            <text
              className={
                on
                  ? "fill-neutral-900 dark:fill-neutral-100"
                  : "fill-neutral-500"
              }
              fontSize="9"
              x="18"
              y={y + 8}
            >
              {item.label}
            </text>
            <rect
              className="fill-neutral-200 dark:fill-white/[0.1]"
              height="10"
              rx="3"
              width={FRAME_W - 36 - 64}
              x="70"
              y={y}
            />
            <rect
              className={
                on
                  ? "fill-neutral-900 dark:fill-neutral-100"
                  : "fill-neutral-300 dark:fill-neutral-600"
              }
              height="10"
              rx="3"
              width={item.ms * scale}
              x="70"
              y={y}
            />
            <text
              className={
                on
                  ? "fill-neutral-700 dark:fill-neutral-300"
                  : "fill-neutral-400 dark:fill-neutral-600"
              }
              fontSize="8"
              x={76 + item.ms * scale}
              y={y + 8}
            >
              {item.ms}ms
            </text>
          </g>
        );
      })}
      <line
        className="stroke-neutral-400 dark:stroke-neutral-500"
        strokeDasharray="2 3"
        x1={70 + 300 * scale}
        x2={70 + 300 * scale}
        y1="40"
        y2="152"
      />
    </g>
  );
}

const CURVE_PATH = (() => {
  const pts = [];
  for (let i = 0; i <= 40; i++) {
    const p = easeOutPoint(i / 40);
    pts.push(`${(40 + p.x * 150).toFixed(1)},${(150 - p.y * 110).toFixed(1)}`);
  }
  return `M${pts.join(" L")}`;
})();

function CurveFrame({
  t
}) {
  const p = easeOutPoint(t);
  const bx = 40 + p.x * 150;
  const by = 150 - p.y * 110;
  return (
    <g>
      <FrameHeader label="Curves compared" />
      {/* Axes */}
      <path
        className="stroke-neutral-400 dark:stroke-neutral-700"
        d="M40 36 V150 H190"
        fill="none"
      />
      <line
        className="stroke-neutral-300 dark:stroke-white/[0.1]"
        strokeDasharray="2 3"
        x1="40"
        x2="190"
        y1="150"
        y2="40"
      />
      <path
        className="stroke-neutral-800 dark:stroke-neutral-300"
        d={CURVE_PATH}
        fill="none"
        strokeWidth="1.5"
      />
      <line
        className="stroke-neutral-400 dark:stroke-neutral-600"
        strokeDasharray="2 2"
        x1={bx}
        x2={bx}
        y1={by}
        y2="150"
      />
      <line
        className="stroke-neutral-400 dark:stroke-neutral-600"
        strokeDasharray="2 2"
        x1="40"
        x2={bx}
        y1={by}
        y2={by}
      />
      <circle
        className="fill-neutral-900 dark:fill-neutral-50"
        cx={bx}
        cy={by}
        r="4"
      />
      {/* The same easing applied to a moving box */}
      <text className="fill-neutral-500" fontSize="8" x="214" y="58">
        transform
      </text>
      <rect
        className="fill-neutral-200 dark:fill-white/[0.1]"
        height="2"
        rx="1"
        width="78"
        x="214"
        y="73"
      />
      <rect
        className="fill-neutral-900 dark:fill-neutral-100"
        height="14"
        rx="3.5"
        width="14"
        x={214 + p.y * 64}
        y="67"
      />
      <text className="fill-neutral-500" fontSize="8" x="214" y="102">
        progress
      </text>
      <text
        className="fill-neutral-900 dark:fill-neutral-100"
        fontSize="15"
        fontWeight="600"
        x="214"
        y="122"
      >
        {Math.round(p.y * 100)}%
      </text>
      <text
        className="fill-neutral-400 dark:fill-neutral-600"
        fontSize="8"
        x="214"
        y="136"
      >
        at {Math.round(p.x * 240)}ms
      </text>
    </g>
  );
}

function CodeFrame({
  t
}) {
  const active = Math.min(
    CODE_LINES.length - 1,
    Math.floor(t * CODE_LINES.length)
  );
  return (
    <g>
      <FrameHeader label="Putting it in code" />
      <rect
        className="fill-neutral-200/70 dark:fill-white/[0.06]"
        height="104"
        rx="6"
        width="284"
        x="18"
        y="42"
      />
      <rect
        className="fill-neutral-300/70 dark:fill-white/[0.1]"
        height="16"
        width="284"
        x="18"
        y={52 + active * 17}
      />
      {CODE_LINES.map((line, i) => (
        <g key={line}>
          <text
            className="fill-neutral-400 dark:fill-neutral-600"
            fontFamily="ui-monospace, monospace"
            fontSize="8"
            x="28"
            y={63 + i * 17}
          >
            {i + 1}
          </text>
          <text
            className={
              i === active
                ? "fill-neutral-900 dark:fill-neutral-50"
                : "fill-neutral-500 dark:fill-neutral-400"
            }
            fontFamily="ui-monospace, monospace"
            fontSize="9"
            x="44"
            xmlSpace="preserve"
            y={63 + i * 17}
          >
            {line}
          </text>
        </g>
      ))}
    </g>
  );
}

const FRAMES = [TitleFrame, DurationFrame, CurveFrame, CodeFrame];

function LessonFrame({
  chapter,
  t
}) {
  const Frame = FRAMES[chapter % FRAMES.length] ?? TitleFrame;
  return (
    <svg
      aria-hidden="true"
      className="absolute inset-0 h-full w-full"
      fontFamily="inherit"
      viewBox={`0 0 ${FRAME_W} ${FRAME_H}`}
    >
      <title>Lesson frame</title>
      <Frame t={clamp(t, 0, 1)} />
    </svg>
  );
}

/* --------------------------------- Pieces --------------------------------- */

/** Fades in once loaded; until then (or if it fails) the initials show. */
function Avatar({
  name,
  src
}) {
  const [loaded, setLoaded] = useState(false);
  return (
    <span className="relative flex h-4 w-4 shrink-0 items-center justify-center overflow-hidden rounded-full bg-neutral-100 font-medium text-[8px] text-neutral-500 ring-1 ring-neutral-200 dark:bg-white/[0.06] dark:text-neutral-400 dark:ring-white/[0.08]">
      {initialsOf(name)}
      {src ? (
        <Image
          alt=""
          className={cn(
            "object-cover text-transparent transition-opacity duration-300 ease-out motion-reduce:transition-none",
            loaded ? "opacity-100" : "opacity-0"
          )}
          fill
          // Next calls onLoad for any complete image, broken ones too.
          onLoad={(event) => setLoaded(event.currentTarget.naturalWidth > 0)}
          sizes="16px"
          src={src}
          unoptimized
        />
      ) : null}
    </span>
  );
}

/** Course progress: one segment per module, filled by lessons finished. */
function ModuleProgress({
  modules,
  doneCount
}) {
  let before = 0;
  return (
    <div aria-hidden="true" className="flex gap-[3px]">
      {modules.map((module) => {
        const count = module.lessons.length;
        const fill = clamp((doneCount - before) / Math.max(1, count), 0, 1);
        before += count;
        return (
          <span
            className="relative h-1 overflow-hidden rounded-full bg-neutral-200 dark:bg-white/[0.1]"
            key={module.id}
            style={{ flexGrow: count, flexBasis: 0 }}
          >
            <span
              className="absolute inset-y-0 left-0 rounded-full bg-orange-600 dark:bg-orange-400"
              style={{ width: `${fill * 100}%` }}
            />
          </span>
        );
      })}
    </div>
  );
}

/* ---------------------------------- Card ---------------------------------- */

export default function ContinueLearningCard({
  course = DEFAULT_COURSE,
  onResume,
  onSelectLesson,
  upNextCount = 3,
  className
}) {
  const id = useId();
  const lessons = useMemo(() => flatten(course), [course]);
  const currentIndex = Math.max(
    0,
    lessons.findIndex((lesson) => lesson.id === course.currentLessonId)
  );
  const lesson = lessons[currentIndex];
  const duration = Math.max(1, (lesson?.minutes ?? 1) * 60);
  const watched = clamp(course.watchedSeconds, 0, duration);
  const chapters = useMemo(
    () =>
      course.chapters && course.chapters.length > 0
        ? course.chapters
        : [{ start: 0, title: lesson?.title ?? "" }],
    [course.chapters, lesson?.title]
  );

  /** The time being previewed, or null when the thumbnail rests on `watched` */
  const [preview, setPreview] = useState(null);
  const [resumingAt, setResumingAt] = useState(null);
  const [announcement, setAnnouncement] = useState("");
  const surfaceRef = useRef(null);
  const barRef = useRef(null);
  const pressRef = useRef(null);
  const resumeTimer = useRef(null);

  useEffect(
    () => () => {
      if (resumeTimer.current) {
        clearTimeout(resumeTimer.current);
      }
    },
    []
  );

  const shown = preview ?? watched;
  const chapterIndex = chapterIndexAt(chapters, shown);
  const chapter = chapters[chapterIndex];
  const chapterEnd = chapters[chapterIndex + 1]?.start ?? duration;
  const chapterT =
    (shown - (chapter?.start ?? 0)) /
    Math.max(1, chapterEnd - (chapter?.start ?? 0));

  const doneCount = currentIndex;
  const percent = coursePercent(lessons, currentIndex, watched);
  const minutesLeft = Math.max(1, Math.ceil((duration - watched) / 60));
  const upNext = lessons.slice(
    currentIndex + 1,
    currentIndex + 1 + upNextCount
  );

  /* -------------------------------- Actions ------------------------------- */

  const resume = (seconds) => {
    if (!lesson) {
      return;
    }
    const at = Math.round(clamp(seconds, 0, duration));
    onResume?.(lesson.id, at);
    setResumingAt(at);
    setAnnouncement(
      `Resuming lesson ${lesson.index + 1} at ${formatClock(at)}`
    );
    if (resumeTimer.current) {
      clearTimeout(resumeTimer.current);
    }
    resumeTimer.current = setTimeout(() => setResumingAt(null), RESUMING_MS);
  };

  const timeAt = (clientX) => {
    const rect = barRef.current?.getBoundingClientRect();
    if (!rect?.width) {
      return watched;
    }
    return clamp((clientX - rect.left) / rect.width, 0, 1) * duration;
  };

  /* -------------------------------- Pointer ------------------------------- */

  const handlePointerDown = (event) => {
    if (event.pointerType === "mouse" && event.button !== 0) {
      return;
    }
    pressRef.current = { x: event.clientX, moved: false };
    if (event.pointerType !== "mouse") {
      event.currentTarget.setPointerCapture(event.pointerId);
    }
  };

  const handlePointerMove = (event) => {
    const press = pressRef.current;
    if (press && Math.abs(event.clientX - press.x) > 6) {
      press.moved = true;
    }
    // Hover scrubs only where hover exists; touch scrubs while dragging
    if (event.pointerType === "mouse" || press?.moved) {
      setPreview(timeAt(event.clientX));
    }
  };

  const handlePointerUp = (event) => {
    const press = pressRef.current;
    pressRef.current = null;
    if (!press) {
      return;
    }
    if (event.pointerType === "mouse") {
      resume(timeAt(event.clientX));
      return;
    }
    // Touch: a tap resumes where you left off, a drag only previews
    if (!press.moved) {
      resume(watched);
    }
    setPreview(null);
  };

  /* ------------------------------- Keyboard ------------------------------- */

  const handleRangeChange = (event) => {
    setPreview(Number(event.target.value));
  };

  const handleRangeKey = (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      resume(shown);
      return;
    }
    if (event.key === "Escape") {
      setPreview(null);
      return;
    }
    if (
      event.shiftKey &&
      (event.key === "ArrowLeft" || event.key === "ArrowRight")
    ) {
      event.preventDefault();
      const dir = event.key === "ArrowLeft" ? -1 : 1;
      setPreview(clamp(shown + dir * KEY_STEP_LARGE, 0, duration));
    }
  };

  const [rangeFocused, setRangeFocused] = useState(false);
  const scrubbing = preview !== null || rangeFocused;
  const pct = shown / duration;
  const tooltipText =
    resumingAt === null
      ? formatClock(shown)
      : `Resuming at ${formatClock(resumingAt)}`;

  return (
    <div
      className={cn(
        "w-full max-w-[380px] rounded-2xl border border-neutral-200 bg-white p-1.5 text-left shadow-[0_1px_2px_rgba(0,0,0,0.04)] dark:border-white/[0.08] dark:bg-neutral-900 dark:shadow-none",
        className
      )}
    >
      {/* Thumbnail */}
      <div className="group/thumb relative aspect-video overflow-hidden rounded-[11px] bg-neutral-100 ring-1 ring-neutral-900/[0.06] ring-inset has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-neutral-950 dark:bg-white/[0.04] dark:ring-white/[0.06] dark:has-[:focus-visible]:ring-white">
        {course.thumbnail ? (
          <Image
            alt=""
            className="object-cover"
            fill
            sizes="380px"
            src={course.thumbnail}
            unoptimized
          />
        ) : (
          <LessonFrame chapter={chapterIndex} t={chapterT} />
        )}

        {/* Play button */}
        <span
          aria-hidden="true"
          className={cn(
            "pointer-events-none absolute top-1/2 left-1/2 flex h-11 w-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-neutral-900 text-white shadow-[0_2px_8px_rgba(0,0,0,0.12)] transition-opacity duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] dark:bg-neutral-50 dark:text-neutral-900 dark:shadow-[0_2px_10px_rgba(0,0,0,0.4)]",
            scrubbing ? "opacity-0" : "opacity-100"
          )}
        >
          <Play
            className="ml-0.5 h-[18px] w-[18px] fill-current"
            strokeWidth={0}
          />
        </span>

        {/* Time left */}
        <span
          aria-hidden="true"
          className={cn(
            "pointer-events-none absolute right-3 bottom-6 rounded-md bg-white/90 px-1.5 py-0.5 font-medium text-[11px] text-neutral-700 tabular-nums leading-4 ring-1 ring-neutral-200 backdrop-blur-sm transition-opacity duration-150 dark:bg-neutral-800/90 dark:text-neutral-200 dark:ring-white/[0.08]",
            scrubbing ? "opacity-0" : "opacity-100"
          )}
        >
          {minutesLeft} min left
        </span>

        {/* Playhead and tooltip, moved by percentage transforms */}
        <div
          aria-hidden="true"
          className={cn(
            "pointer-events-none absolute inset-x-3 inset-y-0 transition-opacity duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] motion-reduce:transition-none",
            scrubbing || resumingAt !== null ? "opacity-100" : "opacity-0"
          )}
          style={{ transform: `translateX(${pct * 100}%)` }}
        >
          <span className="absolute inset-y-0 left-0 w-px -translate-x-1/2 bg-neutral-900/40 dark:bg-white/60" />
        </div>
        <div
          aria-hidden="true"
          className={cn(
            "pointer-events-none absolute inset-x-1.5 bottom-6 transition-opacity duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] motion-reduce:transition-none",
            scrubbing || resumingAt !== null ? "opacity-100" : "opacity-0"
          )}
        >
          <div style={{ transform: `translateX(${pct * 100}%)` }}>
            <div
              className="w-max"
              style={{ transform: `translateX(${-pct * 100}%)` }}
            >
              <p className="flex max-w-[240px] items-baseline gap-1.5 whitespace-nowrap rounded-md bg-white px-2 py-1 text-[11px] text-neutral-900 leading-4 shadow-[0_2px_8px_rgba(0,0,0,0.08)] ring-1 ring-neutral-200 dark:bg-neutral-800 dark:text-neutral-50 dark:shadow-[0_2px_8px_rgba(0,0,0,0.4)] dark:ring-white/[0.1]">
                <span className="font-semibold tabular-nums">
                  {tooltipText}
                </span>
                {chapters.length > 1 && resumingAt === null && (
                  <span className="truncate text-neutral-500 dark:text-neutral-400">
                    {chapter?.title}
                  </span>
                )}
              </p>
            </div>
          </div>
        </div>

        {/* Chaptered progress along the bottom edge */}
        <div
          aria-hidden="true"
          className="absolute inset-x-3 bottom-3 flex h-[3px] gap-[2px]"
          ref={barRef}
        >
          {chapters.map((item, i) => {
            const end = chapters[i + 1]?.start ?? duration;
            const span = Math.max(1, end - item.start);
            const watchedFill = clamp((watched - item.start) / span, 0, 1);
            const previewFill =
              preview === null ? 0 : clamp((preview - item.start) / span, 0, 1);
            return (
              <span
                className="relative h-full overflow-hidden rounded-full bg-neutral-900/[0.12] dark:bg-white/[0.16]"
                key={`${item.start}-${item.title}`}
                style={{ flexGrow: span, flexBasis: 0 }}
              >
                <span
                  className="absolute inset-y-0 left-0 bg-neutral-900/30 dark:bg-white/40"
                  style={{ width: `${previewFill * 100}%` }}
                />
                <span
                  className="absolute inset-y-0 left-0 bg-orange-600 dark:bg-orange-400"
                  style={{ width: `${watchedFill * 100}%` }}
                />
              </span>
            );
          })}
        </div>

        {/* Pointer surface (mouse hover scrubs, click resumes) */}
        <div
          aria-hidden="true"
          className="absolute inset-0 cursor-pointer touch-pan-y select-none"
          onLostPointerCapture={() => {
            pressRef.current = null;
          }}
          onPointerCancel={() => {
            pressRef.current = null;
            setPreview(null);
          }}
          onPointerDown={handlePointerDown}
          onPointerLeave={(event) => {
            if (event.pointerType === "mouse") {
              pressRef.current = null;
              setPreview(null);
            }
          }}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          ref={surfaceRef}
        />

        {/* Keyboard: arrow keys pick a time, Enter resumes */}
        <input
          aria-describedby={`${id}-hint`}
          aria-label={`Resume lesson ${(lesson?.index ?? 0) + 1}, ${lesson?.title ?? ""}`}
          aria-valuetext={`${formatClock(shown)} of ${formatClock(duration)}${chapters.length > 1 ? `, ${chapter?.title}` : ""}`}
          className="sr-only"
          max={duration}
          min={0}
          onBlur={() => {
            setRangeFocused(false);
            setPreview(null);
          }}
          onChange={handleRangeChange}
          onFocus={() => setRangeFocused(true)}
          onKeyDown={handleRangeKey}
          step={KEY_STEP}
          type="range"
          value={Math.round(shown)}
        />
        <span className="sr-only" id={`${id}-hint`}>
          Use the arrow keys to pick a time and Enter to resume from it.
        </span>
      </div>

      <div className="px-3.5 pt-3.5 pb-2">
        {/* Lesson and course */}
        <p className="truncate text-[12px] text-neutral-500 dark:text-neutral-400">
          {course.title}
        </p>
        <p className="mt-0.5 truncate font-medium text-[15px] text-neutral-900 leading-6 tracking-[-0.01em] dark:text-neutral-50">
          <span className="text-neutral-500 tabular-nums dark:text-neutral-400">
            {(lesson?.index ?? 0) + 1}
          </span>
          <span
            aria-hidden="true"
            className="mx-1.5 text-neutral-300 dark:text-neutral-700"
          >
            ·
          </span>
          {lesson?.title}
        </p>
        <div className="mt-1.5 flex min-w-0 items-center gap-1.5 text-[12px] text-neutral-500 dark:text-neutral-400">
          <Avatar
            name={course.instructor.name}
            src={course.instructor.avatar}
          />
          <span className="truncate">{course.instructor.name}</span>
        </div>

        {/* Course progress */}
        <div className="mt-4">
          <div className="mb-2 flex items-baseline justify-between gap-3 text-[12px] tabular-nums">
            <p className="text-neutral-500 dark:text-neutral-400">
              <span className="font-medium text-neutral-900 dark:text-neutral-50">
                {doneCount} of {lessons.length}
              </span>{" "}
              lessons
            </p>
            <p className="text-neutral-500 dark:text-neutral-400">{percent}%</p>
          </div>
          <ModuleProgress doneCount={doneCount} modules={course.modules} />
        </div>
      </div>

      {/* Up next */}
      {upNext.length > 0 && (
        <div className="mx-3.5 mt-2 border-neutral-100 border-t pt-2.5 pb-1.5 dark:border-white/[0.06]">
          <p className="mb-1 text-[12px] text-neutral-500 dark:text-neutral-400">
            Up next
          </p>
          <ul className="-mx-2">
            {upNext.map((item) => (
              <li key={item.id}>
                <button
                  className="group/row flex h-11 w-full items-center gap-2.5 rounded-lg px-2 text-left text-[13px] outline-none transition-colors duration-150 hover:bg-neutral-100 focus-visible:ring-2 focus-visible:ring-neutral-950 active:bg-neutral-200/60 dark:active:bg-white/[0.08] dark:focus-visible:ring-white dark:hover:bg-white/[0.05]"
                  onClick={() => onSelectLesson?.(item.id)}
                  type="button"
                >
                  <span className="relative flex w-4 shrink-0 justify-center text-[12px] text-neutral-500 tabular-nums dark:text-neutral-400">
                    <span className="transition-opacity duration-150 group-hover/row:opacity-0">
                      {item.index + 1}
                    </span>
                    <Play
                      aria-hidden="true"
                      className="absolute top-1/2 left-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 fill-current text-neutral-900 opacity-0 transition-opacity duration-150 group-hover/row:opacity-100 dark:text-neutral-100"
                      strokeWidth={0}
                    />
                  </span>
                  <span className="min-w-0 flex-1 truncate text-neutral-700 dark:text-neutral-300">
                    {item.title}
                  </span>
                  <span className="shrink-0 text-[12px] text-neutral-500 tabular-nums dark:text-neutral-400">
                    {item.minutes} min
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <output aria-live="polite" className="sr-only">
        {announcement}
      </output>
    </div>
  );
}
