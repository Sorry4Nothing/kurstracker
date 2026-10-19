"use client";;
/**
 * Profile Card
 *
 * A portrait-first profile with name, verified badge, role, follower stats,
 * a "Followed by" line with mutual avatars, and a Follow button. Following
 * morphs the button in place (icon and label crossfade, primary to
 * secondary) while the follower count rolls up a digit at a time; hovering
 * or focusing "Following" offers "Unfollow", which rolls the count back.
 * The portrait sits on a neutral placeholder with initials, so the card still
 * reads well if the photo fails to load.
 */

import { BadgeCheck, Check, Plus, X } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import Image from "next/image";
import { useState } from "react";
import { cn } from "@/lib/utils";

const EASE_OUT = [0.23, 1, 0.32, 1];
const DIGIT = /\d/;
const WHITESPACE = /\s+/;

const avatar = (seed) =>
  `https://api.dicebear.com/9.x/notionists/png?seed=${seed}&backgroundColor=e5e5e5&size=64`;

const DEFAULT_MUTUALS = [
  { name: "Ana", avatarUrl: avatar("Ana") },
  { name: "Kai", avatarUrl: avatar("Kai") },
  { name: "Noor", avatarUrl: avatar("Noor") },
];

const formatCount = (value) => value.toLocaleString("en-US");

const initialsOf = (name) =>
  name
    .split(WHITESPACE)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

const mutualsText = (mutuals, total) => {
  const named = mutuals.slice(0, 2).map((m) => m.name);
  const others = Math.max(0, total - named.length);
  if (named.length === 0) {
    return "";
  }
  if (others === 0) {
    return named.join(" and ");
  }
  return `${named.join(", ")} and ${others} ${others === 1 ? "other" : "others"}`;
};

