"use client";;
/**
 * Onboarding Checklist
 *
 * SaaS "Get started" card. The progress ring fills on a spring, checking a
 * step draws the check, the step collapses and the next one opens, and
 * finishing the last step folds the card into an "All set" state. Steps are
 * data via props; completion works controlled or uncontrolled.
 */

import {
  ArrowRight,
  Check,
  ChevronDown,
  FileSpreadsheet,
  Mail,
  RotateCcw,
  X,
} from "lucide-react";
import { motion, useSpring, useTransform } from "motion/react";
import { useEffect, useId, useRef, useState } from "react";
import { cn } from "@/lib/utils";

/* Brand logos from SVGL (svgl.app). */
const PostgresLogo = (
  <svg aria-hidden="true" className="size-3.5" viewBox="0 0 432.071 445.383">
    <g
      fill="none"
      stroke="#fff"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="12.4651"
    >
      <path
        d="M323.205 324.227c2.833-23.601 1.984-27.062 19.563-23.239l4.463.392c13.517.615 31.199-2.174 41.587-7 22.362-10.376 35.622-27.7 13.572-23.148-50.297 10.376-53.755-6.655-53.755-6.655 53.111-78.803 75.313-178.836 56.149-203.322-52.27-66.789-142.748-35.206-144.262-34.386l-.482.089c-9.938-2.062-21.06-3.294-33.554-3.496-22.761-.374-40.032 5.967-53.133 15.904 0 0-161.408-66.498-153.899 83.628 1.597 31.936 45.777 241.655 98.47 178.31 19.259-23.163 37.871-42.748 37.871-42.748 9.242 6.14 20.307 9.272 31.912 8.147l.897-.765c-.281 2.876-.157 5.689.359 9.019-13.572 15.167-9.584 17.83-36.723 23.416-27.457 5.659-11.326 15.734-.797 18.367 12.768 3.193 42.305 7.716 62.268-20.224l-.795 3.188c5.325 4.26 4.965 30.619 5.72 49.452.756 18.834 2.017 36.409 5.856 46.771 3.839 10.36 8.369 37.05 44.036 29.406 29.809-6.388 52.6-15.582 54.677-101.107"
        fill="#000"
        stroke="#000"
        strokeLinecap="butt"
        strokeLinejoin="miter"
        strokeWidth="37.3953"
      />
      <path
        d="M402.395 271.23c-50.302 10.376-53.76-6.655-53.76-6.655 53.111-78.808 75.313-178.843 56.153-203.326-52.27-66.785-142.752-35.2-144.262-34.38l-.486.087c-9.938-2.063-21.06-3.292-33.56-3.496-22.761-.373-40.026 5.967-53.127 15.902 0 0-161.411-66.495-153.904 83.63 1.597 31.938 45.776 241.657 98.471 178.312 19.26-23.163 37.869-42.748 37.869-42.748 9.243 6.14 20.308 9.272 31.908 8.147l.901-.765c-.28 2.876-.152 5.689.361 9.019-13.575 15.167-9.586 17.83-36.723 23.416-27.459 5.659-11.328 15.734-.796 18.367 12.768 3.193 42.307 7.716 62.266-20.224l-.796 3.188c5.319 4.26 9.054 27.711 8.428 48.969-.626 21.259-1.044 35.854 3.147 47.254 4.191 11.4 8.368 37.05 44.042 29.406 29.809-6.388 45.256-22.942 47.405-50.555 1.525-19.631 4.976-16.729 5.194-34.28l2.768-8.309c3.192-26.611.507-35.196 18.872-31.203l4.463.392c13.517.615 31.208-2.174 41.591-7 22.358-10.376 35.618-27.7 13.573-23.148z"
        fill="#336791"
        stroke="none"
      />
      <path d="M215.866 286.484c-1.385 49.516.348 99.377 5.193 111.495 4.848 12.118 15.223 35.688 50.9 28.045 29.806-6.39 40.651-18.756 45.357-46.051 3.466-20.082 10.148-75.854 11.005-87.281M173.104 38.256S11.583-27.76 19.092 122.365c1.597 31.938 45.779 241.664 98.473 178.316 19.256-23.166 36.671-41.335 36.671-41.335M260.349 26.207c-5.591 1.753 89.848-34.889 144.087 34.417 19.159 24.484-3.043 124.519-56.153 203.329" />
      <path
        d="M348.282 263.953s3.461 17.036 53.764 6.653c22.04-4.552 8.776 12.774-13.577 23.155-18.345 8.514-59.474 10.696-60.146-1.069-1.729-30.355 21.647-21.133 19.96-28.739-1.525-6.85-11.979-13.573-18.894-30.338-6.037-14.633-82.796-126.849 21.287-110.183 3.813-.789-27.146-99.002-124.553-100.599-97.385-1.597-94.19 119.762-94.19 119.762"
        strokeLinejoin="bevel"
      />
      <path d="M188.604 274.334c-13.577 15.166-9.584 17.829-36.723 23.417-27.459 5.66-11.326 15.733-.797 18.365 12.768 3.195 42.307 7.718 62.266-20.229 6.078-8.509-.036-22.086-8.385-25.547-4.034-1.671-9.428-3.765-16.361 3.994z" />
      <path d="M187.715 274.069c-1.368-8.917 2.93-19.528 7.536-31.942 6.922-18.626 22.893-37.255 10.117-96.339-9.523-44.029-73.396-9.163-73.436-3.193-.039 5.968 2.889 30.26-1.067 58.548-5.162 36.913 23.488 68.132 56.479 64.938" />
      <path
        d="M172.517 141.7c-.288 2.039 3.733 7.48 8.976 8.207 5.234.73 9.714-3.522 9.998-5.559.284-2.039-3.732-4.285-8.977-5.015-5.237-.731-9.719.333-9.996 2.367z"
        fill="#fff"
        strokeLinecap="butt"
        strokeLinejoin="miter"
        strokeWidth="4.155"
      />
      <path
        d="M331.941 137.543c.284 2.039-3.732 7.48-8.976 8.207-5.238.73-9.718-3.522-10.005-5.559-.277-2.039 3.74-4.285 8.979-5.015 5.239-.73 9.718.333 10.002 2.368z"
        fill="#fff"
        strokeLinecap="butt"
        strokeLinejoin="miter"
        strokeWidth="2.0775"
      />
      <path d="M350.676 123.432c.863 15.994-3.445 26.888-3.988 43.914-.804 24.748 11.799 53.074-7.191 81.435" />
    </g>
  </svg>
);

