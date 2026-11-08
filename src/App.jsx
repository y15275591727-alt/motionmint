import { useEffect, useMemo, useRef, useState } from "react";
import { visibleDownloadCount } from "./gallery.js";
import { LEGAL_COPY, TOOL_COPY, UI_COPY } from "./i18n.js";
import {
  Activity,
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock3,
  Copy,
  Crown,
  Download,
  Folder,
  Gift,
  Globe2,
  Home,
  Image as ImageIcon,
  Layers3,
  Loader2,
  LoaderCircle,
  LockKeyhole,
  LogIn,
  LogOut,
  Mail,
  Menu,
  Play,
  Plus,
  RefreshCw,
  ScanFace,
  Settings2,
  Share2,
  SlidersHorizontal,
  Sparkles,
  Star,
  ShieldCheck,
  Upload,
  UserRound,
  Users,
  Video,
  Wallet,
  WandSparkles,
  X,
  Zap
} from "lucide-react";

const TRIAL_WORKFLOWS = new Set(["mix", "motion", "video", "image"]);
const LEGAL_PAGE_IDS = new Set(["privacy", "terms", "community-rules"]);
const POLL_MAX_CONSECUTIVE_FAILURES = 3;
const GENERATION_INPUT_HINTS = new Set([
  "A prompt is required.",
  "Add a character image to continue.",
  "Add a motion or driving video to continue."
]);

function routeFromHash() {
  const hash = window.location.hash;
  if (LEGAL_PAGE_IDS.has(hash.slice(1))) return "legal";
  if (hash.startsWith("#studio")) return "studio";
  if (hash === "#community" || hash.startsWith("#community/")) return "community";
  return "landing";
}

function legalPageFromHash() {
  const page = window.location.hash.slice(1);
  return LEGAL_PAGE_IDS.has(page) ? page : "privacy";
}