/** One digit on its own wheel: the new digit arrives from the direction of change. */
function RollingDigit({
  char,
  direction,
  reduce
}) {
  const distance = reduce ? 0 : 100;
  const variants = {
    enter: (dir) => ({ y: `${dir * distance}%`, opacity: 0 }),
    center: { y: "0%", opacity: 1 },
    exit: (dir) => ({ y: `${-dir * distance}%`, opacity: 0 }),
  };
  return (
    <span className="relative inline-block overflow-hidden">
      {/* custom on the presence reaches the exiting digit with the new direction */}
      <AnimatePresence custom={direction} initial={false} mode="popLayout">
        <motion.span
          animate="center"
          className="inline-block"
          custom={direction}
          exit="exit"
          initial="enter"
          key={char}
          transition={{ duration: reduce ? 0.12 : 0.26, ease: EASE_OUT }}
          variants={variants}
        >
          {char}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

function RollingNumber({
  value,
  direction,
  reduce
}) {
  const chars = formatCount(value).split("");
  return (
    <span aria-hidden="true" className="inline-flex tabular-nums">
      {chars.map((char, i) => {
        // Keyed from the right so units stay in place when the length changes.
        const key = chars.length - i;
        if (!DIGIT.test(char)) {
          return <span key={`s${key}`}>{char}</span>;
        }
        return (
          <RollingDigit
            char={char}
            direction={direction}
            key={`d${key}`}
            reduce={reduce}
          />
        );
      })}
    </span>
  );
}

function Stat({
  label,
  children
}) {
  return (
    <div className="flex flex-col-reverse gap-0.5">
      <dt className="text-[12px] text-neutral-500 dark:text-neutral-400">
        {label}
      </dt>
      <dd className="font-semibold text-[15px] text-neutral-900 tabular-nums tracking-tight dark:text-neutral-50">
        {children}
      </dd>
    </div>
  );
}

/** Fades in once loaded; until then (or if it fails) the placeholder below shows. */
function Photo({
  alt,
  className,
  sizes,
  src
}) {
  const [loaded, setLoaded] = useState(false);
  return (
    <Image
      alt={alt}
      className={cn(
        "object-cover text-transparent transition-opacity duration-300 ease-out motion-reduce:transition-none",
        loaded ? "opacity-100" : "opacity-0",
        className
      )}
      fill
      // Next calls onLoad for any complete image, broken ones too.
      onLoad={(event) => setLoaded(event.currentTarget.naturalWidth > 0)}
      sizes={sizes}
      src={src}
      unoptimized
    />
  );
}

function MutualAvatars({
  mutuals
}) {
  return (
    <span aria-hidden="true" className="flex shrink-0 -space-x-1.5">
      {mutuals.slice(0, 3).map((m) => (
        <span
          className="relative flex size-5 items-center justify-center overflow-hidden rounded-full bg-neutral-200 font-medium text-[9px] text-neutral-500 ring-2 ring-white dark:bg-neutral-800 dark:text-neutral-400 dark:ring-neutral-900"
          key={m.name}
        >
          {m.name[0]}
          {m.avatarUrl && <Photo alt="" sizes="20px" src={m.avatarUrl} />}
        </span>
      ))}
    </span>
  );
}

const iconMotion = {
  initial: { opacity: 0, filter: "blur(2px)", y: 4 },
  animate: { opacity: 1, filter: "blur(0px)", y: 0 },
  exit: { opacity: 0, filter: "blur(2px)", y: -4 },
};

function FollowLabel({
  isFollowing,
  reduce
}) {
  const transition = { duration: reduce ? 0.1 : 0.2, ease: EASE_OUT };
  const motionProps = reduce
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } }
    : iconMotion;
  return (
    <AnimatePresence initial={false} mode="popLayout">
      {isFollowing ? (
        <motion.span
          className="relative inline-flex items-center gap-1.5"
          key="following"
          transition={transition}
          {...motionProps}
        >
          {/* "Following" at rest; "Unfollow" on hover or keyboard focus */}
          <span className="inline-flex items-center gap-1.5 transition-opacity duration-150 group-focus-visible/follow:group-data-[armed=true]/follow:opacity-0 group-hover/follow:group-data-[armed=true]/follow:opacity-0">
            <Check aria-hidden="true" className="size-4" />
            Following
          </span>
          <span className="absolute inset-0 inline-flex items-center justify-center gap-1.5 opacity-0 transition-opacity duration-150 group-focus-visible/follow:group-data-[armed=true]/follow:opacity-100 group-hover/follow:group-data-[armed=true]/follow:opacity-100">
            <X aria-hidden="true" className="size-4" />
            Unfollow
          </span>
        </motion.span>
      ) : (
        <motion.span
          className="inline-flex items-center gap-1.5"
          key="follow"
          transition={transition}
          {...motionProps}
        >
          <Plus aria-hidden="true" className="size-4" />
          Follow
        </motion.span>
      )}
    </AnimatePresence>
  );
}

