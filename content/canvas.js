// Talks to the Canvas REST API and keeps a cached copy of your user, courses and planner items.
"use strict";

function csrfToken()
{
  const m = document.cookie.match(/(?:^|;\s*)_csrf_token=([^;]+)/);
  return m ? decodeURIComponent(m[1]) : "";
}
async function api(path, opts = {})
{
  return (await apiPage(path, opts)).data;
}
// every page of a list: Canvas returns 100 at most per request and links the next page in the Link header
async function apiAll(path, maxPages = 10)
{
  let out = [];
  let next = path;
  for (let i = 0; next && i < maxPages; i++)
  {
    const page = await apiPage(next);
    out = out.concat(page.data || []);
    next = page.next;
  }
  return out;
}
async function apiPage(path, { method = "GET", body } = {})
{
  const res = await fetch(path, {
    method,
    credentials: "same-origin",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      "X-Requested-With": "XMLHttpRequest",
      "X-CSRF-Token": csrfToken(),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`Canvas API ${res.status}`);
  const text = await res.text();
  const link = (res.headers.get("Link") || "").match(/<([^>]+)>;\s*rel="next"/);
  return { data: text ? JSON.parse(text.replace(/^while\(1\);/, "")) : null, next: link ? link[1] : null };
}

// show the cached copy right away, then refresh it in the background (stale-while-revalidate)
async function swr(name, maxAgeMs, loader, onData)
{
  const cached = await store.get("local", lk(name));
  if (cached) onData(cached.v);
  if (cached && Date.now() - cached.t < maxAgeMs) return;
  try
  {
    const v = await loader();
    await store.set("local", lk(name), { t: Date.now(), v });
    onData(v);
  }
  catch (err)
  {
    if (!cached) onData(null, err);
  }
}

const state = {
  user: null,
  courses: [],
  colors: {},
  items: null,
  itemsError: false,
  todos: [],
  wins: {},
  recents: [],
};
const KEEP_TYPES = new Set([
  "assignment",
  "quiz",
  "discussion_topic",
  "sub_assignment",
  "wiki_page",
  "planner_note",
]);

const loadUser = async () =>
{
  const u = await api("/api/v1/users/self");
  return { name: u.short_name || u.name || "" };
};
const loadCourses = async () =>
{
  let list = await apiAll("/api/v1/users/self/favorites/courses?per_page=100");
  if (!list || !list.length) list = await apiAll("/api/v1/courses?enrollment_state=active&per_page=100");
  let colors = {};
  try
  {
    colors = (await api("/api/v1/users/self/colors")).custom_colors || {};
  }
  catch (e)
  {
    /* optional */
  }
  return {
    courses: (list || [])
      .filter(c => c && c.name && !c.access_restricted_by_date)
      .map(c => ({ id: c.id, name: cleanCourseName(c.name), full: c.name, code: c.course_code || "" })),
    colors,
  };
};
const loadItems = async () =>
{
  const start = new Date();
  start.setDate(start.getDate() - 14);
  start.setHours(0, 0, 0, 0);
  const end = new Date();
  end.setDate(end.getDate() + 28);
  const raw = await apiAll(
    `/api/v1/planner/items?per_page=100&start_date=${encodeURIComponent(start.toISOString())}&end_date=${encodeURIComponent(end.toISOString())}`,
  );
  return (raw || [])
    .filter(i => KEEP_TYPES.has(i.plannable_type))
    .map(i =>
    {
      const p = i.plannable || {};
      const s = i.submissions || {};
      return {
        key: `${i.plannable_type}:${i.plannable_id}`,
        type: i.plannable_type,
        id: i.plannable_id,
        title: p.title || p.name || "Untitled",
        due: i.plannable_date || p.due_at || p.todo_date || null,
        url: i.html_url || null,
        course: cleanCourseName(i.context_name || ""),
        courseId: i.course_id || null,
        points: typeof p.points_possible === "number" ? p.points_possible : null,
        submitted: !!(s.submitted || s.graded || s.excused),
        missing: !!s.missing,
        overrideId: i.planner_override ? i.planner_override.id : null,
        marked: !!(i.planner_override && i.planner_override.marked_complete),
      };
    });
};

const isDone = it => it.submitted || it.marked;