const StripeLogo = (
  <svg aria-hidden="true" className="size-3" viewBox="100 100 312 312">
    <path d="m120 392 272-57.683V120l-272 58.357z" fill="#533AFD" />
  </svg>
);

const SlackLogo = (
  <svg aria-hidden="true" className="size-3.5" viewBox="0 0 2447.6 2452.5">
    <g clipRule="evenodd" fillRule="evenodd">
      <path
        d="m897.4 0c-135.3.1-244.8 109.9-244.7 245.2-.1 135.3 109.5 245.1 244.8 245.2h244.8v-245.1c.1-135.3-109.5-245.1-244.9-245.3.1 0 .1 0 0 0m0 654h-652.6c-135.3.1-244.9 109.9-244.8 245.2-.2 135.3 109.4 245.1 244.7 245.3h652.7c135.3-.1 244.9-109.9 244.8-245.2.1-135.4-109.5-245.2-244.8-245.3z"
        fill="#36c5f0"
      />
      <path
        d="m2447.6 899.2c.1-135.3-109.5-245.1-244.8-245.2-135.3.1-244.9 109.9-244.8 245.2v245.3h244.8c135.3-.1 244.9-109.9 244.8-245.3zm-652.7 0v-654c.1-135.2-109.4-245-244.7-245.2-135.3.1-244.9 109.9-244.8 245.2v654c-.2 135.3 109.4 245.1 244.7 245.3 135.3-.1 244.9-109.9 244.8-245.3z"
        fill="#2eb67d"
      />
      <path
        d="m1550.1 2452.5c135.3-.1 244.9-109.9 244.8-245.2.1-135.3-109.5-245.1-244.8-245.2h-244.8v245.2c-.1 135.2 109.5 245 244.8 245.2zm0-654.1h652.7c135.3-.1 244.9-109.9 244.8-245.2.2-135.3-109.4-245.1-244.7-245.3h-652.7c-135.3.1-244.9 109.9-244.8 245.2-.1 135.4 109.4 245.2 244.7 245.3z"
        fill="#ecb22e"
      />
      <path
        d="m0 1553.2c-.1 135.3 109.5 245.1 244.8 245.2 135.3-.1 244.9-109.9 244.8-245.2v-245.2h-244.8c-135.3.1-244.9 109.9-244.8 245.2zm652.7 0v654c-.2 135.3 109.4 245.1 244.7 245.3 135.3-.1 244.9-109.9 244.8-245.2v-653.9c.2-135.3-109.4-245.1-244.7-245.3-135.4 0-244.9 109.8-244.8 245.1 0 0 0 .1 0 0"
        fill="#e01e5a"
      />
    </g>
  </svg>
);