export default function ProfileCard({
  name = "An Yujin",
  title = "Product Designer, previously Google and Meta",
  followers = 1219,
  posts = 172,
  following = 348,
  imageUrl = "https://ferf1mheo22r9ira.public.blob.vercel-storage.com/portrait-02-VXozoDojhSo4QH9kWAOFi3YZp77DvO",
  isVerified = true,
  mutuals = DEFAULT_MUTUALS,
  mutualCount = 14,
  defaultFollowing = false,
  onFollowChange,
  className
}) {
  const reduce = useReducedMotion() ?? false;
  const [isFollowing, setIsFollowing] = useState(defaultFollowing);
  // The Unfollow swap waits until the pointer or focus leaves after a click,
  // so the button doesn't offer to undo what you just did.
  const [armed, setArmed] = useState(true);
  const [announcement, setAnnouncement] = useState("");

  const base = followers - (defaultFollowing ? 1 : 0);
  const count = base + (isFollowing ? 1 : 0);

  const toggle = () => {
    const next = !isFollowing;
    setIsFollowing(next);
    setArmed(false);
    setAnnouncement(
      `${next ? "Following" : "Unfollowed"} ${name}. ${formatCount(base + (next ? 1 : 0))} followers.`
    );
    onFollowChange?.(next);
  };

  const mutualLine = mutualsText(
    mutuals,
    Math.max(mutualCount, mutuals.length)
  );

  return (
    <div
      className={cn(
        "w-[320px] max-w-full shrink-0 rounded-2xl border border-neutral-200 bg-white p-1.5 shadow-[0_1px_2px_rgba(0,0,0,0.04)] dark:border-white/[0.08] dark:bg-neutral-900 dark:shadow-none",
        className
      )}
    >
      <div className="relative flex aspect-[5/4] w-full items-center justify-center overflow-hidden rounded-[10px] bg-neutral-100 dark:bg-white/[0.04]">
        <span
          aria-hidden="true"
          className="font-medium text-4xl text-neutral-300 tracking-tight dark:text-neutral-700"
        >
          {initialsOf(name)}
        </span>
        <Photo
          alt={name}
          className="object-[center_30%]"
          sizes="320px"
          src={imageUrl}
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 rounded-[10px] ring-1 ring-black/5 ring-inset dark:ring-white/5"
        />
      </div>

      <div className="px-2.5 pt-3.5 pb-2.5">
        <div className="flex items-center gap-1.5">
          <h3 className="truncate font-semibold text-base text-neutral-900 tracking-tight dark:text-neutral-50">
            {name}
          </h3>
          {isVerified && (
            <BadgeCheck
              aria-label="Verified account"
              className="size-[18px] shrink-0 fill-sky-600 text-white dark:fill-sky-500 dark:text-neutral-950"
              role="img"
            />
          )}
        </div>
        <p className="mt-0.5 text-[13px] text-neutral-500 leading-5 dark:text-neutral-400">
          {title}
        </p>

        <dl className="mt-3.5 grid grid-cols-3 gap-3 border-neutral-100 border-t pt-3.5 dark:border-white/[0.06]">
          <Stat label="Followers">
            <span className="sr-only">{formatCount(count)}</span>
            <RollingNumber
              direction={isFollowing ? 1 : -1}
              reduce={reduce}
              value={count}
            />
          </Stat>
          <Stat label="Following">{formatCount(following)}</Stat>
          <Stat label="Posts">{formatCount(posts)}</Stat>
        </dl>

        {mutualLine && (
          <div className="mt-3.5 flex items-center gap-2">
            <MutualAvatars mutuals={mutuals} />
            <p className="min-w-0 truncate text-[12px] text-neutral-500 dark:text-neutral-400">
              Followed by{" "}
              <span className="text-neutral-700 dark:text-neutral-300">
                {mutualLine}
              </span>
            </p>
          </div>
        )}

        <button
          aria-label={`Follow ${name}`}
          aria-pressed={isFollowing}
          className={cn(
            "group/follow mt-3.5 flex h-9 w-full items-center justify-center overflow-hidden rounded-lg border font-medium text-sm outline-none",
            "transition-[background-color,border-color,color] duration-200 ease-[cubic-bezier(0.23,1,0.32,1)]",
            "focus-visible:ring-2 focus-visible:ring-neutral-950 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-white dark:focus-visible:ring-offset-neutral-900",
            isFollowing
              ? "border-neutral-200 bg-white text-neutral-900 hover:bg-neutral-50 dark:border-white/[0.1] dark:bg-white/[0.04] dark:text-neutral-100 dark:hover:bg-white/[0.08]"
              : "border-neutral-900 bg-neutral-900 text-white hover:bg-neutral-800 dark:border-neutral-50 dark:bg-neutral-50 dark:text-neutral-900 dark:hover:bg-neutral-200"
          )}
          data-armed={armed}
          onBlur={() => setArmed(true)}
          onClick={toggle}
          onPointerLeave={() => setArmed(true)}
          type="button"
        >
          <FollowLabel isFollowing={isFollowing} reduce={reduce} />
        </button>
        <span aria-live="polite" className="sr-only">
          {announcement}
        </span>
      </div>
    </div>
  );
}
