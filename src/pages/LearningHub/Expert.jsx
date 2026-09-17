import React, { useEffect, useMemo, useState } from "react";
import { surface, textPrimary, textSecondary, textMuted, hoverSurface } from "../../styles";

/**
 * Expert.jsx — AI News & Community Blog (client-only, no extra libraries)
 *
 * Per your request:
 * - Filters (tabs + search + topic + location + sort) are at the TOP
 * - "All Posts" (results) are shown under the filters
 * - "Share something (News or Blog)" form is at the BOTTOM/END of the page
 * - Added support for optional image URLs and a light visual refresh
 *
 * Logic preserved:
 * - Tabs (All / News / Community)
 * - Search, Topic & Location filters
 * - Sort by date/title
 * - Add, view, delete posts
 * - localStorage persistence (client-only)
 *
 * Note: To make posts visible to everyone across devices, you'll need a backend.
 */

const STORAGE_KEY = "gkp_expert_posts";

// Seed a few example items if storage is empty
const SEED = [
  {
    id: "seed-1",
    type: "news", // "news" | "blog"
    title: "Transformers Keep Evolving",
    desc:
      "A quick explainer on how modern transformer variants improve context handling and efficiency.",
    href: "#",
    topics: ["Transformers", "LLMs"],
    location: "Global",
    imageUrl:
      "https://images.unsplash.com/photo-1677442136019-21780ecad995?q=80&w=1600&auto=format&fit=crop",
    createdAt: Date.now() - 1000 * 60 * 60 * 24 * 5, // 5 days ago
  },
  {
    id: "seed-2",
    type: "news",
    title: "RAG Systems in Production",
    desc:
      "Key building blocks of Retrieval-Augmented Generation: embeddings, vector DBs, and evaluation.",
    href: "#",
    topics: ["RAG", "Vector DB"],
    location: "Global",
    imageUrl:
      "https://images.unsplash.com/photo-1549921296-3b4a6b7540fb?q=80&w=1600&auto=format&fit=crop",
    createdAt: Date.now() - 1000 * 60 * 60 * 24 * 2, // 2 days ago
  },
  {
    id: "seed-3",
    type: "blog",
    title: "My First LLM App",
    desc:
      "Sharing lessons from building a small LLM app, from prompt design to caching and guardrails.",
    href: "#",
    topics: ["LLMs", "Apps"],
    location: "Chennai, IN",
    imageUrl:
      "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?q=80&w=1600&auto=format&fit=crop",
    createdAt: Date.now() - 1000 * 60 * 60 * 12, // 12 hours ago
  },
];

const TYPE_OPTIONS = [
  { value: "all", label: "All" },
  { value: "news", label: "News" },
  { value: "blog", label: "Community" },
];

const SORT_OPTIONS = [
  { value: "date_desc", label: "Date: Newest" },
  { value: "date_asc", label: "Date: Oldest" },
  { value: "title_asc", label: "Title: A–Z" },
  { value: "title_desc", label: "Title: Z–A" },
];

const PLACEHOLDER_IMG =
  "https://images.unsplash.com/photo-1518779578993-ec3579fee39f?q=80&w=1600&auto=format&fit=crop";

function loadPosts() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    /* ignore */
  }
  return null;
}

function savePosts(posts) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(posts));
}

function normalizeTopics(input) {
  return (input || "")
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
}

function formatDate(ts) {
  try {
    return new Date(ts).toLocaleString();
  } catch {
    return "";
  }
}