const DEFAULT_STEPS = [
  {
    id: "workspace",
    title: "Create your workspace",
    description: "Name your workspace and pick a region for your data.",
    actionLabel: "Open settings",
    estimate: "1 min",
  },
  {
    id: "source",
    title: "Connect a data source",
    description:
      "Sync Postgres, Stripe or a CSV file. Most sources finish their first import in under a minute.",
    actionLabel: "Connect source",
    estimate: "3 min",
    apps: [
      { name: "Postgres", logo: PostgresLogo },
      { name: "Stripe", logo: StripeLogo },
      {
        name: "CSV file",
        logo: (
          <FileSpreadsheet
            aria-hidden="true"
            className="size-3.5 text-emerald-600 dark:text-emerald-400"
          />
        ),
      },
    ],
  },
  {
    id: "team",
    title: "Invite your team",
    description:
      "Teammates get view access by default. You can change roles later in Members.",
    actionLabel: "Invite teammates",
    estimate: "1 min",
  },
  {
    id: "dashboard",
    title: "Build your first dashboard",
    description:
      "Start from the SaaS metrics template or drag charts onto a blank canvas.",
    actionLabel: "Browse templates",
    estimate: "5 min",
  },
  {
    id: "alerts",
    title: "Set up an alert",
    description:
      "Get a Slack or email ping when a metric moves outside its usual range.",
    actionLabel: "Create alert",
    estimate: "2 min",
    apps: [
      { name: "Slack", logo: SlackLogo },
      {
        name: "Email",
        logo: (
          <Mail
            aria-hidden="true"
            className="size-3.5 text-zinc-500 dark:text-zinc-400"
          />
        ),
      },
    ],
  },
];

const EASE_OUT_CSS = "cubic-bezier(0.23, 1, 0.32, 1)";
const COLLAPSE_DELAY = 320;
const ALL_SET_DELAY = 520;
const RING_RADIUS = 18;
const RING_CIRCUMFERENCE = 113.1; // 2πr, rounded so server and client match

const focusRing =
  "outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 dark:focus-visible:ring-white";
// Extends a 32px-tall button to a 44px target without changing its look.
const HIT =
  "relative after:absolute after:inset-x-0 after:-inset-y-1.5 after:content-['']";

/* Height animates through the grid-rows trick: one CSS transition, fully
   interruptible, and the content stays mounted (inert while closed). */
function Collapsible({
  open,
  id,
  className,
  children
}) {
  return (
    <div
      className="grid motion-reduce:transition-none"
      id={id}
      inert={!open}
      style={{
        gridTemplateRows: open ? "1fr" : "0fr",
        transition: `grid-template-rows 260ms ${EASE_OUT_CSS}`,
      }}
    >
      <div className="min-h-0 overflow-hidden">
        <div
          className={cn(
            "transition-opacity",
            open ? "opacity-100 duration-200" : "opacity-0 duration-100",
            className
          )}
        >
          {children}
        </div>
      </div>
    </div>
  );
}