function usableSupportEmail(value) {
  const email = String(value || "").trim();
  const [localPart, domain = ""] = email.split("@");
  if (!localPart || !domain || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return "";
  if (/\.(local|localhost|test|invalid|example)$/i.test(domain)) return "";
  if (/^example\./i.test(domain)) return "";
  return email;
}

function deviceId() {
  let id = localStorage.getItem("mm_device_id");
  if (!id) {
    id = `mm_${crypto.randomUUID()}`;
    localStorage.setItem("mm_device_id", id);
  }
  return id;
}

async function apiFetch(path, options = {}) {
  const headers = new Headers(options.headers || {});
  headers.set("x-device-id", deviceId());
  return fetch(path, { ...options, headers, credentials: "include" });
}

async function loadSessionState() {
  const response = await apiFetch("/api/auth/session");
  if (!response.ok) throw new Error("Unable to load account session.");
  return response.json();
}

const TOOL_DEFINITIONS = [
  {
    id: "mix",
    name: "Character Mix",
    short: "Mix",
    icon: Sparkles,
    description: "Put any character into any motion clip.",
    cost: 4,
    mode: "duo",
    imageLabel: "Character image",
    motionLabel: "Motion video",
    badge: "POPULAR"
  },
  {
    id: "motion",
    name: "Motion Control",
    short: "Motion",
    icon: ScanFace,
    description: "Bring a still character to life with a reference performance.",
    cost: 4,
    mode: "duo",
    imageLabel: "Character image",
    motionLabel: "Reference motion"
  },
  {
    id: "remake",
    name: "Scene Remake",
    short: "Remake",
    icon: Layers3,
    description: "Replace a performer while preserving the scene and camera.",
    cost: 12,
    mode: "duo",
    imageLabel: "New character",
    motionLabel: "Driving video"
  },
  {
    id: "video",
    name: "Video Generation",
    short: "Video",
    icon: Video,
    description: "Turn a prompt or reference frame into a cinematic clip.",
    cost: 8,
    mode: "prompt",
    badge: "NEW"
  },
  {
    id: "image",
    name: "Image Generation",
    short: "Image",
    icon: ImageIcon,
    description: "Create high-fidelity character concepts and campaign art.",
    cost: 1,
    mode: "prompt"
  },
  {
    id: "character",
    name: "Character Builder",
    short: "Character",
    icon: UserRound,
    description: "Create a reusable visual identity across every scene.",
    cost: 20,
    mode: "single",
    imageLabel: "Character photo"
  }
];

const COMING_TOOLS = [
  { id: "multitrack", name: "Multi-Track", icon: Layers3 },
  { id: "studio3d", name: "3D Studio", icon: Layers3 },
  { id: "live", name: "Live Swap", icon: Zap }
];

const GALLERY = [
  {
    title: "Midnight Run",
    label: "Motion transfer",
    image: "/images/scene-rave.jpg",
    person: "/images/character-one.jpg",
    video: "/videos/neon-dance-1.mp4"
  },
  {
    title: "Afterglow",
    label: "Character mix",
    image: "/images/scene-urban.jpg",
    person: "/images/hero-portrait.jpg",
    video: "/videos/neon-dance-2.mp4"
  },
  {
    title: "Main Character",
    label: "Image to motion",
    image: "/images/scene-rave.jpg",
    person: "/images/character-two.jpg",
    video: "/videos/mirror-dance.mp4"
  },
  {
    title: "City Signal",
    label: "Video generation",
    image: "/images/scene-urban.jpg",
    person: "/images/hero-dancer.jpg",
    video: "/videos/fashion-pose.mp4"
  },
  {
    title: "Electric Bloom",
    label: "Neon motion",
    image: "/images/editorial-04.jpg",
    person: "/images/editorial-01.jpg",
    video: "/videos/neon-style.mp4"
  },
  {
    title: "After Hours",
    label: "Street performance",
    image: "/images/editorial-08.jpg",
    person: "/images/editorial-03.jpg",
    video: "/videos/street-dance.mp4"
  },
  {
    title: "Double Take",
    label: "Multi-character",
    image: "/images/editorial-07.jpg",
    person: "/images/editorial-06.jpg",
    video: "/videos/duo-motion.mp4"
  },
  {
    title: "New Identity",
    label: "Character generation",
    image: "/images/editorial-05.jpg",
    person: "/images/editorial-07.jpg",
    video: "/videos/fashion-pose.mp4"
  }
];

const GALLERY_TOOLS = ["mix", "mix", "motion", "video", "mix", "video", "motion", "image"];
const GALLERY_STILLS = [
  {
    title: "Chrome Unit",
    label: "3D character study",
    image: "/images/three-d-04.jpg",
    category: "Models"
  },
  {
    title: "Polygon Muse",
    label: "Stylized model",
    image: "/images/stylized-01.jpg",
    category: "Stylized"
  }
];

const GALLERY_CATEGORY_ORDER = ["People", "Models", "Stylized", "Motion"];

function officialGalleryFallback(copy) {
  const samples = GALLERY.map((item, index) => {
    const category = GALLERY_TOOLS[index] === "image" ? "Models" : "People";
    return {
      id: `official-${index + 1}`,
      title: item.title,
      description: item.label,
      category,
      media_type: item.video ? "video" : "image",
      media_url: item.video || item.image,
      poster_url: item.image,
      author: copy.creator,
      prompt: item.label,
      aspect_ratio: "16:9",
      resolution: "1080p",
      model: "MotionMint Auto",
      created_at: Date.UTC(2026, 9, 1 + index),
      downloads: 0,
      likes: 0,
      featured: index < 4 ? 1 : 0
    };
  });
  const stills = GALLERY_STILLS.map((item, index) => ({
    id: `official-still-${index + 1}`,
    title: item.title,
    description: item.label,
    category: item.category,
    media_type: "image",
    media_url: item.image,
    poster_url: item.image,
    author: copy.creator,
    prompt: item.label,
    aspect_ratio: "4:5",
    resolution: "2K",
    model: "MotionMint Auto",
    created_at: Date.UTC(2026, 9, 20 + index),
    downloads: 0,
    likes: 0,
    featured: 0
  }));
  return [...samples, ...stills];
}

function sortOfficialSamples(items) {
  const rank = (category) => {
    const index = GALLERY_CATEGORY_ORDER.indexOf(category);
    return index === -1 ? GALLERY_CATEGORY_ORDER.length : index;
  };
  return [...items].sort(
    (left, right) =>
      rank(left.category) - rank(right.category)
  );
}

const STUDIO_GALLERY = [
  { id: "midnight-run", image: "/images/scene-rave.jpg", video: "/videos/neon-dance-1.mp4", time: "00:13", tall: true },
  { id: "afterglow", image: "/images/editorial-04.jpg", video: "/videos/neon-dance-2.mp4", time: "00:12" },
  { id: "city-signal", image: "/images/scene-urban.jpg", video: "/videos/fashion-pose.mp4", time: "00:08" },
  { id: "chrome-unit", image: "/images/three-d-04.jpg", video: null, time: "IMAGE" }
];

const TEMPLATE_IMAGES = [
  { title: "Editorial Freeze", image: "/images/editorial-01.jpg", tag: "POSE", tool: "motion", uses: "8.2K" },
  { title: "Color Portrait", image: "/images/editorial-02.jpg", tag: "IMAGE", tool: "image", uses: "6.7K" },
  { title: "Hat Trick", image: "/images/editorial-03.jpg", tag: "CHARACTER", tool: "character", uses: "5.1K" },
  { title: "Golden Hour", image: "/images/editorial-04.jpg", tag: "MOTION", tool: "mix", uses: "11.4K" },
  { title: "Night Profile", image: "/images/editorial-05.jpg", tag: "VIDEO", tool: "video", uses: "4.9K" },
  { title: "Runway Frame", image: "/images/editorial-06.jpg", tag: "POSE", tool: "motion", uses: "7.3K" }
];

const MOTION_TEMPLATES = [
  { file: "neon-dance-1.mp4", name: "Neon Drop", poster: "/images/scene-rave.jpg", duration: "13s" },
  { file: "neon-dance-2.mp4", name: "Spotlight", poster: "/images/editorial-04.jpg", duration: "13s" },
  { file: "mirror-dance.mp4", name: "Mirror Step", poster: "/images/scene-urban.jpg", duration: "11s" },
  { file: "street-dance.mp4", name: "Street Cut", poster: "/images/editorial-08.jpg", duration: "11s" }
];

const LANDING_COPY = {
  en: {
    nav: ["Create", "Motion", "Gallery", "Pricing"],
    signIn: "Sign in",
    start: "Create a video",
    heroEyebrow: "THE NEW LANGUAGE OF MOTION",
    heroTitle: "Make anyone move.",
    heroA: "Make anyone",
    heroB: "move.",
    heroText: "Upload a photo and a motion. MotionMint turns them into a video you can share.",
    free: "Try 3 free",
    primary: "Create a video",
    watch: "See how it works",
    proof: "Built for the next generation of creators",
    proofItems: ["3 free creations", "No card required", "Export in minutes"],
    sectionEyebrow: "ONE CREATIVE ENGINE",
    sectionTitle: "From a still image to a story that moves.",
    sectionText:
      "Six connected workflows. One clean studio. Keep characters, motions, prompts, and generated assets together.",
    galleryEyebrow: "OFFICIAL SAMPLES",
    galleryTitle: "Made with a single idea.",
    speedEyebrow: "FAST BY DESIGN",
    speedTitle: "From first upload to first share.",
    pricingEyebrow: "SIMPLE PRICING",
    pricingTitle: "Start free. Scale when the ideas do.",
    growthTitle: "Bring a friend. Keep the momentum.",
    growthText:
      "Win 4 credits when an invited creator completes their first generation. They get 4 too.",
    finalTitle: "Your next character is already waiting.",
    finalText: "Create your first motion for free. Then share it if you want."
  },
  zh: {
    nav: ["创作", "动作", "作品", "定价"],
    signIn: "登录",
    start: "创作视频",
    heroEyebrow: "全新的动态表达方式",
    heroTitle: "让任何人动起来。",
    heroA: "让任何人",
    heroB: "动起来。",
    heroText: "上传一张照片和一段动作，MotionMint 会把它们变成可分享的视频。",
    free: "免费体验 3 次",
    primary: "创作视频",
    watch: "查看制作流程",
    proof: "为下一代创作者打造",
    proofItems: ["3 次免费创作", "无需信用卡", "几分钟内导出"],
    sectionEyebrow: "一体化创作引擎",
    sectionTitle: "从一张静态图片，到会讲故事的视频。",
    sectionText:
      "六个连贯的创作工具，一个简洁的工作台。统一管理角色、动作、提示词和生成素材。",
    galleryEyebrow: "官方示例",
    galleryTitle: "用一个想法，生成一整部作品。",
    speedEyebrow: "为速度而生",
    speedTitle: "从上传素材，到第一次分享。",
    pricingEyebrow: "清晰定价",
    pricingTitle: "先免费开始，灵感增长时再升级。",
    growthTitle: "邀请一位朋友，一起保持创作灵感。",
    growthText: "好友完成首次生成后，你和好友各得 4 积分。",
    finalTitle: "你的下一位主角已经准备好了。",
    finalText: "免费创作第一段动态视频，值得分享就分享。"
  }
};

function localizedTool(tool, lang) {
  return { ...tool, ...TOOL_COPY[lang][tool.id] };
}

function publicModelLabel(model) {
  const label = String(model || "").trim();
  if (!label || /viggle/i.test(label)) return "MotionMint Auto";
  return label.startsWith("MotionMint") ? label : `MotionMint ${label}`;
}

function trialCountLabel(count, copy) {
  const remaining = Math.max(0, Number(count) || 0);
  return `${remaining} ${remaining === 1 ? copy.trialLeft : copy.trialsLeft}`;
}

function mergeLibraryItems(items, item) {
  if (!item?.id) return items;
  const existing = items.find((candidate) => candidate.id === item.id);
  const withoutCurrent = items.filter((candidate) => candidate.id !== item.id);
  return [{ ...existing, ...item }, ...withoutCurrent];
}

function replaceLibraryItem(items, previousId, item) {
  if (!item?.id) return items;
  const withoutPrevious = items.filter(
    (candidate) => candidate.id !== previousId && candidate.id !== item.id
  );
  return [item, ...withoutPrevious];
}

function isActiveJob(item) {
  return item?.status === "queued" || item?.status === "processing";
}

function motionClass(index) {
  return `motion-card motion-card-${index + 1}`;
}

function Brand({ compact = false, name = "MotionMint" }) {
  return (
    <div className={`brand ${compact ? "brand-compact" : ""}`}>
      <span className="brand-mark" aria-hidden="true">
        <svg viewBox="0 0 44 44" role="img">
          <path d="M8 30.5 14.2 12l8 12.2L29.4 9 36 30.5h-7.2l-1.1-7.2-5.1 9.9-6-9.2-2.4 6.5H8Z" />
          <path className="brand-spark" d="m35.5 6.5 1-2.7 1 2.7 2.7 1-2.7 1-1 2.7-1-2.7-2.7-1 2.7-1Z" />
        </svg>
      </span>
      <span className="brand-name">{name}</span>
    </div>
  );
}

function Header({ lang, setLang, onStart, onAuth, compact = false, siteName = "MotionMint", signedIn = false }) {
  const text = LANDING_COPY[lang];
  const copy = UI_COPY[lang].header;
  const [menu, setMenu] = useState(false);
  return (
    <header className={`site-header ${compact ? "site-header-compact" : ""}`}>
      <a className="header-brand" href={compact ? "#studio" : "#top"} aria-label={copy.home}>
        <Brand name={siteName} />
      </a>
      <nav className={`site-nav ${menu ? "is-open" : ""}`} aria-label={copy.navigation}>
        <a href="#tools">{text.nav[0]}</a>
        <a href="#motion">{text.nav[1]}</a>
        <a href="#community">{text.nav[2]}</a>
        <a href="#pricing">{text.nav[3]}</a>
        <button className="site-nav-language" onClick={() => setLang(lang === "en" ? "zh" : "en")}>
          <Globe2 size={16} />
          {lang === "en" ? "中文" : "EN"}
        </button>
      </nav>
      <div className="header-actions">
        <button className="language-button" onClick={() => setLang(lang === "en" ? "zh" : "en")}>
          <Globe2 size={16} />
          {lang === "en" ? "中文" : "EN"}
        </button>
        <button className="text-button desktop-only" onClick={signedIn ? () => onStart() : onAuth}>
          {signedIn ? (lang === "zh" ? "工作台" : "Studio") : text.signIn}
        </button>
        <button className="button button-primary button-small" onClick={() => onStart()}>
          {text.start}
          <ArrowRight size={16} />
        </button>
        <button className="menu-button" aria-label={copy.toggleNavigation} onClick={() => setMenu(!menu)}>
          {menu ? <X size={21} /> : <Menu size={21} />}
        </button>
      </div>
    </header>
  );
}

function Hero({ lang, onStart, siteSettings }) {
  const text = LANDING_COPY[lang];
  const copy = UI_COPY[lang].hero;
  const customTitle = siteSettings?.heroTitle && siteSettings.heroTitle !== "Make anyone move."
    ? siteSettings.heroTitle
    : null;
  return (
    <section className="hero" id="top">
      <div className="hero-grid">
        <div className="hero-copy">
          <div className="eyebrow">
            <span className="live-dot" />
            {text.heroEyebrow}
          </div>
          {customTitle ? (
            <h1><span>{customTitle}</span></h1>
          ) : (
            <h1>
              {text.heroA}
              <br />
              <span>{text.heroB}</span>
            </h1>
          )}
          <p>{text.heroText}</p>
          <div className="hero-actions">
            <button className="button button-primary button-large" onClick={() => onStart()}>
              {copy.primaryCta}
              <ArrowRight size={18} />
            </button>
            <a className="button button-ghost button-large" href="#motion">
              <span className="play-icon">
                <Play size={14} fill="currentColor" />
              </span>
              {text.watch}
            </a>
          </div>
          <div className="hero-proof">
            <strong>{text.proof}</strong>
            <div>
              {text.proofItems.map((item) => (
                <span key={item}>
                  <Check size={14} /> {item}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="hero-stage" aria-label={copy.preview}>
          <div className="hero-orbit orbit-one" />
          <div className="hero-orbit orbit-two" />
          <div className="hero-glow" />
          <div className="hero-main-card">
            <img
              src="/images/character-one.jpg"
              alt={copy.sourceImage}
              aria-label={copy.preview}
            />
            <div className="scan-line" />
            <div className="hero-image-overlay" />
            <span className="stage-badge">
              <span className="status-dot" /> {copy.motionMapped}
            </span>
            <div className="hero-timeline">
              <span />
              <span />
              <span />
              <span />
              <span />
            </div>
          </div>
          <div className="float-card float-source">
            <img src="/images/character-one.jpg" alt={copy.sourceImage} />
            <div>
              <small>{copy.character}</small>
              <strong>{copy.sourceImage}</strong>
            </div>
            <CheckCircle2 size={17} />
          </div>
          <div className="float-card float-motion">
            <img src="/images/scene-rave.jpg" alt={copy.motionReference} />
            <div>
              <small>{copy.motionReference}</small>
              <strong>{copy.festivalDrop}</strong>
            </div>
            <span className="duration">00:08</span>
          </div>
          <div className="float-result">
            <span className="result-icon">
              <WandSparkles size={17} />
            </span>
            <div>
              <small>{copy.readyIn}</small>
              <strong>00:42</strong>
            </div>
            <span className="ready-chip">HD</span>
          </div>
          <div className="particle particle-one" />
          <div className="particle particle-two" />
          <div className="particle particle-three" />
        </div>
      </div>
      <div className="hero-scroll">
        <span>{copy.scroll}</span>
        <span className="scroll-line" />
      </div>
    </section>
  );
}

function ToolBento({ lang, onOpenTool }) {
  const text = LANDING_COPY[lang];
  const copy = UI_COPY[lang].bento;
  const videoTool = TOOL_COPY[lang].video;
  const motionTool = TOOL_COPY[lang].motion;
  const imageTool = TOOL_COPY[lang].image;
  return (
    <section className="section tools-section" id="tools">
      <div className="section-heading">
        <div>
          <div className="eyebrow">{text.sectionEyebrow}</div>
          <h2>{text.sectionTitle}</h2>
        </div>
        <p>{text.sectionText}</p>
      </div>
      <div className="tool-bento">
        <button className="tool-bento-card bento-main" onClick={() => onOpenTool("mix")}>
          <div className="bento-copy">
            <span className="mini-chip">{copy.flagship}</span>
            <h3>{copy.mixTitle}</h3>
            <p>{copy.mixText}</p>
            <span className="card-link">{copy.openStudio} <ArrowRight size={16} /></span>
          </div>
          <div className="bento-visual duo-visual">
            <div className="duo-tile">
              <img src="/images/character-one.jpg" alt="" />
              <small>{copy.who}</small>
            </div>
            <div className="plus-orbit"><Plus size={17} /></div>
            <div className="duo-tile warm">
              <img src="/images/scene-rave.jpg" alt="" />
              <small>{copy.move}</small>
            </div>
            <div className="equals-orbit"><ArrowRight size={17} /></div>
            <div className="duo-result">
              <img src="/images/character-one.jpg" alt={copy.motion} />
              <div className="video-pill"><Play size={11} fill="currentColor" /> {copy.motion}</div>
            </div>
          </div>
        </button>

        <button className="tool-bento-card bento-video" aria-label={videoTool.name} onClick={() => onOpenTool("video")}>
          <span className="mini-chip">{copy.generate}</span>
          <h3>{copy.generateTitleA}<br />{copy.generateTitleB}</h3>
          <div className="prompt-demo">
            <Sparkles size={17} />
            <span>{copy.promptDemo}</span>
            <span className="prompt-cursor" />
          </div>
          <div className="video-thumb">
            <video src="/videos/rolling-dance.mp4" poster="/images/scene-urban.jpg" autoPlay muted loop playsInline preload="metadata" />
            <button className="round-play" aria-hidden="true"><Play size={14} fill="currentColor" /></button>
          </div>
        </button>

        <button className="tool-bento-card bento-motion" aria-label={motionTool.name} onClick={() => onOpenTool("motion")}>
          <span className="mini-chip">{copy.motionLabel}</span>
          <h3>{copy.motionTitleA}<br />{copy.motionTitleB}</h3>
          <div className="skeleton-wrap">
            <img src="/images/hero-portrait.jpg" alt="" />
            <span className="joint j1" />
            <span className="joint j2" />
            <span className="joint j3" />
            <span className="joint j4" />
            <svg viewBox="0 0 200 120" aria-hidden="true">
              <path d="M50 74 C72 35, 121 20, 154 53" />
              <path d="M55 78 C87 91, 117 92, 151 62" />
            </svg>
          </div>
        </button>

        <button className="tool-bento-card bento-image" aria-label={imageTool.name} onClick={() => onOpenTool("image")}>
          <span className="mini-chip">{copy.imagine}</span>
          <h3>{copy.imageTitleA}<br />{copy.imageTitleB}</h3>
          <div className="image-stack">
            <img src="/images/character-two.jpg" alt="" />
            <img src="/images/hero-portrait.jpg" alt="" />
            <img src="/images/character-one.jpg" alt="" />
          </div>
        </button>
      </div>
    </section>
  );
}

function MotionShowcase({ lang }) {
  const [position, setPosition] = useState(54);
  const text = LANDING_COPY[lang];
  const copy = UI_COPY[lang].showcase;
  const heroCopy = UI_COPY[lang].hero;
  return (
    <section className="section motion-section" id="motion">
      <div className="showcase-grid">
        <div className="showcase-copy">
          <div className="eyebrow">{text.speedEyebrow}</div>
          <h2>{text.speedTitle}</h2>
          <p>{copy.description}</p>
          <div className="feature-checks">
            <span><CheckCircle2 size={18} /> {copy.identity}</span>
            <span><CheckCircle2 size={18} /> {copy.compositing}</span>
            <span><CheckCircle2 size={18} /> {copy.export}</span>
          </div>
        </div>
        <div className="compare-shell">
          <div className="compare-label compare-before">{copy.original}</div>
          <img className="compare-base" src="/images/character-two.jpg" alt={heroCopy.compareAlt} />
          <div className="compare-after" style={{ clipPath: `inset(0 0 0 ${position}%)` }}>
            <img src="/images/hero-dancer.jpg" alt={heroCopy.resultAlt} />
            <span className="result-watermark">MOTIONMINT</span>
          </div>
          <div className="compare-line" style={{ left: `${position}%` }}>
            <span><ArrowRight size={15} /><ArrowLeft size={15} /></span>
          </div>
          <input
            aria-label={copy.range}
            className="compare-range"
            type="range"
            min="5"
            max="95"
            value={position}
            onChange={(event) => setPosition(Number(event.target.value))}
          />
          <div className="compare-label compare-after-label">MOTIONMINT</div>
          <div className="compare-caption">
            <span>{copy.sourcePortrait}</span>
            <span>{copy.referencePerformance}</span>
            <strong>{copy.finalMotion}</strong>
          </div>
        </div>
      </div>
    </section>
  );
}

function Gallery({ lang }) {
  const text = LANDING_COPY[lang];
  const copy = UI_COPY[lang].gallery;
  const communityCopy = UI_COPY[lang].community;
  const [items, setItems] = useState(null);
  useEffect(() => {
    apiFetch("/api/public/gallery")
      .then((response) => response.json())
      .then((payload) => setItems(payload.items || []))
      .catch(() => setItems([]));
  }, []);
  const fallbackItems = useMemo(() => officialGalleryFallback(communityCopy), [communityCopy]);
  const displayItems = useMemo(() => {
    const people = sortOfficialSamples(items?.length ? items : fallbackItems)
      .filter((item) => item.category === "People");
    return (people.length ? people : sortOfficialSamples(fallbackItems).filter((item) => item.category === "People"))
      .slice(0, 8);
  }, [fallbackItems, items]);
  return (
    <section className="section gallery-section" id="gallery">
      <div className="section-row">
        <div>
          <div className="eyebrow">{text.galleryEyebrow}</div>
          <h2>{text.galleryTitle}</h2>
        </div>
        <a className="button button-ghost button-small" href="#community">
          {copy.explore} <ArrowRight size={15} />
        </a>
      </div>
      <div className="gallery-grid">
        {displayItems.map((item, index) => (
          <a className={motionClass(index)} href={`#community/${item.id}`} key={item.id}>
            {item.media_type === "video" ? (
              <video
                className="gallery-scene"
                src={item.media_url}
                poster={item.poster_url}
                aria-label={`${item.title} ${copy.livePreview}`}
                autoPlay
                muted
                loop
                playsInline
                preload="metadata"
              />
            ) : (
              <img className="gallery-scene" src={item.media_url} alt={item.title} />
            )}
            <div className="gallery-shade" />
            <span className="gallery-live">
              <span /> {item.media_type === "video" ? copy.livePreview : copy.image}
            </span>
            <div className="gallery-meta">
              <span>{copy.categories[item.category] || item.category}</span>
              <h3>{item.title}</h3>
              <small className="gallery-author">{item.author}</small>
            </div>
            <span className="gallery-play"><Play size={14} fill="currentColor" /></span>
            <span className="gallery-number">0{index + 1}</span>
          </a>
        ))}
      </div>
    </section>
  );
}

function TemplateRail({ lang, onOpenTool }) {
  const copy = UI_COPY[lang].templates;
  return (
    <section className="template-section">
      <div className="template-head">
        <div>
          <span className="eyebrow">{copy.eyebrow}</span>
          <h2>{copy.titleA}<br />{copy.titleB}</h2>
        </div>
        <p>{copy.description}</p>
      </div>
      <div className="template-rail">
        {TEMPLATE_IMAGES.map((item, index) => (
          <button className="template-card" key={item.title} onClick={() => onOpenTool(item.tool)}>
            <img src={item.image} alt="" />
            <span className="template-index">0{index + 1}</span>
            <span className="template-tag">{copy.tags[item.tag]}</span>
            <span className="template-meta">
              <strong>{copy.titles[item.title]}</strong>
              <small>{item.uses} {copy.uses}</small>
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}

function CommunityGallery({ lang, setLang, onStart, onUseInMix, siteSettings, initialItemId }) {
  const copy = UI_COPY[lang].community;
  const [items, setItems] = useState(null);
  const [filter, setFilter] = useState("People");
  const [selected, setSelected] = useState(null);
  const [notice, setNotice] = useState("");
  const fallbackItems = useMemo(() => officialGalleryFallback(copy), [copy]);
  const galleryItems = useMemo(
    () => sortOfficialSamples(items?.length ? items : fallbackItems),
    [fallbackItems, items]
  );

  useEffect(() => {
    apiFetch("/api/public/gallery")
      .then((response) => response.json())
      .then((payload) => setItems(payload.items || []))
      .catch(() => setItems([]));
  }, []);

  useEffect(() => {
    if (initialItemId && galleryItems.length) {
      setSelected(galleryItems.find((item) => item.id === initialItemId) || null);
    }
  }, [initialItemId, galleryItems]);

  const categories = ["All", "People", "Models", "Stylized", "Motion"];
  const visible = filter === "All" ? galleryItems : galleryItems.filter((item) => item.category === filter);

  async function download(item) {
    try {
      const response = await apiFetch(`/api/public/gallery/${item.id}/download`, { method: "POST" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || copy.downloadUnavailable);
      const link = document.createElement("a");
      link.href = payload.url;
      link.download = payload.filename;
      link.target = "_blank";
      link.click();
      setNotice(copy.downloadSuccess);
    } catch (error) {
      setNotice(error.message);
    }
  }

  return (
    <div className="community-shell">
      <Header lang={lang} setLang={setLang} onStart={onStart} onAuth={onStart} siteName={siteSettings?.siteName} />
      <main className="community-main">
        <div className="community-hero">
          <div>
            <span className="eyebrow">{copy.eyebrow}</span>
            <h1>{copy.title}<br /><span>{copy.titleAccent}</span></h1>
          </div>
          <p>{copy.description}</p>
        </div>
        <div className="community-filter">
          {categories.map((category) => (
            <button className={filter === category ? "active" : ""} key={category} onClick={() => setFilter(category)}>
              {category === "All" ? copy.all : copy.categories[category]}
              <span>{category === "All" ? galleryItems.length : galleryItems.filter((item) => item.category === category).length}</span>
            </button>
          ))}
        </div>
        <div className="community-grid">
          {visible.map((item, index) => {
            const downloadCount = visibleDownloadCount(item.downloads);
            return (
              <button
                className={`community-card community-card-${(index % 4) + 1}`}
                key={item.id}
                onClick={() => setSelected(item)}
              >
                {item.media_type === "video" ? (
                  <video src={item.media_url} poster={item.poster_url} muted loop playsInline autoPlay preload="metadata" />
                ) : (
                  <img src={item.media_url} alt={item.title} />
                )}
                <span className="community-shade" />
                <span className="community-type">
                  {item.media_type === "video" ? <Play size={10} fill="currentColor" /> : <ImageIcon size={10} />}
                  {item.media_type === "video" ? copy.video : copy.image}
                </span>
                {item.featured === 1 && <span className="community-featured">{copy.featured}</span>}
                <span className="community-official">{copy.official}</span>
                <span className="community-card-copy">
                  <small>{copy.categories[item.category] || item.category}</small>
                  <strong>{item.title}</strong>
                  <span>{item.author}</span>
                </span>
                {downloadCount !== null && (
                  <span className="community-downloads"><Download size={11} /> {downloadCount}</span>
                )}
              </button>
            );
          })}
        </div>
        {visible.length === 0 && (
          <div className="collection-empty">
            <strong>{copy.emptyTitle}</strong>
            <p>{copy.emptyText}</p>
            <button className="button button-primary button-small" onClick={() => onStart("mix")}>
              {UI_COPY[lang].footer.action}
              <ArrowRight size={15} />
            </button>
          </div>
        )}
      </main>
      {selected && (
        <div className="community-viewer" onMouseDown={() => setSelected(null)}>
          <div className="community-viewer-inner" onMouseDown={(event) => event.stopPropagation()}>
            <button className="modal-close" onClick={() => setSelected(null)} aria-label={copy.close}><X size={18} /></button>
            <div className="community-viewer-media">
              {selected.media_type === "video" ? (
                <video src={selected.media_url} poster={selected.poster_url} autoPlay muted loop playsInline />
              ) : (
                <img src={selected.media_url} alt={selected.title} />
              )}
            </div>
            <aside className="community-detail">
              <span className="community-avatar">{selected.author.slice(0, 1)}</span>
              <strong>{selected.author}</strong>
              <span className="community-creator-label">{copy.creator}</span>
              <div className="community-detail-actions">
                <button onClick={() => download(selected)}><Download size={16} /> {copy.download}</button>
                <button onClick={() => navigator.clipboard?.writeText(selected.prompt)}><Copy size={16} /> {copy.prompt}</button>
                <button onClick={() => onUseInMix(selected)}><WandSparkles size={16} /> {copy.useInMix}</button>
              </div>
              <dl>
                <dt>{copy.taskType}</dt><dd>{copy.categories[selected.category] || selected.category}</dd>
                <dt>{copy.aspectRatio}</dt><dd>{selected.aspect_ratio}</dd>
                <dt>{copy.resolution}</dt><dd>{selected.resolution}</dd>
                <dt>{copy.promptLabel}</dt><dd className="community-prompt">{selected.prompt}</dd>
                <dt>{copy.created}</dt><dd>{new Date(Number(selected.created_at)).toLocaleDateString(lang === "zh" ? "zh-CN" : "en")}</dd>
                <dt>{copy.model}</dt><dd>{publicModelLabel(selected.model)}</dd>
              </dl>
            </aside>
          </div>
        </div>
      )}
      {notice && <Toast message={notice} />}
    </div>
  );
}

function Pricing({ lang, onStart, onCheckout }) {
  const text = LANDING_COPY[lang];
  const copy = UI_COPY[lang].pricing;
  const plans = copy.plans;

  return (
    <section className="section pricing-section" id="pricing">
      <div className="pricing-head">
        <div>
          <div className="eyebrow">{text.pricingEyebrow}</div>
          <h2>{text.pricingTitle}</h2>
        </div>
      </div>
      <div className="pricing-grid">
        {plans.map((plan) => (
          <article className={`price-card ${plan.featured ? "featured" : ""}`} key={plan.name}>
            {plan.featured && <span className="popular-label">{copy.popular}</span>}
            <div className="price-card-top">
              <h3>{plan.name}</h3>
              <p>{plan.description}</p>
            </div>
            <div className="price-line">
              <strong>{plan.price}</strong>
              <span>{plan.suffix}</span>
            </div>
            <div className="plan-credits">
              <Zap size={16} />
              {plan.credits}
            </div>
            <ul>
              {plan.features.map((feature) => <li key={feature}><Check size={15} /> {feature}</li>)}
            </ul>
            <button
              className={`button ${plan.featured ? "button-primary" : "button-outline"} button-block`}
              onClick={() => plan.id === "free" ? onStart() : onCheckout(plan.id)}
            >
              {plan.action}
              <ArrowRight size={16} />
            </button>
          </article>
        ))}
      </div>
      <p className="pricing-note">
        {copy.noteBefore} <button onClick={() => onCheckout("pack100")}>{copy.creditPack}</button> — {copy.noteAfter}
      </p>
    </section>
  );
}

function Growth({ lang, onStart }) {
  const copy = UI_COPY[lang].growth;
  return (
    <section className="growth-band">
      <div className="growth-icon"><Gift size={28} /></div>
      <div>
        <h2>{copy.title}</h2>
        <p>{copy.text}</p>
      </div>
      <button className="button button-dark" onClick={() => onStart()}>
        {copy.action} <Share2 size={16} />
      </button>
    </section>
  );
}

function FAQ({ lang }) {
  const copy = UI_COPY[lang].faq;
  return (
    <section className="section faq-section">
      <div className="faq-title">
        <span>{copy.label}</span>
        <h2>{copy.titleA}<br />{copy.titleB}</h2>
      </div>
      <div className="faq-list">
        {copy.items.map(([question, answer]) => (
          <details key={question}>
            <summary>{question}<Plus size={19} /></summary>
            <p>{answer}</p>
          </details>
        ))}
      </div>
    </section>
  );
}

function LegalPage({ lang, setLang, page }) {
  const copy = LEGAL_COPY[lang];
  const content = copy.pages[page] || copy.pages.privacy;
  return (
    <div className="site-shell legal-shell">
      <header className="site-header">
        <a className="header-brand" href="#top" aria-label={copy.backHome}>
          <Brand />
        </a>
        <div className="header-actions">
          <button className="language-button" onClick={() => setLang(lang === "en" ? "zh" : "en")}>
            <Globe2 size={16} />
            {lang === "en" ? "中文" : "EN"}
          </button>
          <a className="button button-outline button-small" href="#top">
            <ArrowLeft size={16} />
            {copy.backHome}
          </a>
        </div>
      </header>
      <main className="legal-page">
        <span className="eyebrow">{copy.eyebrow}</span>
        <h1>{content.title}</h1>
        <p className="legal-intro">{content.intro}</p>
        <span className="legal-date">{copy.effective}</span>
        <div className="legal-sections">
          {content.sections.map((section) => (
            <section key={section.title}>
              <h2>{section.title}</h2>
              <div className="legal-copy">
                {section.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
              </div>
            </section>
          ))}
        </div>
      </main>
      <footer className="legal-footer">
        <span>{copy.copyright}</span>
        <nav aria-label={copy.legalNavigation}>
          <a href="#privacy">{copy.pages.privacy.title}</a>
          <a href="#terms">{copy.pages.terms.title}</a>
          <a href="#community-rules">{copy.pages["community-rules"].title}</a>
        </nav>
      </footer>
    </div>
  );
}

function Footer({ lang, onStart, siteSettings }) {
  const copy = UI_COPY[lang].footer;
  const legalCopy = LEGAL_COPY[lang];
  const tools = TOOL_COPY[lang];
  const landing = LANDING_COPY[lang];
  const supportEmail = usableSupportEmail(siteSettings?.supportEmail);
  return (
    <footer className="site-footer">
      <div className="final-cta">
        <div className="cta-orb orb-left" />
        <div className="cta-orb orb-right" />
        <span className="eyebrow">{copy.turn}</span>
        <h2>{landing.finalTitle}</h2>
        <p>{landing.finalText}</p>
        <button className="button button-primary button-large" onClick={() => onStart()}>
          {copy.action} <ArrowRight size={18} />
        </button>
      </div>
      <div className="footer-main">
        <div className="footer-brand">
          <Brand />
          <p>{copy.brandText}</p>
        </div>
        <div className="footer-links footer-links-compact">
          <div>
            <strong>{copy.product}</strong>
            <a href="#tools">{tools.mix.name}</a>
            <a href="#tools">{tools.motion.name}</a>
            <a href="#tools">{tools.video.name}</a>
            <a href="#pricing">{landing.nav[3]}</a>
          </div>
          <div>
            <strong>{copy.company}</strong>
            <a href="#community">{copy.showcase}</a>
            {supportEmail && <a href={`mailto:${supportEmail}`}>{copy.support}</a>}
          </div>
        </div>
      </div>
      <div className="footer-bottom">
        <span>{copy.copyright}</span>
        <nav className="footer-legal" aria-label={legalCopy.legalNavigation}>
          <a href="#privacy">{legalCopy.pages.privacy.title}</a>
          <span aria-hidden="true">·</span>
          <a href="#terms">{legalCopy.pages.terms.title}</a>
          <span aria-hidden="true">·</span>
          <a href="#community-rules">{legalCopy.pages["community-rules"].title}</a>
        </nav>
      </div>
    </footer>
  );
}

function Landing({ lang, setLang, onStart, onAuth, onCheckout, toast, siteSettings, signedIn }) {
  return (
    <div className="site-shell">
      <Header lang={lang} setLang={setLang} onStart={onStart} onAuth={onAuth} siteName={siteSettings?.siteName} signedIn={signedIn} />
      <Hero lang={lang} onStart={onStart} siteSettings={siteSettings} />
      <ToolBento lang={lang} onOpenTool={onStart} />
      <MotionShowcase lang={lang} />
      <Gallery lang={lang} />
      <TemplateRail lang={lang} onOpenTool={onStart} />
      <Pricing lang={lang} onStart={onStart} onCheckout={onCheckout} />
      <Growth lang={lang} onStart={onStart} />
      <FAQ lang={lang} />
      <Footer lang={lang} onStart={onStart} siteSettings={siteSettings} />
      {toast && <Toast message={toast} />}
    </div>
  );
}

function Dropzone({ label, accept, file, preview, onChange, className = "", copy }) {
  const inputRef = useRef(null);
  return (
    <button
      type="button"
      className={`dropzone ${file ? "has-file" : ""} ${className}`}
      onClick={() => inputRef.current?.click()}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={(event) => onChange(event.target.files?.[0] || null)}
      />
      {preview ? (
        <>
          {accept.includes("video") ? (
            <video src={preview} muted loop autoPlay playsInline />
          ) : (
            <img src={preview} alt="" />
          )}
          <span className="dropzone-file">
            <CheckCircle2 size={16} />
            <span>{file.name}</span>
            <small>{copy.dropzone.replace}</small>
          </span>
        </>
      ) : (
        <>
          <span className="dropzone-icon">{accept.includes("video") ? <Video size={22} /> : <Upload size={22} />}</span>
          <strong>{label}</strong>
          <small>{copy.dropzone.upload}</small>
          <span className="mini-button"><Plus size={14} /> {copy.dropzone.add}</span>
        </>
      )}
    </button>
  );
}

function ProgressPanel({ tool, progress, stage, copy }) {
  const messages = {
    analyzing: copy.analyzing,
    rendering: copy.rendering,
    finishing: copy.finishing
  };
  return (
    <div className="job-progress">
      <div className="progress-preview">
        <img src={tool.id === "image" ? "/images/hero-portrait.jpg" : "/images/scene-rave.jpg"} alt="" />
        <div className="progress-grid" />
        <div className="progress-scan" />
        <div className="progress-center">
          <LoaderCircle className="spin" size={28} />
          <strong>{progress}%</strong>
        </div>
      </div>
      <div className="progress-text">
        <span className="live-dot" />
        <div>
          <strong>{messages[stage] || copy.preparing}</strong>
          <p>{copy.keepOpen}</p>
        </div>
      </div>
      <div className="progress-bar"><span style={{ width: `${progress}%` }} /></div>
    </div>
  );
}

function ResultPanel({ tool, result, onDownload, onShare, showWatermark, copy }) {
  const videoUrl = result?.video_url || "";
  const image = result?.images?.[0];
  const poster = result?.poster || image?.url || "/images/scene-rave.jpg";
  const dimensions = image?.width && image?.height ? `${image.width}×${image.height}` : videoUrl ? "1080p" : "HD";
  return (
    <div className="result-panel">
      <div className="result-media">
        {videoUrl ? (
          <video
            src={videoUrl}
            poster={result?.poster || undefined}
            aria-label={`${tool.name} result`}
            controls
            autoPlay
            muted
            loop
            playsInline
          />
        ) : (
          <img src={poster} alt={`${tool.name} result`} />
        )}
        <div className="result-vignette" />
        <span className="result-badge"><CheckCircle2 size={14} /> {copy.renderComplete}</span>
        {showWatermark && <span className="result-brand">MOTIONMINT</span>}
        <div className="result-toolbar">
          {videoUrl && <span><Clock3 size={13} /> {copy.video}</span>}
          <span>{dimensions}</span>
          <span>16:9</span>
        </div>
      </div>
      <div className="result-actions">
        <div>
          <strong>{tool.name} {copy.ready}</strong>
          <p>{copy.saved}</p>
        </div>
        <button className="icon-action" onClick={onShare} aria-label={copy.share}><Share2 size={17} /></button>
        <button className="button button-primary button-small" onClick={onDownload}>
          <Download size={16} /> {copy.export}
        </button>
      </div>
    </div>
  );
}

function StudioSidebar({ lang, activeTool, setActiveTool, credits, trialRemaining, trialEligible, onExit, onOpenLibrary, onInvite, onUpgrade }) {
  const copy = UI_COPY[lang].studio;
  const comingLabels = lang === "zh"
    ? { multitrack: "多轨编辑", studio3d: "3D 工作台", live: "实时换角" }
    : { multitrack: "Multi-Track", studio3d: "3D Studio", live: "Live Swap" };
  return (
    <aside className="studio-sidebar">
      <div className="studio-brand-row">
        <a href="#top" className="studio-brand" aria-label={copy.backWebsite}><Brand compact /></a>
        <button className="sidebar-collapse" onClick={onExit} title={copy.backWebsite}><ArrowLeft size={18} /></button>
      </div>
      <nav className="studio-nav">
        <div className="nav-section">
          <span className="nav-label">{copy.workspace}</span>
          <button className="studio-nav-item" onClick={onExit}><Home size={17} /> {copy.home}</button>
          <button className="studio-nav-item" onClick={onOpenLibrary}><Folder size={17} /> {copy.library}</button>
        </div>
        <div className="nav-section">
          <span className="nav-label">{copy.create}</span>
          {TOOL_DEFINITIONS.map((tool) => {
            const Icon = tool.icon;
            const localized = TOOL_COPY[lang][tool.id];
            return (
              <button
                className={`studio-nav-item ${activeTool.id === tool.id ? "active" : ""}`}
                key={tool.id}
                onClick={() => setActiveTool(tool)}
              >
                <Icon size={17} />
                {localized.name}
                {localized.badge && <span className="nav-new">{localized.badge}</span>}
              </button>
            );
          })}
        </div>
        <div className="nav-section nav-section-next">
          <span className="nav-label">{copy.next}</span>
          {COMING_TOOLS.map((tool) => {
            const Icon = tool.icon;
            return (
              <button className="studio-nav-item muted" key={tool.id}>
                <Icon size={17} /> {comingLabels[tool.id]} <span className="soon">{copy.soon}</span>
              </button>
            );
          })}
        </div>
      </nav>
      <div className="sidebar-bottom">
        <div className="credits-card">
          <div>
            <span>{trialEligible ? copy.freeRenders : copy.availableCredits}</span>
            <strong>
              {trialEligible
                ? <><Sparkles size={16} /> {trialCountLabel(trialRemaining, copy)}</>
                : <><Zap size={16} fill="currentColor" /> {credits}</>}
            </strong>
          </div>
          <button onClick={onUpgrade}>{copy.upgrade}</button>
          <small>{trialEligible ? copy.freeRendersNote : copy.creditsPerRender}</small>
        </div>
        <button className="invite-card" onClick={onInvite}>
          <span className="invite-icon"><Gift size={17} /></span>
          <span><strong>{copy.inviteFriend}</strong><small>{copy.inviteReward}</small></span>
          <ChevronRight size={16} />
        </button>
      </div>
    </aside>
  );
}

function StudioHeader({ lang, setLang, mode, session, onAuth, onLogout }) {
  const copy = UI_COPY[lang].studio;
  const initials = session?.user?.displayName
    ? session.user.displayName.slice(0, 2).toUpperCase()
    : "G";
  return (
    <div className="studio-topbar">
      <div className="mobile-studio-brand"><UserRound size={18} /><span>Studio</span></div>
      <div className="topbar-spacer" />
      <span className={`api-state ${mode === "live" || mode === "viggle" ? "live" : ""}`}>
        <span /> {mode === "live" || mode === "viggle" ? copy.liveApi : copy.demoWorkspace}
      </span>
      <button className="language-button" onClick={() => setLang(lang === "en" ? "zh" : "en")}>
        <Globe2 size={16} /> {lang === "en" ? "中文" : "EN"}
      </button>
      {session?.user ? (
        <button className="topbar-avatar" title={session.user.email || session.user.wallet} onClick={onLogout}>
          {initials}
        </button>
      ) : (
        <button className="topbar-signin" onClick={onAuth}><UserRound size={15} /> {copy.signIn}</button>
      )}
    </div>
  );
}

function CreatorPanel({ lang, tool, files, setFile, form, setForm, onGenerate, onUseSample, loading, credits, trialRemaining }) {
  const copy = UI_COPY[lang].studio;
  const [settingsOpen, setSettingsOpen] = useState(false);
  useEffect(() => {
    setSettingsOpen(false);
  }, [tool.id]);
  const hasRequiredFile = tool.mode === "prompt" || files.image;
  const promptRequired = tool.mode === "prompt" && !form.prompt.trim();
  const motionReady = Boolean(files.motion || form.templateMotion);
  const needed = tool.mode === "duo" ? files.image && motionReady : hasRequiredFile;
  const trialWorkflow = TRIAL_WORKFLOWS.has(tool.id);
  const trialEligible = trialRemaining > 0 && trialWorkflow;
  const canAfford = trialEligible || credits >= tool.cost;
  const canGenerate = !loading && (needed || tool.mode === "prompt") && !promptRequired && canAfford;
  const missingAssetsMessage = tool.mode === "duo"
    ? !files.image && motionReady
      ? copy.mixAssetsMissing
      : !files.image ? copy.characterMissing : copy.motionMissing
    : copy.assetsMissing;
  const isSceneRemake = tool.id === "remake";
  const durationOptions = [
    ["5 sec", copy.durations.five],
    ["10 sec", copy.durations.ten],
    ["15 sec", copy.durations.fifteen]
  ];

  return (
    <section className="creator-panel">
      <div className="creator-panel-head">
        <div>
          <span className="panel-kicker"><WandSparkles size={14} /> {copy.createKicker}</span>
          <h1>{tool.name}</h1>
          <p>{tool.description}</p>
        </div>
        <span className="cost-chip">
          {trialEligible ? <Sparkles size={13} /> : <Zap size={13} fill="currentColor" />}
          {trialEligible ? trialCountLabel(trialRemaining, copy) : `${tool.cost} ${copy.credits}`}
        </span>
      </div>

      {tool.mode === "duo" && (
        <div className="duo-upload">
          <Dropzone
            label={tool.imageLabel}
            accept="image/*"
            file={files.image}
            preview={files.imagePreview}
            onChange={(file) => setFile("image", file)}
            copy={copy}
          />
          <span className="upload-join"><Plus size={15} /></span>
          <Dropzone
            label={copy.motionDropHint}
            accept="video/*"
            file={files.motion}
            preview={files.motionPreview}
            onChange={(file) => {
              setFile("motion", file);
              if (file) setForm({ ...form, templateMotion: "" });
            }}
            copy={copy}
          />
        </div>
      )}

      {tool.mode === "single" && (
        <Dropzone
          label={tool.imageLabel}
          accept="image/*"
          file={files.image}
          preview={files.imagePreview}
          onChange={(file) => setFile("image", file)}
          className="dropzone-wide"
          copy={copy}
        />
      )}

      {tool.mode !== "prompt" && (
        <button type="button" className="sample-assets" onClick={onUseSample}>
          <Play size={13} fill="currentColor" />
          {copy.demoAssets}
          <span>{copy.demoAssetsNote}</span>
        </button>
      )}

      {tool.mode === "duo" && (
        <div className="motion-template-picker">
          <div className="motion-template-head">
            <span>{copy.trendingMotion}</span>
            <small>{files.motion || form.templateMotion ? copy.motionSelected : copy.motionChoose}</small>
          </div>
          <div className="motion-template-grid">
            {MOTION_TEMPLATES.map((template) => (
              <button
                type="button"
                className={!files.motion && form.templateMotion === template.file ? "active" : ""}
                key={template.file}
                onClick={() => {
                  setFile("motion", null);
                  setForm({ ...form, templateMotion: template.file });
                }}
              >
                <video src={`/videos/${template.file}`} poster={template.poster} autoPlay muted loop playsInline preload="metadata" />
                <span>{copy.templateNames[template.name]}</span>
                <small>{template.duration}</small>
              </button>
            ))}
          </div>
        </div>
      )}

      {tool.mode === "prompt" && (
        <>
          <Dropzone
            label={copy.referenceFrame}
            accept="image/*"
            file={files.reference}
            preview={files.referencePreview}
            onChange={(file) => setFile("reference", file)}
            className="dropzone-wide dropzone-compact"
            copy={copy}
          />
          <div className="prompt-shell">
            <div className="prompt-head">
              <span>{copy.describeVision}</span>
              <span>{form.prompt.length} / 4000</span>
            </div>
            <textarea
              value={form.prompt}
              maxLength={4000}
              onChange={(event) => setForm({ ...form, prompt: event.target.value })}
              placeholder={
                tool.id === "image"
                  ? copy.imagePrompt
                  : copy.videoPrompt
              }
            />
            <button
              className="prompt-magic"
              onClick={() => setForm({ ...form, prompt: tool.id === "image"
                ? copy.imageSurprise
                : copy.videoSurprise})}
            >
              <Sparkles size={14} /> {copy.surprise}
            </button>
          </div>
        </>
      )}

      <div className={`settings-block ${settingsOpen ? "is-open" : ""}`}>
        <button
          type="button"
          className="settings-head"
          aria-expanded={settingsOpen}
          onClick={() => setSettingsOpen((open) => !open)}
        >
          <span><SlidersHorizontal size={15} /> {copy.settings}</span>
          <ChevronDown className={settingsOpen ? "is-open" : ""} size={15} />
        </button>
        {settingsOpen && <div className="settings-grid">
          <label>
            <span>{copy.model}</span>
            <select value={form.model} onChange={(event) => setForm({ ...form, model: event.target.value })}>
              <option value="MotionMint Auto">{copy.models.auto}</option>
              <option value="MotionMint Motion">{copy.models.motion}</option>
              <option value="MotionMint Motion Pro">{copy.models.motionPro}</option>
            </select>
          </label>
          <label>
            <span>{copy.aspect}</span>
            <select value={form.aspect} onChange={(event) => setForm({ ...form, aspect: event.target.value })}>
              <option>16:9</option>
              <option>9:16</option>
              <option>1:1</option>
            </select>
          </label>
          <label>
            <span>{tool.mode === "prompt" ? copy.duration : copy.background}</span>
            <select
              value={tool.mode === "prompt" ? form.duration : form.background}
              onChange={(event) => setForm({
                ...form,
                [tool.mode === "prompt" ? "duration" : "background"]: event.target.value
              })}
            >
              {tool.mode === "prompt" ? (
                durationOptions.map(([value, label]) => <option value={value} key={value}>{label}</option>)
              ) : (
                [
                  ["Original scene", copy.originalScene],
                  ["Solid color", copy.solidColor],
                  ["Transparent", copy.transparent]
                ].map(([value, label]) => <option value={value} key={value}>{label}</option>)
              )}
            </select>
          </label>
          <label>
            <span>{copy.output}</span>
            <select
              value={tool.id === "image" ? (form.resolution === "2K" ? "2K" : "1K") : form.resolution}
              onChange={(event) => setForm({ ...form, resolution: event.target.value })}
            >
              {(tool.id === "image" ? ["1K", "2K"] : ["1080p", "2K", "4K"]).map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </label>
        </div>}
      </div>

      <div className="priority-row">
        <div>
          <span className="priority-icon"><Zap size={16} /></span>
          <span><strong>{copy.priority}</strong><small>{copy.priorityNote}</small></span>
        </div>
        <button
          type="button"
          className={`toggle ${form.priority ? "active" : ""}`}
          aria-pressed={form.priority}
          aria-label={copy.priority}
          onClick={() => setForm({ ...form, priority: !form.priority })}
        >
          <span />
        </button>
      </div>

      <button className="generate-button" onClick={onGenerate} disabled={!canGenerate}>
        {loading ? <LoaderCircle className="spin" size={18} /> : <Sparkles size={18} />}
        {loading ? copy.generating : trialEligible ? copy.generateFree : copy.generate}
        {!loading && <span>{trialEligible ? trialCountLabel(trialRemaining, copy) : `${tool.cost} ${copy.credits}`}</span>}
      </button>
      {!canAfford && !loading && !isSceneRemake && (
        <p className="form-error">{trialWorkflow ? copy.trialExpired : copy.creditsRequired}</p>
      )}
      {isSceneRemake && !loading && <p className="form-note">{copy.sceneRemakeTrialNote}</p>}
      {!needed && !loading && (
        <p className="form-hint">{missingAssetsMessage}</p>
      )}
    </section>
  );
}

function WorkspacePreview({ lang, tool, files, form, result, job, progress, stage, onDownload, onShare, onOpenLibrary, onOpenGalleryItem, onViewGallery, showWatermark, trialEligible, trialRemaining }) {
  const copy = UI_COPY[lang].studio;
  const sourcePreview = tool.mode === "prompt" ? files.referencePreview : files.imagePreview;
  const selectedTemplate = MOTION_TEMPLATES.find((template) => template.file === form.templateMotion);
  const motionPreview = files.motionPreview || (!files.motion && form.templateMotion ? `/videos/${form.templateMotion}` : "");
  const assetsReady = tool.mode === "duo" ? Boolean(sourcePreview && motionPreview)
    : tool.mode === "single" ? Boolean(sourcePreview)
    : true;
  const missingAssetsCopy = !sourcePreview && !motionPreview
    ? copy.duoEmpty
    : !sourcePreview
      ? copy.mixAssetsMissing
      : copy.motionMissing;
  return (
    <section className="workspace-preview">
      <div className="preview-tabs">
        <button className="active"><Play size={14} /> {copy.preview}</button>
        <button onClick={onOpenLibrary}><Folder size={14} /> {copy.previewLibrary}</button>
        <span className="preview-spacer" />
        <button className="quiet-icon"><Settings2 size={16} /></button>
      </div>
      {job === "processing" && <ProgressPanel tool={tool} progress={progress} stage={stage} copy={copy} />}
      {job === "ready" && <ResultPanel tool={tool} result={result} onDownload={onDownload} onShare={onShare} showWatermark={showWatermark} copy={copy} />}
      {job === "idle" && (
        <div className="empty-preview">
          <div className="empty-stage" aria-label={copy.sourceMotionResult}>
            <div className="empty-stage-node">
              <div className={`empty-stage-media ${sourcePreview ? "" : "placeholder"}`}>
                {sourcePreview ? (
                  <img src={sourcePreview} alt={copy.source} />
                ) : (
                  <div className="empty-grid" />
                )}
                <span className="empty-stage-index">01</span>
              </div>
              <strong>{copy.source}</strong>
              <small>{sourcePreview ? copy.assetReady : copy.sourceStageNote}</small>
            </div>
            <span className="empty-stage-arrow"><Plus size={14} /></span>
            <div className="empty-stage-node">
              <div className={`empty-stage-media ${motionPreview ? "" : "placeholder"}`}>
                {motionPreview ? (
                  <video
                    src={motionPreview}
                    poster={files.motion ? undefined : selectedTemplate?.poster}
                    muted
                    loop
                    autoPlay
                    playsInline
                    preload="metadata"
                  />
                ) : (
                  <div className="empty-grid" />
                )}
                <span className="empty-stage-index">02</span>
              </div>
              <strong>{copy.motion}</strong>
              <small>{motionPreview ? copy.assetReady : copy.motionStageNote}</small>
            </div>
            <span className="empty-stage-arrow"><ArrowRight size={14} /></span>
            <div className="empty-stage-node result">
              <div className="empty-stage-media placeholder">
                <div className="empty-grid" />
                <span className="empty-spark"><Sparkles size={20} /></span>
                <span className="empty-stage-index">03</span>
              </div>
              <strong>{copy.result}</strong>
              <small>{copy.resultStageNote}</small>
            </div>
          </div>
          <h2>
            {assetsReady && tool.mode !== "prompt"
              ? copy.workspaceReadyTitle
              : tool.id === "image" ? copy.imageEmptyTitle : copy.sceneEmptyTitle}
          </h2>
          <p>
            {assetsReady && tool.mode !== "prompt"
              ? copy.workspaceReadyText
              : tool.mode === "prompt" ? copy.promptEmpty : missingAssetsCopy}
          </p>
          <span className="empty-badge">
            {trialEligible ? <Sparkles size={13} /> : <Zap size={13} />}
            {trialEligible ? trialCountLabel(trialRemaining, copy) : `${tool.cost} ${copy.creditsPerRender}`}
          </span>
        </div>
      )}
      <div className="studio-gallery">
        <div className="studio-gallery-head">
          <strong>{copy.recent}</strong>
          <button onClick={onViewGallery}>{copy.viewAll} <ArrowRight size={14} /></button>
        </div>
        <div className="studio-gallery-grid">
          {STUDIO_GALLERY.map((item, index) => (
            <button
              className={`studio-thumb ${item.tall ? "tall" : ""}`}
              key={`${item.image}-${index}`}
              onClick={() => onOpenGalleryItem(item.id)}
            >
              {item.video ? (
                <video
                  src={item.video}
                  poster={item.image}
                  aria-label={copy.motionPreview}
                  autoPlay
                  muted
                  loop
                  playsInline
                  preload="metadata"
                />
              ) : (
                <img src={item.image} alt={copy.galleryPreview} />
              )}
              <span>{item.time === "IMAGE" ? <ImageIcon size={11} /> : <Play size={11} fill="currentColor" />} {item.time}</span>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

function Studio({ lang, setLang, onExit, onToast, session, onSessionChange, onAuth, onCheckout, onLogout, initialToolId, siteSettings }) {
  const [activeTool, setActiveTool] = useState(
    TOOL_DEFINITIONS.find((tool) => tool.id === initialToolId) || TOOL_DEFINITIONS[0]
  );
  const [files, setFiles] = useState({
    image: null,
    imagePreview: "",
    motion: null,
    motionPreview: "",
    reference: null,
    referencePreview: ""
  });
  const [form, setForm] = useState({
    prompt: localStorage.getItem("mm_prompt") || "",
    model: "MotionMint Auto",
    aspect: "16:9",
    duration: "5 sec",
    resolution: "1080p",
    background: "Original scene",
    templateMotion: "",
    priority: false
  });
  const [job, setJob] = useState("idle");
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState("analyzing");
  const [result, setResult] = useState(null);
  const [apiMode, setApiMode] = useState("demo");
  const [referralOpen, setReferralOpen] = useState(false);
  const [referralData, setReferralData] = useState(null);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [libraryItems, setLibraryItems] = useState([]);
  const [libraryLoading, setLibraryLoading] = useState(false);
  const pollRef = useRef(null);

  useEffect(() => {
    apiFetch("/api/status")
      .then((response) => response.json())
      .then((data) => setApiMode(data.provider))
      .catch(() => setApiMode("demo"));
    return () => window.clearInterval(pollRef.current);
  }, []);

  useEffect(() => {
    const raw = localStorage.getItem("mm_mix_prefill");
    if (!raw) return;
    localStorage.removeItem("mm_mix_prefill");
    let prefill;
    try {
      prefill = JSON.parse(raw);
    } catch {
      return;
    }
    if (!prefill?.url) return;
    apiFetch(prefill.url)
      .then(async (response) => {
        if (!response.ok) throw new Error(copy.toasts.sampleLoadFailed);
        const blob = await response.blob();
        setFile("image", new File(
          [blob],
          prefill.filename || "official-sample.jpg",
          { type: blob.type || "image/jpeg" }
        ));
        if (prefill.prompt) {
          setForm((current) => ({ ...current, prompt: prefill.prompt }));
        }
        onToast(copy.toasts.communityLoaded);
      })
      .catch((error) => onToast(error.message));
  }, []);

  useEffect(() => {
    setActiveTool(TOOL_DEFINITIONS.find((tool) => tool.id === initialToolId) || TOOL_DEFINITIONS[0]);
    setJob("idle");
    setResult(null);
    setProgress(0);
    window.clearInterval(pollRef.current);
  }, [initialToolId]);

  const activeLibraryJobIds = libraryItems
    .filter((item) => isActiveJob(item) && !String(item.id).startsWith("pending_"))
    .map((item) => item.id);
  const activeLibraryJobKey = activeLibraryJobIds.join("|");

  useEffect(() => {
    if (!libraryOpen || !activeLibraryJobKey) return undefined;
    let cancelled = false;

    async function refreshOpenLibrary() {
      await Promise.allSettled(activeLibraryJobIds.map(async (id) => {
        try {
          const response = await apiFetch(`/api/jobs/${encodeURIComponent(id)}`);
          const payload = await response.json();
          if (!response.ok || cancelled) return;
          setLibraryItems((current) => mergeLibraryItems(current, payload));
        } catch {
          // Keep the stored library row and try again on the next refresh.
        }
      }));
    }

    void refreshOpenLibrary();
    const interval = window.setInterval(() => {
      void refreshOpenLibrary();
    }, 1800);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [activeLibraryJobKey, libraryOpen]);

  const credits = Number(session?.credits || 0);
  const trialRemaining = Number(session?.trialRemaining || 0);
  const copy = UI_COPY[lang].studio;
  const displayTool = localizedTool(activeTool, lang);
  const trialEligible = trialRemaining > 0 && TRIAL_WORKFLOWS.has(activeTool.id);
  const hasActiveLibraryItems = libraryItems.some(isActiveJob);
  const shouldShowLibraryEmpty = !libraryLoading && !hasActiveLibraryItems && libraryItems.length === 0;

  function setFile(field, file) {
    const key = `${field}Preview`;
    setFiles((current) => ({
      ...current,
      [field]: file,
      [key]: file ? URL.createObjectURL(file) : ""
    }));
  }

  async function generate() {
    const canUseTrial = trialRemaining > 0 && TRIAL_WORKFLOWS.has(activeTool.id);
    if (!canUseTrial && credits < activeTool.cost) {
      if (session?.guest) onAuth();
      else onCheckout("creator");
      return;
    }
    window.clearInterval(pollRef.current);
    const pendingId = `pending_${Date.now()}_${crypto.randomUUID()}`;
    const pendingItem = {
      id: pendingId,
      workflow: activeTool.id,
      kind: activeTool.id === "image" ? "images" : "video",
      mode: apiMode,
      status: "processing",
      progress: 4,
      stage: "analyzing",
      poster: files.imagePreview || files.referencePreview || "",
      prompt: form.prompt,
      created_at: Date.now()
    };
    setJob("processing");
    setProgress(4);
    setStage("analyzing");
    setResult(null);
    setLibraryItems((current) => mergeLibraryItems(current, pendingItem));
    const data = new FormData();
    data.append("workflow", activeTool.id);
    data.append("prompt", form.prompt);
    data.append("aspect", form.aspect);
    data.append(
      "displayResolution",
      activeTool.id === "image" ? (form.resolution === "2K" ? "2K" : "1K") : form.resolution
    );
    data.append("duration", String(Number.parseInt(form.duration, 10) || 5));
    data.append(
      "resolution",
      activeTool.id === "image"
        ? form.resolution === "2K" ? "2K" : "1K"
        : form.resolution === "1080p" ? "768p" : form.resolution
    );
    data.append("background", form.background === "Original scene" ? "original" : form.background.toLowerCase());
    data.append("templateMotion", form.templateMotion || "");
    data.append("priority", String(form.priority));
    if (files.image) data.append("image", files.image);
    if (files.motion) data.append("motion", files.motion);
    if (files.reference) data.append("reference", files.reference);

    try {
      const response = await apiFetch("/api/generate", { method: "POST", body: data });
      const payload = await response.json();
      if (payload.session) onSessionChange(payload.session);
      if (!response.ok) {
        setJob("idle");
        setProgress(0);
        setStage("failed");
        if (payload.code === "PAYMENT_REQUIRED") {
          onAuth();
          setLibraryItems((current) => current.filter((item) => item.id !== pendingId));
          onToast(payload.error || copy.toasts.generateUnavailable);
          return;
        }
        const inputHint = String(payload.error || "").trim();
        if (GENERATION_INPUT_HINTS.has(inputHint)) {
          setLibraryItems((current) => current.filter((item) => item.id !== pendingId));
          onToast(inputHint);
          return;
        }
        const unavailableItem = {
          ...pendingItem,
          status: "failed",
          progress: 0,
          stage: "failed",
          error: {
            code: "GENERATE_UNAVAILABLE",
            message: copy.generateUnavailable
          }
        };
        setLibraryItems((current) => replaceLibraryItem(current, pendingId, unavailableItem));
        onToast(copy.toasts.generateUnavailable);
        return;
      }

      const acceptedItem = {
        ...pendingItem,
        id: payload.id,
        status: payload.status || "processing",
        progress: Number(payload.progress) || 0,
        stage: payload.stage || "analyzing",
        mode: payload.mode || pendingItem.mode,
        created_at: payload.created_at || pendingItem.created_at
      };
      setLibraryItems((current) => replaceLibraryItem(current, pendingId, acceptedItem));
      setApiMode(payload.mode || apiMode);
      let consecutivePollFailures = 0;

      async function pollJob() {
        try {
          const jobResponse = await apiFetch(`/api/jobs/${payload.id}`);
          const jobData = await jobResponse.json();
          if (!jobResponse.ok) throw new Error(jobData.error || "Unable to read the render.");
          consecutivePollFailures = 0;
          setProgress(Number(jobData.progress) || 0);
          setStage(jobData.stage || "rendering");
          setLibraryItems((current) => mergeLibraryItems(current, jobData));
          if (jobData.status === "ready") {
            window.clearInterval(pollRef.current);
            setResult({ ...acceptedItem, ...jobData, id: payload.id });
            setProgress(100);
            setStage("finishing");
            setJob("ready");
            onToast(payload.mode === "live" ? copy.toasts.renderReady : copy.toasts.demoComplete);
            return;
          }
          if (jobData.status === "failed") {
            window.clearInterval(pollRef.current);
            setJob("idle");
            try {
              onSessionChange(await loadSessionState());
            } catch {
              // The failed render remains visible even if the session refresh is unavailable.
            }
            onToast(copy.toasts.generateUnavailable);
            return;
          }
          setJob("processing");
        } catch (error) {
          consecutivePollFailures += 1;
          if (consecutivePollFailures < POLL_MAX_CONSECUTIVE_FAILURES) return;
          window.clearInterval(pollRef.current);
          setJob("idle");
          onToast(copy.toasts.generateUnavailable);
        }
      }

      pollRef.current = window.setInterval(() => {
        void pollJob();
      }, 900);
      void pollJob();
    } catch (error) {
      setJob("idle");
      setProgress(0);
      setStage("failed");
      const unavailableItem = {
        ...pendingItem,
        status: "failed",
        progress: 0,
        stage: "failed",
        error: {
          code: "GENERATE_UNAVAILABLE",
          message: copy.generateUnavailable
        }
      };
      setLibraryItems((current) => replaceLibraryItem(current, pendingId, unavailableItem));
      onToast(copy.toasts.generateUnavailable);
    }
  }

  async function copyInvite() {
    if (!referralData?.code) {
      onToast("Sign in to create your personal invite link.");
      return;
    }
    const link = `${window.location.origin}/?ref=${encodeURIComponent(referralData.code)}`;
    try {
      await navigator.clipboard.writeText(link);
      onToast("Invite link copied. Reward unlocks after your friend creates once.");
    } catch {
      onToast("Select the invite link to copy it.");
    }
  }

  async function openReferral() {
    if (!session?.user) {
      onAuth();
      return;
    }
    try {
      const response = await apiFetch("/api/referral");
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Invite link could not be created.");
      setReferralData(payload);
      setReferralOpen(true);
    } catch (error) {
      onToast(error.message);
    }
  }

  async function openLibrary() {
    setLibraryOpen(true);
    setLibraryLoading(true);
    try {
      const response = await apiFetch("/api/jobs");
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Library could not be loaded.");
      setLibraryItems((current) => {
        let items = payload.items || [];
        const apiIds = new Set(items.map((item) => item.id));
        const localCandidates = [...current, ...libraryItems, result]
          .filter((item) => item?.id && (isActiveJob(item) || item.status === "ready"));
        for (const localItem of localCandidates) {
          if (!apiIds.has(localItem.id)) {
            items = mergeLibraryItems(items, localItem);
            apiIds.add(localItem.id);
          }
        }
        return items;
      });
    } catch (error) {
      onToast(error.message);
    } finally {
      setLibraryLoading(false);
    }
  }

  function openLibraryItem(item) {
    if (item.status !== "ready") {
      onToast(`This render is still ${item.status}.`);
      return;
    }
    const tool = TOOL_DEFINITIONS.find((candidate) => candidate.id === item.workflow) || TOOL_DEFINITIONS[0];
    setActiveTool(tool);
    setForm((current) => ({
      ...current,
      prompt: item.prompt || "",
      aspect: item.aspect_ratio || current.aspect,
      resolution: item.resolution || current.resolution
    }));
    setResult(item);
    setProgress(100);
    setStage("finishing");
    setJob("ready");
    setLibraryOpen(false);
  }

  async function useSampleAssets() {
    try {
      const imageResponse = await apiFetch("/images/character-one.jpg");
      const imageBlob = await imageResponse.blob();
      const imageFile = new File([imageBlob], copy.demoCharacterFile, { type: imageBlob.type || "image/jpeg" });
      setFile("image", imageFile);
      if (activeTool.mode === "duo") {
        const motionResponse = await apiFetch("/videos/neon-dance-2.mp4");
        const motionBlob = await motionResponse.blob();
        const motionFile = new File([motionBlob], copy.demoMotionFile, { type: motionBlob.type || "video/mp4" });
        setFile("motion", motionFile);
        setForm((current) => ({ ...current, templateMotion: "" }));
      }
      onToast("Demo assets loaded. Generate is now ready.");
    } catch {
      onToast("Could not load demo assets. Try uploading your own files.");
    }
  }

  return (
    <div className="studio-shell">
      <StudioSidebar
        lang={lang}
        activeTool={activeTool}
        setActiveTool={setActiveTool}
        credits={credits}
        trialRemaining={trialRemaining}
        trialEligible={trialEligible}
        onExit={onExit}
        onOpenLibrary={openLibrary}
        onInvite={openReferral}
        onUpgrade={() => session?.guest ? onAuth() : onCheckout("creator")}
      />
      <div className="studio-content">
        <StudioHeader
          lang={lang}
          setLang={setLang}
          mode={apiMode}
          session={session}
          onAuth={onAuth}
          onLogout={onLogout}
        />
        <nav className="studio-mobile-tools" aria-label={copy.creatingTools}>
          {TOOL_DEFINITIONS.map((tool) => {
            const Icon = tool.icon;
            const localized = TOOL_COPY[lang][tool.id];
            return (
              <button
                className={activeTool.id === tool.id ? "active" : ""}
                key={tool.id}
                onClick={() => setActiveTool(tool)}
              >
                <Icon size={15} />
                {localized.short}
              </button>
            );
          })}
        </nav>
        <div className="studio-main">
          <CreatorPanel
            lang={lang}
            tool={displayTool}
            files={files}
            setFile={setFile}
            form={form}
            setForm={setForm}
            onGenerate={generate}
            onUseSample={useSampleAssets}
            loading={job === "processing"}
            credits={credits}
            trialRemaining={trialRemaining}
          />
          <WorkspacePreview
            lang={lang}
            tool={displayTool}
            files={files}
            form={form}
            job={job}
            progress={progress}
            stage={stage}
            result={result}
            showWatermark={siteSettings?.watermarkEnabled !== false && session?.plan === "free"}
            trialEligible={trialEligible}
            trialRemaining={trialRemaining}
            onOpenLibrary={openLibrary}
            onOpenGalleryItem={(id) => { window.location.hash = `community/${id}`; }}
            onViewGallery={() => { window.location.hash = "community"; }}
            onDownload={() => {
              if (!result?.id) {
                onToast("This render does not have a download yet.");
                return;
              }
              const link = document.createElement("a");
              link.href = `/api/jobs/${encodeURIComponent(result.id)}/download`;
              link.download = "";
              link.click();
            }}
            onShare={() => copyInvite()}
          />
        </div>
      </div>
      {libraryOpen && (
        <div className="modal-backdrop" onMouseDown={() => setLibraryOpen(false)}>
          <div className="library-modal" onMouseDown={(event) => event.stopPropagation()}>
            <button className="modal-close" onClick={() => setLibraryOpen(false)}><X size={18} /></button>
            <span className="eyebrow">PERSONAL LIBRARY</span>
            <h2>Your finished sparks.</h2>
            <p>Ready renders can be opened again and exported. Queued jobs stay visible here while the provider finishes them.</p>
            {libraryLoading ? (
              <div className="library-empty"><Loader2 className="spin" size={22} /> Loading your renders…</div>
            ) : libraryItems.length ? (
              <div className="library-grid">
                {libraryItems.map((item) => {
                  const preview = item.video_url || item.images?.[0]?.url || item.poster;
                  return (
                    <article className={`library-item ${item.status}`} key={item.id}>
                      <button
                        className="library-media"
                        disabled={item.status !== "ready"}
                        onClick={() => openLibraryItem(item)}
                      >
                        {item.video_url ? (
                          <video src={item.video_url} muted loop playsInline preload="metadata" />
                        ) : preview ? (
                          <img src={preview} alt="" />
                        ) : (
                          <span><Sparkles size={22} /></span>
                        )}
                        <em>{item.status}</em>
                      </button>
                      <div>
                        <strong>{TOOL_DEFINITIONS.find((tool) => tool.id === item.workflow)?.name || item.workflow}</strong>
                        <small>{new Date(Number(item.created_at)).toLocaleString()}</small>
                        {item.status === "failed" && (
                          <small className="library-error">{copy.generateUnavailable}</small>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : shouldShowLibraryEmpty ? (
              <div className="library-empty"><Folder size={22} /> Your first finished render will appear here.</div>
            ) : null}
          </div>
        </div>
      )}
      {referralOpen && (
        <div className="modal-backdrop" onMouseDown={() => setReferralOpen(false)}>
          <div className="referral-modal" onMouseDown={(event) => event.stopPropagation()}>
            <button className="modal-close" onClick={() => setReferralOpen(false)}><X size={18} /></button>
            <span className="referral-gift"><Gift size={28} /></span>
            <span className="eyebrow">SHARE THE MOTION</span>
            <h2>4 credits for each of you.</h2>
            <p>Your friend creates once, then both accounts get 4 credits. Rewards are capped at 40 credits per month.</p>
            <div className="invite-link">
              <span>{window.location.origin}/?ref={referralData?.code || ""}</span>
              <button onClick={copyInvite}><Copy size={16} /> Copy</button>
            </div>
            <div className="referral-progress">
              <div>
                <span>{referralData?.pending || 0} pending · {referralData?.rewarded || 0} rewarded</span>
                <strong>{Math.min(40, Number(referralData?.rewarded || 0) * 4)} / 40 credits</strong>
              </div>
              <div className="progress-bar">
                <span style={{ width: `${Math.min(100, Number(referralData?.rewarded || 0) * 10)}%` }} />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Toast({ message }) {
  return (
    <div className="toast" role="status">
      <CheckCircle2 size={18} />
      {message}
    </div>
  );
}

function AuthModal({ lang, open, onClose, onSuccess, onToast, providers }) {
  const copy = UI_COPY[lang].auth;
  const [register, setRegister] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const termsParts = copy.terms.split(copy.termsLink);
  const privacyParts = (termsParts[1] || "").split(copy.privacyLink);
  const hasLegalLinks = termsParts.length === 2 && privacyParts.length === 2;

  if (!open) return null;

  async function submitEmail(event) {
    event.preventDefault();
    setBusy("email");
    setError("");
    try {
      const response = await apiFetch(register ? "/api/auth/register" : "/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, referralCode: localStorage.getItem("mm_ref") || "" })
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || copy.emailFailed);
      onSuccess(payload);
      onToast(register ? copy.accountCreated : copy.signedIn);
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setBusy("");
    }
  }

  async function connectWallet() {
    if (!window.ethereum) {
      setError(copy.walletMissing);
      return;
    }
    setBusy("wallet");
    setError("");
    try {
      const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
      const address = accounts?.[0];
      if (!address) throw new Error(copy.walletCancelled);
      const challengeResponse = await apiFetch("/api/auth/wallet/challenge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address })
      });
      const challenge = await challengeResponse.json();
      if (!challengeResponse.ok) throw new Error(challenge.error || copy.walletFailed);
      const signature = await window.ethereum.request({
        method: "personal_sign",
        params: [challenge.message, address]
      });
      const verifyResponse = await apiFetch("/api/auth/wallet/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address, signature })
      });
      const payload = await verifyResponse.json();
      if (!verifyResponse.ok) throw new Error(payload.error || copy.walletFailed);
      onSuccess(payload);
      onToast(copy.walletConnected);
    } catch (walletError) {
      setError(walletError.message);
    } finally {
      setBusy("");
    }
  }

  return (
    <div className="modal-backdrop auth-backdrop" onMouseDown={onClose}>
      <div className="auth-modal" onMouseDown={(event) => event.stopPropagation()}>
        <button className="modal-close" onClick={onClose} aria-label={copy.close}><X size={18} /></button>
        <Brand />
        <span className="eyebrow auth-eyebrow">{register ? copy.registerEyebrow : copy.signInEyebrow}</span>
        <h2>{register ? copy.registerTitle : copy.signInTitle}</h2>
        <p className="auth-description">
          {copy.description}
        </p>

        {providers.googleOAuth && (
          <button
            className="auth-provider"
            disabled={busy !== ""}
            onClick={() => {
              window.location.href = "/api/auth/google/start";
            }}
          >
            <span className="provider-g">G</span>
            {copy.google}
          </button>
        )}
        {providers.wallet && (
          <button className="auth-provider" onClick={connectWallet} disabled={busy !== ""}>
            {busy === "wallet" ? <Loader2 className="spin" size={18} /> : <Wallet size={18} />}
            {copy.wallet}
          </button>
        )}

        <div className="auth-divider"><span>{copy.divider}</span></div>

        <form onSubmit={submitEmail}>
          <label>
            <span>{copy.email}</span>
            <div className="auth-input">
              <Mail size={16} />
              <input
                type="email"
                value={email}
                autoComplete="email"
                placeholder={copy.emailPlaceholder}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </div>
          </label>
          <label>
            <span>{copy.password}</span>
            <div className="auth-input">
              <LockKeyhole size={16} />
              <input
                type="password"
                value={password}
                autoComplete={register ? "new-password" : "current-password"}
                placeholder={copy.passwordPlaceholder}
                minLength={8}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
            </div>
          </label>
          {error && <p className="auth-error">{error}</p>}
          <button className="button button-primary button-block auth-submit" disabled={busy !== ""}>
            {busy === "email" ? <Loader2 className="spin" size={17} /> : <LogIn size={17} />}
            {register ? copy.createAccount : copy.signIn}
          </button>
        </form>

        <button className="button button-ghost button-block auth-guest" onClick={onClose}>{copy.guest}</button>
        <button className="auth-switch" onClick={() => { setRegister(!register); setError(""); }}>
          {register ? copy.switchToSignIn : copy.switchToRegister}
        </button>
        <small className="auth-terms">
          {hasLegalLinks ? (
            <>
              {termsParts[0]}
              <a href="#terms">{copy.termsLink}</a>
              {privacyParts[0]}
              <a href="#privacy">{copy.privacyLink}</a>
              {privacyParts[1]}
            </>
          ) : copy.terms}
        </small>
      </div>
    </div>
  );
}

function AdminDashboard({ onExit }) {
  const [token, setToken] = useState(() => sessionStorage.getItem("mm_admin_token") || "");
  const [summary, setSummary] = useState(null);
  const [users, setUsers] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function loadAdmin(override) {
    const activeToken = override ?? token;
    if (!activeToken) return;
    setLoading(true);
    setError("");
    try {
      const headers = { Authorization: `Bearer ${activeToken}` };
      const responses = await Promise.all([
        apiFetch("/api/admin/summary", { headers }),
        apiFetch("/api/admin/users", { headers }),
        apiFetch("/api/admin/jobs", { headers })
      ]);
      const payloads = await Promise.all(responses.map((response) => response.json()));
      responses.forEach((response, index) => {
        if (!response.ok) throw new Error(payloads[index].error || "Admin request failed.");
      });
      sessionStorage.setItem("mm_admin_token", activeToken);
      setSummary(payloads[0]);
      setUsers(payloads[1].items || []);
      setJobs(payloads[2].items || []);
    } catch (loadError) {
      setError(loadError.message);
      setSummary(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (token) loadAdmin(token);
  }, []);

  if (!summary) {
    return (
      <div className="admin-login-shell">
        <a href="#top" className="admin-home"><Brand /></a>
        <form
          className="admin-login-card"
          onSubmit={(event) => {
            event.preventDefault();
            loadAdmin();
          }}
        >
          <span className="admin-shield"><ShieldCheck size={28} /></span>
          <span className="eyebrow">PRIVATE CONTROL ROOM</span>
          <h1>MotionMint Admin</h1>
          <label>
            <span>ADMIN TOKEN</span>
            <input
              type="password"
              value={token}
              onChange={(event) => setToken(event.target.value)}
              placeholder="Paste admin token"
              required
            />
          </label>
          {error && <p className="auth-error">{error}</p>}
          <button className="button button-primary button-block" disabled={loading}>
            {loading ? <Loader2 className="spin" size={17} /> : <ShieldCheck size={17} />}
            Open dashboard
          </button>
          <button type="button" className="auth-guest" onClick={onExit}>Back to website</button>
        </form>
      </div>
    );
  }

  const metrics = [
    { label: "TOTAL USERS", value: summary.users, icon: Users },
    { label: "LIVE SESSIONS", value: summary.sessions, icon: Activity },
    { label: "JOBS CREATED", value: summary.jobs, icon: WandSparkles },
    { label: "JOBS TODAY", value: summary.jobsToday, icon: Zap },
    { label: "CREDITS OUTSTANDING", value: summary.creditsOutstanding, icon: Crown },
    { label: "REFERRALS REWARDED", value: summary.referralsRewarded, icon: Gift }
  ];

  return (
    <div className="admin-shell">
      <header className="admin-header">
        <Brand />
        <div className="admin-header-actions">
          <button className="button button-ghost button-small" onClick={() => loadAdmin()}>
            <RefreshCw size={15} /> Refresh
          </button>
          <button className="button button-outline button-small" onClick={onExit}>View website</button>
        </div>
      </header>
      <main className="admin-main">
        <div className="admin-title">
          <div>
            <span className="eyebrow">OPERATIONS</span>
            <h1>Control room</h1>
            <p>Users, generation jobs, trial usage and referral health in one place.</p>
          </div>
          <span className="admin-live"><span /> DATABASE CONNECTED</span>
        </div>
        <div className="admin-metrics">
          {metrics.map(({ label, value, icon: Icon }) => (
            <div className="admin-metric" key={label}>
              <Icon size={17} />
              <span>{label}</span>
              <strong>{value}</strong>
            </div>
          ))}
        </div>
        <div className="admin-grid">
          <section className="admin-table-card">
            <div className="admin-card-head">
              <div><span>USERS</span><strong>Recent accounts</strong></div>
              <span>{users.length} shown</span>
            </div>
            <div className="admin-table-wrap">
              <table>
                <thead><tr><th>User</th><th>Provider</th><th>Plan</th><th>Trials</th><th>Credits</th></tr></thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id}>
                      <td>{user.email || user.wallet_address || user.id.slice(0, 12)}</td>
                      <td>{user.auth_provider}</td>
                      <td><span className="table-pill">{user.plan}</span></td>
                      <td>{user.trial_used} / 3</td>
                      <td>{user.credits}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
          <section className="admin-table-card">
            <div className="admin-card-head">
              <div><span>JOBS</span><strong>Latest generations</strong></div>
              <span>{jobs.length} shown</span>
            </div>
            <div className="admin-table-wrap">
              <table>
                <thead><tr><th>Workflow</th><th>Mode</th><th>Status</th><th>Created</th></tr></thead>
                <tbody>
                  {jobs.map((job) => (
                    <tr key={job.id}>
                      <td>{job.workflow}</td>
                      <td>{job.mode}</td>
                      <td><span className={`table-pill ${job.status}`}>{job.status}</span></td>
                      <td>{new Date(Number(job.created_at)).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

function AdminDashboardV2({ onExit }) {
  const [token, setToken] = useState(() => sessionStorage.getItem("mm_admin_token") || "");
  const [summary, setSummary] = useState(null);
  const [users, setUsers] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [content, setContent] = useState([]);
  const [settings, setSettings] = useState(null);
  const [tab, setTab] = useState("overview");
  const [editing, setEditing] = useState(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);

  async function loadAdmin(override) {
    const activeToken = override ?? token;
    if (!activeToken) return;
    setLoading(true);
    setError("");
    try {
      const headers = { Authorization: `Bearer ${activeToken}` };
      const paths = ["summary", "users", "jobs", "content", "settings"];
      const responses = await Promise.all(paths.map((name) => apiFetch(`/api/admin/${name}`, { headers })));
      const payloads = await Promise.all(responses.map((response) => response.json()));
      responses.forEach((response, index) => {
        if (!response.ok) throw new Error(payloads[index].error || "Admin request failed.");
      });
      sessionStorage.setItem("mm_admin_token", activeToken);
      setToken(activeToken);
      setSummary(payloads[0]);
      setUsers(payloads[1].items || []);
      setJobs(payloads[2].items || []);
      setContent(payloads[3].items || []);
      setSettings(payloads[4]);
    } catch (loadError) {
      setError(loadError.message);
      setSummary(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (token) loadAdmin(token);
  }, []);

  async function request(path, options = {}) {
    const headers = new Headers(options.headers || {});
    headers.set("Authorization", `Bearer ${token}`);
    if (options.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
    const response = await apiFetch(path, { ...options, headers });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || "Admin action failed.");
    return payload;
  }

  async function runAction(action, success) {
    try {
      await action();
      setNotice(success);
      await loadAdmin(token);
      window.setTimeout(() => setNotice(""), 2600);
    } catch (actionError) {
      setError(actionError.message);
    }
  }

  async function saveContent(event) {
    event.preventDefault();
    await runAction(
      () => request("/api/admin/content", { method: "POST", body: JSON.stringify(editing) }),
      "Gallery item saved."
    );
    setEditing(null);
  }

  async function saveSettings(event) {
    event.preventDefault();
    await runAction(
      () => request("/api/admin/settings", { method: "PATCH", body: JSON.stringify(settings) }),
      "Site settings saved."
    );
  }

  if (!summary) {
    return (
      <div className="admin-login-shell">
        <a href="#top" className="admin-home"><Brand /></a>
        <form className="admin-login-card" onSubmit={(event) => { event.preventDefault(); loadAdmin(); }}>
          <span className="admin-shield"><ShieldCheck size={28} /></span>
          <span className="eyebrow">PRIVATE CONTROL ROOM</span>
          <h1>MotionMint Admin</h1>
          <label>
            <span>ADMIN TOKEN</span>
            <input type="password" value={token} onChange={(event) => setToken(event.target.value)} placeholder="Paste admin token" required />
          </label>
          {error && <p className="auth-error">{error}</p>}
          <button className="button button-primary button-block" disabled={loading}>
            {loading ? <Loader2 className="spin" size={17} /> : <ShieldCheck size={17} />} Open dashboard
          </button>
          <button type="button" className="auth-guest" onClick={onExit}>Back to website</button>
        </form>
      </div>
    );
  }

  const metrics = [
    ["TOTAL USERS", summary.users, Users],
    ["LIVE SESSIONS", summary.sessions, Activity],
    ["JOBS CREATED", summary.jobs, WandSparkles],
    ["JOBS TODAY", summary.jobsToday, Zap],
    ["CREDITS OUTSTANDING", summary.creditsOutstanding, Crown],
    ["REFERRALS REWARDED", summary.referralsRewarded, Gift]
  ];
  const tabs = [
    ["overview", "Overview"], ["users", "Users"], ["jobs", "Jobs"],
    ["content", "Gallery"], ["settings", "Settings"]
  ];

  return (
    <div className="admin-shell">
      <header className="admin-header">
        <Brand />
        <div className="admin-header-actions">
          <button className="button button-ghost button-small" onClick={() => loadAdmin()}><RefreshCw size={15} /> Refresh</button>
          <button className="button button-outline button-small" onClick={onExit}>View website</button>
        </div>
      </header>
      <main className="admin-main">
        <div className="admin-title">
          <div>
            <span className="eyebrow">OPERATIONS</span>
            <h1>Control room</h1>
            <p>Manage customers, content, limits, and platform behavior.</p>
          </div>
          <span className="admin-live"><span /> DATABASE CONNECTED</span>
        </div>
        <nav className="admin-tabs">
          {tabs.map(([id, label]) => (
            <button className={tab === id ? "active" : ""} key={id} onClick={() => setTab(id)}>
              {label}
              {id === "users" && <span>{users.length}</span>}
              {id === "jobs" && <span>{jobs.length}</span>}
              {id === "content" && <span>{content.length}</span>}
            </button>
          ))}
        </nav>

        {tab === "overview" && (
          <>
            <div className="admin-metrics">
              {metrics.map(([label, value, Icon]) => (
                <div className="admin-metric" key={label}><Icon size={17} /><span>{label}</span><strong>{value}</strong></div>
              ))}
            </div>
            <div className="admin-overview-strip">
              <span><Gift size={19} /><strong>{summary.referralsPending}</strong> pending referrals</span>
              <span><Folder size={19} /><strong>{content.filter((item) => item.published).length}</strong> published gallery items</span>
              <span><Zap size={19} /><strong>{settings.trialLimit}</strong> trial renders per user</span>
            </div>
          </>
        )}

        {tab === "users" && (
          <section className="admin-table-card">
            <div className="admin-card-head"><div><span>USERS</span><strong>Customer accounts</strong></div><span>Manage credits and access</span></div>
            <div className="admin-table-wrap">
              <table>
                <thead><tr><th>User</th><th>Provider</th><th>Plan</th><th>Trials</th><th>Credits</th><th>Status</th><th>Actions</th></tr></thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id}>
                      <td>{user.email || user.wallet_address || user.id.slice(0, 12)}</td>
                      <td>{user.auth_provider}</td>
                      <td><span className="table-pill">{user.plan}</span></td>
                      <td>{user.trial_used} / {settings.trialLimit}</td>
                      <td>{user.credits}</td>
                      <td><span className={`table-pill ${user.status}`}>{user.status}</span></td>
                      <td className="admin-row-actions">
                        <button onClick={() => runAction(() => request(`/api/admin/users/${user.id}/credits`, { method: "POST", body: JSON.stringify({ delta: 10 }) }), "+10 credits applied.")}>+10 credits</button>
                        <button onClick={() => runAction(() => request(`/api/admin/users/${user.id}/status`, { method: "POST", body: JSON.stringify({ status: user.status === "active" ? "suspended" : "active" }) }), "User status updated.")}>
                          {user.status === "active" ? "Suspend" : "Activate"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {tab === "jobs" && (
          <section className="admin-table-card">
            <div className="admin-card-head"><div><span>JOBS</span><strong>Latest generations</strong></div><span>{jobs.length} shown</span></div>
            <div className="admin-table-wrap">
              <table>
                <thead><tr><th>Workflow</th><th>Mode</th><th>Status</th><th>Progress</th><th>Created</th></tr></thead>
                <tbody>
                  {jobs.map((job) => (
                    <tr key={job.id}>
                      <td>{job.workflow}</td><td>{job.mode}</td>
                      <td><span className={`table-pill ${job.status}`}>{job.status}</span></td>
                      <td>{job.progress || 0}%</td><td>{new Date(Number(job.created_at)).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {tab === "content" && (
          <div className={`admin-content-layout ${editing ? "editing" : ""}`}>
            <section className="admin-table-card">
              <div className="admin-card-head">
                <div><span>PUBLIC GALLERY</span><strong>Customer showcase</strong></div>
                <button className="admin-mini-primary" onClick={() => setEditing({ title: "New gallery item", description: "", category: "People", mediaType: "image", mediaUrl: "", posterUrl: "", prompt: "", model: "MotionMint Auto", aspectRatio: "16:9", resolution: "2K", author: "MotionMint Creator", featured: false, published: true, downloadEnabled: true, sortOrder: 0 })}>+ New item</button>
              </div>
              <div className="admin-content-grid">
                {content.map((item) => (
                  <article className="admin-content-card" key={item.id}>
                    {item.media_type === "video" ? <video src={item.media_url} poster={item.poster_url} muted loop playsInline /> : <img src={item.media_url} alt="" />}
                    <div><strong>{item.title}</strong><span>{item.category} · {item.media_type}</span></div>
                    <button onClick={() => setEditing({ ...item, mediaType: item.media_type, posterUrl: item.poster_url, aspectRatio: item.aspect_ratio, downloadEnabled: Boolean(item.download_enabled), sortOrder: item.sort_order })}>Edit</button>
                    <button onClick={() => runAction(() => request("/api/admin/content", { method: "POST", body: JSON.stringify({ ...item, mediaType: item.media_type, posterUrl: item.poster_url, aspectRatio: item.aspect_ratio, downloadEnabled: Boolean(item.download_enabled), published: !Boolean(item.published) }) }), item.published ? "Item unpublished." : "Item published.")}>
                      {item.published ? "Unpublish" : "Publish"}
                    </button>
                  </article>
                ))}
              </div>
            </section>
            {editing && (
              <form className="admin-editor" onSubmit={saveContent}>
                <button type="button" className="modal-close" onClick={() => setEditing(null)}><X size={17} /></button>
                <span className="eyebrow">GALLERY ITEM</span>
                <h2>{editing.id ? "Edit content" : "Create content"}</h2>
                {[["title", "Title"], ["description", "Description"], ["category", "Category"], ["mediaUrl", "Media URL"], ["posterUrl", "Poster URL"], ["author", "Author"], ["model", "Model"], ["aspectRatio", "Aspect ratio"], ["resolution", "Resolution"]].map(([key, label]) => (
                  <label key={key}><span>{label}</span><input value={editing[key] || ""} onChange={(event) => setEditing({ ...editing, [key]: event.target.value })} /></label>
                ))}
                <label><span>Media type</span><select value={editing.mediaType || "image"} onChange={(event) => setEditing({ ...editing, mediaType: event.target.value })}><option value="image">Image</option><option value="video">Video</option></select></label>
                <label><span>Prompt</span><textarea rows="4" value={editing.prompt || ""} onChange={(event) => setEditing({ ...editing, prompt: event.target.value })} /></label>
                <div className="admin-checks">
                  <label><input type="checkbox" checked={Boolean(editing.published)} onChange={(event) => setEditing({ ...editing, published: event.target.checked })} /> Published</label>
                  <label><input type="checkbox" checked={Boolean(editing.featured)} onChange={(event) => setEditing({ ...editing, featured: event.target.checked })} /> Featured</label>
                  <label><input type="checkbox" checked={Boolean(editing.downloadEnabled)} onChange={(event) => setEditing({ ...editing, downloadEnabled: event.target.checked })} /> Download</label>
                </div>
                <button className="button button-primary button-block">Save gallery item</button>
                {editing.id && (
                  <button
                    type="button"
                    className="admin-delete-button"
                    onClick={() => {
                      if (!window.confirm(`Delete “${editing.title}” from the gallery?`)) return;
                      runAction(
                        () => request(`/api/admin/content/${editing.id}`, { method: "DELETE" }),
                        "Gallery item deleted."
                      );
                      setEditing(null);
                    }}
                  >
                    Delete item
                  </button>
                )}
              </form>
            )}
          </div>
        )}

        {tab === "settings" && (
          <form className="admin-settings-form" onSubmit={saveSettings}>
            <div className="admin-card-head"><div><span>PLATFORM SETTINGS</span><strong>Product controls</strong></div><span>Applies on next page load</span></div>
            <div className="admin-settings-grid">
              {[["siteName", "Site name"], ["heroTitle", "Hero title"], ["supportEmail", "Support email"], ["trialLimit", "Free trials per user"]].map(([key, label]) => (
                <label key={key}><span>{label}</span><input value={settings[key] || ""} onChange={(event) => setSettings({ ...settings, [key]: event.target.value })} /></label>
              ))}
              {[["allowRegistrations", "Allow new registrations"], ["publicGallery", "Public gallery enabled"], ["watermarkEnabled", "Watermark free results"]].map(([key, label]) => (
                <label className="admin-setting-toggle" key={key}><span>{label}</span><input type="checkbox" checked={settings[key] === "true"} onChange={(event) => setSettings({ ...settings, [key]: String(event.target.checked) })} /></label>
              ))}
            </div>
            <button className="button button-primary">Save settings</button>
          </form>
        )}
        {notice && <Toast message={notice} />}
        {error && <div className="admin-error-bar">{error}</div>}
      </main>
    </div>
  );
}

export default function App() {
  const [lang, setLang] = useState(() => localStorage.getItem("mm_lang") || "en");
  const [route, setRoute] = useState(routeFromHash);
  const [legalPage, setLegalPage] = useState(legalPageFromHash);
  const [initialToolId, setInitialToolId] = useState(() => window.location.hash.split("/")[1] || "mix");
  const [communityItemId, setCommunityItemId] = useState(() => window.location.hash.startsWith("#community/") ? window.location.hash.split("/")[1] : "");
  const [toast, setToast] = useState("");
  const [session, setSession] = useState(null);
  const [authOpen, setAuthOpen] = useState(false);
  const [pendingPlan, setPendingPlan] = useState(null);
  const [providers, setProviders] = useState({ googleOAuth: false, wallet: false, stripe: false });
  const [siteSettings, setSiteSettings] = useState({ siteName: "MotionMint", heroTitle: "Make anyone move." });

  useEffect(() => {
    const onHashChange = () => {
      if (window.location.hash.startsWith("#admin")) {
        window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}#top`);
        setRoute("landing");
        return;
      }
      setRoute(routeFromHash());
      setLegalPage(legalPageFromHash());
      if (window.location.hash.startsWith("#studio")) setInitialToolId(window.location.hash.split("/")[1] || "mix");
      setCommunityItemId(
        window.location.hash.startsWith("#community/") ? window.location.hash.split("/")[1] : ""
      );
    };
    onHashChange();
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  useEffect(() => {
    localStorage.setItem("mm_lang", lang);
    document.documentElement.lang = lang === "en" ? "en" : "zh-CN";
  }, [lang]);

  useEffect(() => {
    const ref = new URLSearchParams(window.location.search).get("ref");
    if (ref) {
      localStorage.setItem("mm_ref", ref);
      document.cookie = `mm_ref=${encodeURIComponent(ref)}; Path=/; SameSite=Lax; Max-Age=${30 * 24 * 60 * 60}`;
    }
    Promise.all([
      loadSessionState(),
      apiFetch("/api/config").then((response) => response.json()),
      apiFetch("/api/public/site").then((response) => response.json())
    ])
      .then(([sessionData, configData, siteData]) => {
        setSession(sessionData);
        setProviders(configData);
        setSiteSettings(siteData);
        const params = new URLSearchParams(window.location.search);
        if (params.get("auth_error")) showToast(params.get("auth_error"));
        if (params.get("billing") === "success" && configData.stripe) {
          showToast("Payment completed. Your credits will appear after the webhook confirms.");
        }
      })
      .catch(() => {
        setSession({ guest: true, trialRemaining: 3, credits: 0, user: null });
      });
  }, []);

  useEffect(() => {
    document.title = `${siteSettings.siteName || "MotionMint"} — ${siteSettings.heroTitle || "Make anyone move."}`;
  }, [siteSettings]);

  function showToast(message) {
    setToast(message);
    window.setTimeout(() => setToast(""), 3600);
  }

  function enterStudio(toolId = "mix") {
    const normalized = TOOL_DEFINITIONS.some((tool) => tool.id === toolId) ? toolId : "mix";
    setInitialToolId(normalized);
    window.location.hash = `studio/${normalized}`;
  }

  function exitStudio() {
    window.location.hash = "top";
  }

  async function checkout(product, overrideSession = session) {
    if (!providers.stripe) {
      showToast(UI_COPY[lang].billing.soon);
      return;
    }
    if (!overrideSession?.user) {
      setPendingPlan(product);
      setAuthOpen(true);
      return;
    }
    try {
      const response = await apiFetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ product })
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Checkout could not be started.");
      window.location.href = payload.url;
    } catch (error) {
      showToast(error.message);
    }
  }

  function authSuccess(sessionData) {
    setSession(sessionData);
    setAuthOpen(false);
    if (pendingPlan) {
      const plan = pendingPlan;
      setPendingPlan(null);
      window.setTimeout(() => checkout(plan, sessionData), 0);
    }
  }

  async function logout() {
    await apiFetch("/api/auth/logout", { method: "POST" });
    const guest = await loadSessionState();
    setSession(guest);
    showToast("Signed out. Guest trial mode is active.");
  }

  const sharedProps = useMemo(() => ({ lang, setLang, toast }), [lang, toast]);
  if (route === "legal") {
    return <LegalPage {...sharedProps} page={legalPage} />;
  }
  if (route === "community") {
    return (
      <CommunityGallery
        {...sharedProps}
        onStart={(toolId = "mix") => enterStudio(toolId)}
        siteSettings={siteSettings}
        initialItemId={communityItemId}
        onUseInMix={(item) => {
          localStorage.setItem("mm_prompt", item.prompt || "");
          localStorage.setItem("mm_mix_prefill", JSON.stringify({
            url: item.media_type === "video" ? item.poster_url : item.media_url,
            filename: `${String(item.title || "community").replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.jpg`,
            prompt: item.prompt || ""
          }));
          enterStudio("mix");
        }}
      />
    );
  }
  if (route === "studio") {
    return (
      <>
        <Studio
          {...sharedProps}
          onExit={exitStudio}
          onToast={showToast}
          session={session}
          onSessionChange={setSession}
          onAuth={() => setAuthOpen(true)}
          onCheckout={checkout}
          onLogout={logout}
          initialToolId={initialToolId}
          siteSettings={siteSettings}
        />
        <AuthModal
          lang={lang}
          open={authOpen}
          onClose={() => setAuthOpen(false)}
          onSuccess={authSuccess}
          onToast={showToast}
          providers={providers}
        />
        {toast && <Toast message={toast} />}
      </>
    );
  }
  return (
    <>
      <Landing
        {...sharedProps}
        onStart={enterStudio}
        onAuth={() => setAuthOpen(true)}
        onCheckout={(product) => checkout(product)}
        siteSettings={siteSettings}
        signedIn={Boolean(session?.user)}
      />
      <AuthModal
        lang={lang}
        open={authOpen}
        onClose={() => setAuthOpen(false)}
        onSuccess={authSuccess}
        onToast={showToast}
        providers={providers}
      />
    </>
  );
}