export default function Expert() {
  const [posts, setPosts] = useState([]);
  const [tab, setTab] = useState("all"); // "all" | "news" | "blog"
  const [search, setSearch] = useState("");
  const [topicFilter, setTopicFilter] = useState("all");
  const [locationFilter, setLocationFilter] = useState("");
  const [sortBy, setSortBy] = useState("date_desc");

  // Form state (Share section at bottom)
  const [form, setForm] = useState({
    type: "news",
    title: "",
    desc: "",
    href: "",
    topics: "",
    location: "",
    imageUrl: "",
  });

  // Load or seed on mount
  useEffect(() => {
    const fromStore = loadPosts();
    if (fromStore && Array.isArray(fromStore) && fromStore.length) {
      setPosts(fromStore);
    } else {
      setPosts(SEED);
      savePosts(SEED);
    }
  }, []);

  // Save on posts change
  useEffect(() => {
    savePosts(posts);
  }, [posts]);

  // Derived lists for filters
  const allTopics = useMemo(() => {
    const set = new Set();
    posts.forEach((p) => (p.topics || []).forEach((t) => set.add(t)));
    return ["all", ...Array.from(set)];
  }, [posts]);

  // Filter + search + sort
  const filtered = useMemo(() => {
    let list = [...posts];

    // Tab filter
    if (tab !== "all") {
      list = list.filter((p) => p.type === tab);
    }

    // Topic filter
    if (topicFilter !== "all") {
      list = list.filter((p) => (p.topics || []).includes(topicFilter));
    }

    // Location filter (contains, case-insensitive)
    const loc = locationFilter.trim().toLowerCase();
    if (loc) {
      list = list.filter((p) => (p.location || "").toLowerCase().includes(loc));
    }

    // Search in title/desc
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (p) =>
          (p.title || "").toLowerCase().includes(q) ||
          (p.desc || "").toLowerCase().includes(q)
      );
    }

    // Sort
    switch (sortBy) {
      case "date_asc":
        list.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
        break;
      case "title_asc":
        list.sort((a, b) => (a.title || "").localeCompare(b.title || ""));
        break;
      case "title_desc":
        list.sort((a, b) => (b.title || "").localeCompare(a.title || ""));
        break;
      case "date_desc":
      default:
        list.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        break;
    }

    return list;
  }, [posts, tab, topicFilter, locationFilter, search, sortBy]);

  function handleFormChange(e) {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    // Basic validation
    if (!form.title.trim()) {
      alert("Please add a title.");
      return;
    }
    if (!form.desc.trim()) {
      alert("Please add a short description.");
      return;
    }

    const newPost = {
      id: `p-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      type: form.type, // "news" | "blog"
      title: form.title.trim(),
      desc: form.desc.trim(),
      href: form.href.trim() || "#",
      topics: normalizeTopics(form.topics),
      location: form.location.trim() || "Global",
      imageUrl: form.imageUrl.trim() || "",
      createdAt: Date.now(),
    };

    setPosts((prev) => [newPost, ...prev]);
    // Reset form (keep type as-is to make multiple adds easier)
    setForm((f) => ({
      ...f,
      title: "",
      desc: "",
      href: "",
      topics: "",
      location: "",
      imageUrl: "",
    }));
    // Switch to the selected tab to show the new item prominently
    if (tab !== "all" && tab !== newPost.type) {
      setTab(newPost.type);
    }
  }

  function removePost(id) {
    if (!confirm("Delete this post?")) return;
    setPosts((prev) => prev.filter((p) => p.id !== id));
  }

  const inputBase =
    "w-full rounded-md border bg-white px-3 py-2 text-sm shadow-sm outline-none " +
    "border-gray-300 focus:border-brand-500 focus:ring-2 focus:ring-brand-200 " +
    "dark:bg-gray-900 dark:border-gray-700 dark:text-gray-100 dark:placeholder:text-gray-500";

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      {/* Title */}
      <header className="relative overflow-hidden rounded-3xl border border-gray-200 bg-gradient-to-br from-white to-gray-50 p-6 shadow-sm dark:border-gray-800 dark:from-gray-950 dark:to-gray-900">
        <div className="pointer-events-none absolute inset-0 opacity-60">
          <div className="absolute -top-24 -right-24 h-56 w-56 rounded-full bg-brand-500/10 blur-3xl" />
          <div className="absolute -bottom-24 -left-24 h-56 w-56 rounded-full bg-indigo-500/10 blur-3xl" />
        </div>

        <h1 className={`relative text-3xl font-extrabold tracking-tight ${textPrimary}`}>
          AI News &amp; Community
        </h1>
        <p className={`relative mt-2 max-w-3xl ${textSecondary}`}>
          Discover the latest on AI and share your own insights. Use the filters
          below to refine results. Your posts are stored locally in your
          browser.
        </p>

        <div className="relative mt-4 flex flex-wrap items-center gap-2 text-xs">
          <span className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-1 dark:border-gray-800 dark:bg-gray-900">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            <span className={textMuted}>Local posts enabled</span>
          </span>
          <span className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-1 dark:border-gray-800 dark:bg-gray-900">
            <span className="h-2 w-2 rounded-full bg-blue-500" />
            <span className={textMuted}>Filters &amp; search on top</span>
          </span>
        </div>
      </header>

      {/* Tabs + Filters (TOP) */}
      <section className={`mt-6 ${surface} rounded-2xl p-4 shadow-sm`}>
        {/* Tabs */}
        <div className="flex flex-wrap items-center gap-2">
          {TYPE_OPTIONS.map((t) => (
            <button
              key={t.value}
              onClick={() => setTab(t.value)}
              className={`px-3 py-2 rounded-md text-sm border transition focus:outline-none focus:ring-2 focus:ring-brand-300 ${
                tab === t.value
                  ? "bg-gradient-to-r from-brand-600 to-brand-700 text-white border-brand-600 shadow"
                  : `bg-white dark:bg-gray-900 dark:border-gray-700 ${hoverSurface} ${textPrimary}`
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Filter controls */}
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="relative">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={inputBase}
              placeholder="Search title or description..."
              aria-label="Search posts"
            />
          </div>

          <select
            value={topicFilter}
            onChange={(e) => setTopicFilter(e.target.value)}
            className={inputBase}
            aria-label="Filter by topic"
          >
            {allTopics.map((t) => (
              <option key={t} value={t}>
                {t === "all" ? "All Topics" : t}
              </option>
            ))}
          </select>

          <input
            type="text"
            value={locationFilter}
            onChange={(e) => setLocationFilter(e.target.value)}
            className={inputBase}
            placeholder="Filter by location (e.g., Chennai)"
            aria-label="Filter by location"
          />

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className={inputBase}
            aria-label="Sort posts"
          >
            {SORT_OPTIONS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
      </section>

      {/* RESULTS / ALL POSTS (TOP, under filters) */}
      <section className="mt-8">
        <div className="flex items-center justify-between">
          <h2 className={`text-xl font-semibold ${textPrimary}`}>
            {tab === "all"
              ? "All Posts"
              : tab === "news"
              ? "News"
              : "Community Posts"}
          </h2>
          <p className={`text-sm ${textSecondary}`}>
            Showing <strong>{filtered.length}</strong> of {posts.length}
          </p>
        </div>

        {filtered.length === 0 ? (
          <div className={`${surface} mt-4 rounded-lg p-6 text-sm ${textSecondary}`}>
            No results. Try adjusting filters or scroll down to add a post.
          </div>
        ) : (
          <div className="mt-4 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((p) => (
              <article
                key={p.id}
                className={`group relative overflow-hidden rounded-2xl border bg-white shadow-sm transition 
                  hover:shadow-xl hover:-translate-y-0.5 dark:bg-gray-900 dark:border-gray-700`}
              >
                {/* Badge */}
                <span
                  className={`absolute right-3 top-3 z-10 inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold backdrop-blur
                    ${
                      p.type === "news"
                        ? "bg-blue-600/15 text-blue-700 ring-1 ring-blue-200 dark:text-blue-200 dark:ring-blue-900/40"
                        : "bg-emerald-600/15 text-emerald-700 ring-1 ring-emerald-200 dark:text-emerald-200 dark:ring-emerald-900/40"
                    }`}
                >
                  {p.type === "news" ? "News" : "Community"}
                </span>

                {/* Image */}
                <div className="relative aspect-video w-full overflow-hidden">
                  <img
                    src={p.imageUrl || PLACEHOLDER_IMG}
                    alt={p.title}
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    loading="lazy"
                  />
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/35 via-black/5 to-transparent opacity-90" />
                </div>

                {/* Body */}
                <div className="p-5">
                  <h3 className={`font-semibold ${textPrimary} line-clamp-2`}>
                    {p.title}
                  </h3>
                  <p className={`mt-1 text-sm ${textSecondary} line-clamp-3`}>
                    {p.desc}
                  </p>

                  {/* Topics */}
                  {p.topics?.length ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {p.topics.map((t, i) => (
                        <span
                          key={i}
                          className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs text-gray-700 dark:bg-gray-800 dark:text-gray-200"
                        >
                          #{t}
                        </span>
                      ))}
                    </div>
                  ) : null}

                  {/* Footer */}
                  <div className={`mt-4 flex items-center justify-between text-xs ${textMuted}`}>
                    <span className="truncate">
                      {p.location || "Global"} • {formatDate(p.createdAt)}
                    </span>

                    <div className="flex items-center gap-3">
                      {p.href && p.href !== "#" && (
                        <a
                          href={p.href}
                          className="text-brand-700 hover:text-brand-800 dark:text-brand-300 dark:hover:text-brand-200 underline underline-offset-2"
                          target="_blank"
                          rel="noreferrer"
                        >
                          Open
                        </a>
                      )}
                      <button
                        onClick={() => removePost(p.id)}
                        className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                        title="Delete this post"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>

                {/* subtle border glow on hover */}
                <div className="pointer-events-none absolute inset-0 opacity-0 transition group-hover:opacity-100">
                  <div className="absolute inset-0 rounded-2xl ring-1 ring-brand-500/15" />
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {/* SHARE SOMETHING — kept at the BOTTOM/END */}
      <section className={`mt-12 ${surface} rounded-2xl p-6 shadow-sm`}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className={`text-lg font-semibold ${textPrimary}`}>
              Share something (News or Blog)
            </h2>
            <p className={`mt-1 text-sm ${textSecondary}`}>
              Add your post below. Choose <strong>News</strong> for external
              articles or <strong>Community</strong> for your own write-up. Images
              are optional but recommended for a nicer card.
            </p>
          </div>

          <span className="hidden sm:inline-flex items-center rounded-full bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700 dark:bg-brand-950/30 dark:text-brand-200">
            ✨ Make it shareable
          </span>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className={`text-sm font-medium ${textPrimary}`}>Type</span>
            <select
              name="type"
              value={form.type}
              onChange={handleFormChange}
              className={`mt-1 ${inputBase}`}
            >
              <option value="news">News</option>
              <option value="blog">Community</option>
            </select>
          </label>

          <label className="block sm:col-span-1">
            <span className={`text-sm font-medium ${textPrimary}`}>Title</span>
            <input
              name="title"
              value={form.title}
              onChange={handleFormChange}
              className={`mt-1 ${inputBase}`}
              placeholder="Catchy headline"
              required
            />
          </label>

          <label className="block sm:col-span-2">
            <span className={`text-sm font-medium ${textPrimary}`}>Description</span>
            <textarea
              name="desc"
              value={form.desc}
              onChange={handleFormChange}
              className={`mt-1 ${inputBase}`}
              placeholder="What is this about?"
              rows={3}
              required
            />
          </label>

          <label className="block">
            <span className={`text-sm font-medium ${textPrimary}`}>
              Link (optional for Community, recommended for News)
            </span>
            <input
              name="href"
              value={form.href}
              onChange={handleFormChange}
              className={`mt-1 ${inputBase}`}
              placeholder="https://example.com/article"
            />
          </label>

          <label className="block">
            <span className={`text-sm font-medium ${textPrimary}`}>
              Topics (comma-separated)
            </span>
            <input
              name="topics"
              value={form.topics}
              onChange={handleFormChange}
              className={`mt-1 ${inputBase}`}
              placeholder="LLMs, RAG, Computer Vision"
            />
          </label>

          <label className="block">
            <span className={`text-sm font-medium ${textPrimary}`}>Location</span>
            <input
              name="location"
              value={form.location}
              onChange={handleFormChange}
              className={`mt-1 ${inputBase}`}
              placeholder="City, Country"
            />
          </label>

          <label className="block">
            <span className={`text-sm font-medium ${textPrimary}`}>Image URL (optional)</span>
            <input
              name="imageUrl"
              value={form.imageUrl}
              onChange={handleFormChange}
              className={`mt-1 ${inputBase}`}
              placeholder="https://example.com/cover.jpg"
            />
          </label>

          <div className="sm:col-span-2 flex flex-wrap items-center gap-3 pt-1">
            <button
              type="submit"
              className="inline-flex px-4 py-2 rounded-md bg-gradient-to-r from-brand-600 to-brand-700 text-white hover:from-brand-700 hover:to-brand-800 shadow-sm"
            >
              Post
            </button>

            <button
              type="button"
              onClick={() =>
                setForm({
                  type: "news",
                  title: "",
                  desc: "",
                  href: "",
                  topics: "",
                  location: "",
                  imageUrl: "",
                })
              }
              className={`inline-flex px-4 py-2 rounded-md border ${hoverSurface} dark:border-gray-700 ${textPrimary}`}
            >
              Reset
            </button>

            <span className={`ml-auto text-xs ${textMuted}`}>
              Tip: Add topics like <strong>#RAG</strong>, <strong>#LLMs</strong> to boost discovery.
            </span>
          </div>
        </form>
      </section>
    </div>
  );
}