function ProgressRing({
  done,
  total,
  allSet
}) {
  const progress = total === 0 ? 0 : done / total;
  // Critically damped: fills smoothly with no overshoot.
  const spring = useSpring(progress, { stiffness: 140, damping: 24 });
  const dashOffset = useTransform(
    spring,
    (value) => RING_CIRCUMFERENCE * (1 - value)
  );

  useEffect(() => {
    const reduce = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    if (reduce) {
      spring.jump(progress);
    } else {
      spring.set(progress);
    }
  }, [progress, spring]);

  return (
    <div className="relative size-11 shrink-0">
      <svg
        aria-hidden="true"
        className="size-11 -rotate-90"
        fill="none"
        viewBox="0 0 44 44"
      >
        <circle
          className="stroke-zinc-200 dark:stroke-zinc-800"
          cx="22"
          cy="22"
          r={RING_RADIUS}
          strokeWidth="3.5"
        />
        <motion.circle
          className="stroke-zinc-900 dark:stroke-zinc-50"
          cx="22"
          cy="22"
          r={RING_RADIUS}
          strokeDasharray={RING_CIRCUMFERENCE}
          strokeLinecap="round"
          strokeWidth="3.5"
          style={{ strokeDashoffset: dashOffset }}
        />
      </svg>
      <span
        aria-hidden="true"
        className={cn(
          "absolute inset-0 flex items-center justify-center font-semibold text-[11px] text-zinc-900 tabular-nums transition-opacity duration-200 dark:text-zinc-50",
          allSet ? "opacity-0" : "opacity-100"
        )}
      >
        {done}/{total}
      </span>
      <span
        aria-hidden="true"
        className={cn(
          "absolute inset-[7px] flex items-center justify-center rounded-full bg-zinc-900 text-white transition-opacity duration-200 dark:bg-zinc-50 dark:text-zinc-900",
          allSet ? "opacity-100" : "opacity-0"
        )}
      >
        <Check className="size-4" strokeWidth={2.5} />
      </span>
    </div>
  );
}

function StepCheck({
  done,
  active,
  label,
  onToggle
}) {
  return (
    <label
      className={cn(
        // The pseudo-element makes the 22px circle a 44px target.
        "relative z-10 flex size-[22px] shrink-0 cursor-pointer items-center justify-center rounded-full border-[1.5px] bg-white transition-colors duration-200 after:absolute after:-inset-[11px] after:content-[''] dark:bg-zinc-950",
        "has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-zinc-900 has-[:focus-visible]:ring-offset-2 has-[:focus-visible]:ring-offset-white dark:has-[:focus-visible]:ring-white dark:has-[:focus-visible]:ring-offset-zinc-950",
        done &&
          "border-zinc-900 bg-zinc-900 dark:border-zinc-50 dark:bg-zinc-50",
        !done &&
          active &&
          "border-zinc-900 hover:bg-zinc-100 dark:border-zinc-200 dark:hover:bg-zinc-800",
        !(done || active) &&
          "border-zinc-300 border-dashed hover:border-zinc-400 dark:border-zinc-700 dark:hover:border-zinc-500"
      )}
    >
      <input
        aria-label={label}
        checked={done}
        className="sr-only"
        onChange={onToggle}
        type="checkbox"
      />
      <svg
        aria-hidden="true"
        className="size-3 text-white dark:text-zinc-900"
        fill="none"
        viewBox="0 0 12 12"
      >
        <motion.path
          animate={{ pathLength: done ? 1 : 0 }}
          className={cn(
            "transition-opacity",
            done ? "opacity-100 duration-75" : "opacity-0 delay-150 duration-75"
          )}
          d="M2.5 6.25 4.9 8.6 9.5 3.6"
          initial={false}
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.8"
          transition={{ duration: 0.24, ease: [0.23, 1, 0.32, 1] }}
        />
      </svg>
    </label>
  );
}

function StepRow({
  step,
  index,
  isLast,
  done,
  open,
  isNext,
  baseId,
  headerRef,
  onToggleOpen,
  onToggleDone,
  onAction
}) {
  const panelId = `${baseId}-step-${step.id}`;
  return (
    <li className="relative">
      {/* Connector to the next step; fills top-down once this one is done */}
      {!isLast && (
        <span
          aria-hidden="true"
          className="absolute top-[34px] bottom-[-6px] left-[22.5px] w-px overflow-hidden bg-zinc-200 dark:bg-zinc-800"
        >
          <span
            className={cn(
              "block size-full origin-top bg-zinc-900 transition-transform duration-300 motion-reduce:transition-none dark:bg-zinc-200",
              done ? "scale-y-100" : "scale-y-0"
            )}
            style={{ transitionTimingFunction: EASE_OUT_CSS }}
          />
        </span>
      )}
      <div
        className={cn(
          "rounded-xl px-3 transition-colors duration-200",
          open ? "bg-zinc-50 dark:bg-zinc-900/70" : "bg-transparent"
        )}
      >
        <div className="flex items-center gap-3 py-2.5">
          <StepCheck
            active={isNext}
            done={done}
            label={`${step.title}: ${done ? "done" : "not done"}`}
            onToggle={onToggleDone}
          />
          <button
            aria-controls={panelId}
            aria-expanded={open}
            className={cn(
              "-my-1 flex min-w-0 flex-1 items-center gap-3 rounded-md py-1 text-left",
              focusRing
            )}
            onClick={onToggleOpen}
            ref={headerRef}
            type="button"
          >
            <span className="relative min-w-0 flex-1 truncate">
              <span className="sr-only">Step {index + 1}: </span>
              <span
                className={cn(
                  "relative font-medium text-sm transition-colors duration-200",
                  done
                    ? "text-zinc-400 dark:text-zinc-500"
                    : "text-zinc-900 dark:text-zinc-100"
                )}
              >
                {step.title}
                {/* Strike line draws left to right when the step is done */}
                <span
                  aria-hidden="true"
                  className={cn(
                    "absolute top-1/2 left-0 h-px w-full origin-left bg-current transition-transform duration-300 motion-reduce:transition-none",
                    done ? "scale-x-100" : "scale-x-0"
                  )}
                  style={{ transitionTimingFunction: EASE_OUT_CSS }}
                />
              </span>
            </span>
            {step.estimate && !done && (
              <span className="shrink-0 text-xs text-zinc-500 tabular-nums dark:text-zinc-400">
                {step.estimate}
              </span>
            )}
            <ChevronDown
              aria-hidden="true"
              className={cn(
                "size-4 shrink-0 text-zinc-400 transition-transform duration-200 motion-reduce:transition-none dark:text-zinc-500",
                open && "rotate-180"
              )}
            />
          </button>
        </div>
        <Collapsible id={panelId} open={open}>
          <div className="pb-3.5 pl-[34px]">
            <p className="text-pretty text-sm text-zinc-500 leading-relaxed dark:text-zinc-400">
              {step.description}
            </p>
            <div className="mt-3 flex items-center gap-2">
              <button
                className={cn(
                  "inline-flex h-8 items-center gap-1.5 rounded-lg bg-zinc-900 px-3 font-medium text-[13px] text-white transition-colors duration-150 hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200",
                  HIT,
                  focusRing
                )}
                onClick={onAction}
                type="button"
              >
                {step.actionLabel}
                <ArrowRight aria-hidden="true" className="size-3.5" />
              </button>
              {!done && (
                <button
                  className={cn(
                    "inline-flex h-8 items-center rounded-lg px-2.5 font-medium text-[13px] text-zinc-500 transition-colors duration-150 hover:bg-zinc-200/60 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100",
                    HIT,
                    focusRing
                  )}
                  onClick={onToggleDone}
                  type="button"
                >
                  Mark as done
                </button>
              )}
              {step.apps && step.apps.length > 0 && (
                <ul
                  aria-label="Works with"
                  className="ml-auto flex items-center gap-1"
                >
                  {step.apps.map((app) => (
                    <li
                      className="flex size-6 items-center justify-center rounded-md bg-white ring-1 ring-zinc-200 dark:bg-zinc-900 dark:ring-zinc-800"
                      key={app.name}
                      title={app.name}
                    >
                      {app.logo}
                      <span className="sr-only">{app.name}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </Collapsible>
      </div>
    </li>
  );
}

export default function OnboardingChecklist({
  steps = DEFAULT_STEPS,
  completed,
  defaultCompleted = ["workspace"],
  onCompletedChange,
  onStepAction,
  onComplete,
  onDismiss,
  onFinish,
  title = "Get started with Northwind",
  description = "Finish setting up to see your first live dashboard.",
  completeTitle = "You're all set",
  completeDescription = "Your workspace is ready. Invite more teammates or add sources any time from Settings.",
  finishLabel = "Go to dashboard",
  className,
  ...props
}) {
  const baseId = useId().replaceAll(":", "");
  const [internal, setInternal] = useState(defaultCompleted);
  const doneIds = completed ?? internal;
  const isDone = (id) => doneIds.includes(id);
  const firstOpen = steps.find((step) => !doneIds.includes(step.id))?.id;

  const [openId, setOpenId] = useState(firstOpen ?? null);
  const [allSet, setAllSet] = useState(
    () => steps.length > 0 && steps.every((step) => doneIds.includes(step.id))
  );
  const [message, setMessage] = useState("");
  const timer = useRef(null);
  const headerRefs = useRef({});
  const listRef = useRef(null);
  const finishRef = useRef(null);
  // Panels go inert as they close, so focus inside one would drop to the
  // page. A pending focus move runs after the render that changes them.
  const pendingFocus = useRef(null);
  // Set when this card's own toggle completes the list, so the controlled
  // sync below doesn't skip the delay that lets the check draw.
  const finishing = useRef(false);

  useEffect(() => {
    const run = pendingFocus.current;
    pendingFocus.current = null;
    run?.();
  });

  useEffect(
    () => () => {
      if (timer.current) {
        clearTimeout(timer.current);
      }
    },
    []
  );

  const doneCount = steps.filter((step) => doneIds.includes(step.id)).length;
  const nextId = steps.find((step) => !doneIds.includes(step.id))?.id;

  // Controlled mode: when the parent passes every step as done, reach the
  // all-set state too, not only when a step is completed here.
  const fullCount = steps.length;
  const lastCount = useRef(doneCount);
  useEffect(() => {
    const was = lastCount.current;
    lastCount.current = doneCount;
    if (
      fullCount > 0 &&
      doneCount === fullCount &&
      was < fullCount &&
      !finishing.current
    ) {
      setOpenId(null);
      setAllSet(true);
    }
  }, [doneCount, fullCount]);

  const focusInList = () =>
    Boolean(listRef.current?.contains(document.activeElement));

  const schedule = (callback, delay) => {
    if (timer.current) {
      clearTimeout(timer.current);
    }
    timer.current = setTimeout(callback, delay);
  };

  const setDone = (step, done) => {
    const next = done
      ? [...doneIds.filter((id) => id !== step.id), step.id]
      : doneIds.filter((id) => id !== step.id);
    if (completed === undefined) {
      setInternal(next);
    }
    onCompletedChange?.(next);

    const remaining = steps.filter((item) => !next.includes(item.id));
    const count = steps.length - remaining.length;
    setMessage(
      `${step.title} ${done ? "completed" : "marked as not done"}. ${count} of ${steps.length} steps done.`
    );

    if (!done) {
      schedule(() => setOpenId(step.id), 0);
      return;
    }

    // "Mark as done" unmounts and the panel closes, so a focused control in
    // this step's panel hands focus to a header that stays.
    const panel = document.getElementById(`${baseId}-step-${step.id}`);
    const focusInPanel = Boolean(panel?.contains(document.activeElement));

    if (remaining.length === 0) {
      finishing.current = true;
      if (focusInPanel) {
        headerRefs.current[step.id]?.focus();
      }
      // Let the check draw before the card folds away.
      schedule(() => {
        finishing.current = false;
        if (focusInList()) {
          pendingFocus.current = () => finishRef.current?.focus();
        }
        setOpenId(null);
        setAllSet(true);
        setMessage(`${completeTitle}. All ${steps.length} steps done.`);
        onComplete?.();
      }, ALL_SET_DELAY);
      return;
    }
    const after = steps.slice(steps.indexOf(step) + 1);
    const following =
      after.find((item) => !next.includes(item.id)) ?? remaining[0];
    if (focusInPanel && following) {
      headerRefs.current[following.id]?.focus();
    }
    schedule(() => setOpenId(following?.id ?? null), COLLAPSE_DELAY);
  };

  const handleAction = (step) => {
    onStepAction?.(step);
    if (!isDone(step.id)) {
      setDone(step, true);
    }
  };

  const reviewSteps = () => {
    const first = steps[0];
    pendingFocus.current = () => {
      if (first) {
        headerRefs.current[first.id]?.focus();
      }
    };
    setAllSet(false);
    setOpenId(null);
  };

  return (
    <div
      className={cn(
        "w-full max-w-[440px] overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04)] dark:border-zinc-800 dark:bg-zinc-950",
        className
      )}
      {...props}
    >
      <div className="flex items-start gap-3.5 p-5">
        <ProgressRing allSet={allSet} done={doneCount} total={steps.length} />
        <div className="relative min-w-0 flex-1 pt-0.5">
          <h3
            className="font-semibold text-[15px] text-zinc-900 dark:text-zinc-50"
            id={`${baseId}-title`}
          >
            {allSet ? completeTitle : title}
          </h3>
          <p className="mt-0.5 text-pretty text-sm text-zinc-500 dark:text-zinc-400">
            {allSet
              ? `${steps.length} of ${steps.length} steps complete`
              : description}
          </p>
        </div>
        {onDismiss && (
          <button
            aria-label="Dismiss checklist"
            className={cn(
              "relative -mt-1 -mr-1 flex size-8 shrink-0 items-center justify-center rounded-lg text-zinc-500 transition-colors duration-150 after:absolute after:-inset-1.5 after:content-[''] hover:bg-zinc-100 hover:text-zinc-700 dark:text-zinc-500 dark:hover:bg-zinc-800 dark:hover:text-zinc-200",
              focusRing
            )}
            onClick={onDismiss}
            type="button"
          >
            <X aria-hidden="true" className="size-4" />
          </button>
        )}
      </div>

      <Collapsible open={!allSet}>
        <div className="px-2 pb-2" ref={listRef}>
          <div className="mx-3 mb-2 h-px bg-zinc-100 dark:bg-zinc-800/80" />
          <ol aria-labelledby={`${baseId}-title`} className="space-y-0.5">
            {steps.map((step, index) => (
              <StepRow
                baseId={baseId}
                done={isDone(step.id)}
                headerRef={(node) => {
                  headerRefs.current[step.id] = node;
                }}
                index={index}
                isLast={index === steps.length - 1}
                isNext={step.id === nextId}
                key={step.id}
                onAction={() => handleAction(step)}
                onToggleDone={() => setDone(step, !isDone(step.id))}
                onToggleOpen={() =>
                  setOpenId((current) => (current === step.id ? null : step.id))
                }
                open={openId === step.id}
                step={step}
              />
            ))}
          </ol>
        </div>
      </Collapsible>

      <Collapsible open={allSet}>
        <div className="border-zinc-100 border-t px-5 pt-4 pb-5 dark:border-zinc-800/80">
          <p className="text-pretty text-sm text-zinc-500 leading-relaxed dark:text-zinc-400">
            {completeDescription}
          </p>
          <div className="mt-4 flex items-center gap-2">
            <button
              className={cn(
                "inline-flex h-9 items-center gap-1.5 rounded-lg bg-zinc-900 px-3.5 font-medium text-sm text-white transition-colors duration-150 hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200",
                focusRing
              )}
              onClick={onFinish}
              ref={finishRef}
              type="button"
            >
              {finishLabel}
              <ArrowRight aria-hidden="true" className="size-4" />
            </button>
            <button
              className={cn(
                "inline-flex h-9 items-center gap-1.5 rounded-lg px-3 font-medium text-sm text-zinc-600 transition-colors duration-150 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100",
                focusRing
              )}
              onClick={reviewSteps}
              type="button"
            >
              <RotateCcw aria-hidden="true" className="size-3.5" />
              Review steps
            </button>
          </div>
        </div>
      </Collapsible>

      <p aria-live="polite" className="sr-only">
        {message}
      </p>
    </div>
  );
}
