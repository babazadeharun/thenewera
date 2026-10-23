"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  LayoutDashboard,
  Users,
  Target,
  Mail,
  CheckSquare,
  CalendarDays,
  FileText,
  Wallet,
  BarChart3,
  Zap,
  Settings,
  Building2,
  Bell,
  Menu,
  X,
  Search,
  UserRound,
} from "lucide-react";
import { api, dt, Modal, Table, roleNames, type R } from "./shared";
import Editor from "./Editor";
import DailyFocus from "./DailyFocus";
import Sections from "./Sections";
import Advanced from "./Advanced";
const tabs = [
  ["overview", "İcmal", LayoutDashboard],
  ["customers", "Müştərilər", Users],
  ["sales", "Satışlar", Target],
  ["messages", "Mesajlar", Mail],
  ["tasks", "Tapşırıqlar", CheckSquare],
  ["calendar", "Təqvim", CalendarDays],
  ["quotes", "Təkliflər", FileText],
  ["payments", "Ödənişlər", Wallet],
  ["reports", "Hesabatlar", BarChart3],
  ["automation", "Avtomatlaşdırma", Zap],
  ["team", "Komanda", Users],
  ["settings", "Ayarlar", Settings],
  ["billing", "Abunəlik", Wallet],
  ["inbox", "Yazışma mərkəzi", Mail],
  ["imports", "Excel / CSV importu", FileText],
  ["approvals", "Təsdiqlər", CheckSquare],
  ["booking", "Rezervasiya", CalendarDays],
  ["trash", "Silinmiş qeydlər", FileText],
  ["portal", "Kabinet müraciətləri", Users],
] as const;
const recordKinds = [
  "customers",
  "sales",
  "messages",
  "tasks",
  "calendar",
  "quotes",
  "payments",
];
export default function Workspace({
  id,
  support,
}: {
  id: string;
  support: string;
}) {
  const [meta, setMeta] = useState<R | null>(null),
    [companies, setCompanies] = useState<R[]>([]),
    [section, setSection] = useState("overview"),
    [q, setQ] = useState(""),
    [status, setStatus] = useState(""),
    [assignee, setAssignee] = useState(""),
    [pipeline, setPipeline] = useState("main"),
    [views, setViews] = useState<R[]>([]),
    [from, setFrom] = useState(""),
    [to, setTo] = useState(""),
    [page, setPage] = useState(1),
    [data, setData] = useState<R>({}),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [open, setOpen] = useState(false),
    [notifications, setNotifications] = useState(false),
    [editing, setEditing] = useState<R | null | false>(false);
  const side = useRef<HTMLElement>(null);
  const url = useCallback((part: string) => {
    const u = new URL("/api/workspace/" + id + "/" + part, location.origin);
    if (support) u.searchParams.set("support", support);
    return u.pathname + u.search;
  }, [id, support]);
  async function refreshMeta() {
    const m = await api(url("meta"));
    setMeta(m);
    return m;
  }
  useEffect(() => {
    refreshMeta().catch((e) => setError(e.message));
    if (!support)
      api("/api/workspace")
        .then((h) => setCompanies(h.memberships))
        .catch(() => {});
    setSection(
      new URLSearchParams(location.search).get("section") || "overview",
    );
  }, [id]);
  useEffect(() => {
    const media = matchMedia("(max-width:800px)");
    const reset = () => {
      if (!media.matches) setOpen(false);
    };
    media.addEventListener("change", reset);
    return () => media.removeEventListener("change", reset);
  }, []);
  const can = (m: string, op = "read") =>
    Boolean(meta?.permissions[m]?.[op] && meta.permissions[m][op] !== "NONE");
  const writable = Boolean(
    meta &&
      ["TRIAL", "ACTIVE"].includes(meta.company.state) &&
      meta.support !== "READ",
  );
  const query = new URLSearchParams({
    q,
    status,
    assigneeId: assignee,
    page: String(page),
    from,
    to,
    pipelineId: section === "sales" ? pipeline : "",
  }).toString();
  async function load() {
    if (
      !meta || section === "overview" ||
      ["inbox", "imports", "approvals", "booking", "trash", "portal"].includes(
        section,
      )
    )
      return;
    const op = recordKinds.includes(section)
      ? section
      : section === "overview" || section === "reports"
        ? "reports"
        : section === "automation"
          ? "rules"
          : section === "settings"
            ? "history"
            : section;
    try {
      if (section === "overview" && !can("reports")) {
        setData({});
        return;
      }
      setData(await api(url(op + "?" + query)));
    } catch (e) {
      setData({});
      setError((e as Error).message);
    }
  }
  useEffect(() => {
    if (
      !meta || section === "overview" ||
      ["inbox", "imports", "approvals", "booking", "trash", "portal"].includes(
        section,
      )
    )
      return;
    let active = true;
    const t = setTimeout(async () => {
      const op = recordKinds.includes(section)
        ? section
        : section === "overview" || section === "reports"
          ? "reports"
          : section === "automation"
            ? "rules"
            : section === "settings"
              ? "history"
              : section;
      try {
        if (section === "overview" && !can("reports")) {
          if (active) setData({});
          return;
        }
        const d = await api(url(op + "?" + query));
        if (active) setData(d);
      } catch (e) {
        if (active) {
          setData({});
          setError((e as Error).message);
        }
      }
    }, 200);
    return () => {
      active = false;
      clearTimeout(t);
    };
  }, [section, q, status, assignee, page, from, to, pipeline, Boolean(meta)]);
  useEffect(() => {
    if (!open) return;
    const focus = document.activeElement as HTMLElement;
    side.current?.querySelector<HTMLButtonElement>("button")?.focus();
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
      if (e.key === "Tab") {
        const nodes =
          side.current?.querySelectorAll<HTMLElement>("a,button,select");
        if (nodes?.length) {
          const first = nodes[0],
            last = nodes[nodes.length - 1];
          if (e.shiftKey && document.activeElement === first) {
            e.preventDefault();
            last.focus();
          } else if (!e.shiftKey && document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    };
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("keydown", key);
      focus?.focus();
    };
  }, [open]);
  useEffect(() => {
    if (meta)
      api(url("views"))
        .then(setViews)
        .catch(() => {});
  }, [Boolean(meta), section]);
  function tab(s: string) {
    setSection(s);
    setPage(1);
    setQ("");
    setStatus("");
    setData({});
    setError("");
    setOpen(false);
    const u = new URL(location.href);
    u.searchParams.set("section", s);
    history.replaceState(null, "", u);
  }
  async function action(op: string, b: R) {
    setError("");
    const result = await api(url(op), b);
    if (result.notice) setNotice(result.notice);
    await refreshMeta();
    await load();
    return result;
  }
  async function welcomed(team = false) {
    try {
      await api(url("welcome"), {});
      await refreshMeta();
      if (team) tab("team");
    } catch (e) {
      setError((e as Error).message);
    }
  }
  async function move(item: R, target: string) {
    if (!writable || !can("sales", "update")) return;
    let next: R = { ...item, stage: target, status: "OPEN" };
    if (target === "WON") next = { ...item, status: "WON" };
    if (target === "LOST") {
      const reason = prompt("İtirilmə səbəbi");
      if (!reason) return;
      next = {
        ...item,
        status: "LOST",
        data: { ...item.data, lossReason: reason },
      };
    }
    try {
      await action("sales/" + item.id, next);
    } catch (e) {
      setError((e as Error).message);
    }
  }
  if (!meta)
    return (
      <main className="crmScope crmHome">
        {error ? (
          <>
            <p className="crmError">{error}</p>
            <Link href="/workspace">Workspace-lərə qayıt</Link>
          </>
        ) : (
          <p>Workspace yüklənir…</p>
        )}
      </main>
    );
  const items = data.items || [],
    billing = can("billing"),
    visible = tabs.filter(
      ([s]) =>
        s === "overview" ||
        (s === "inbox" && can("messages")) ||
        (s === "imports" && can("customers", "create")) ||
        (s === "approvals" && can("quotes")) ||
        (s === "booking" && can("calendar")) ||
        (s === "portal" && can("customers")) ||
        (s === "trash" && recordKinds.some((k) => can(k, "delete"))) ||
        can(s),
    );
  return (
    <div className="crmScope crmShell">
      <a className="crmSkip" href="#crm-main">
        Məzmuna keç
      </a>
      {open && (
        <button
          className="crmBackdrop"
          aria-label="Menyunu bağla"
          onClick={() => setOpen(false)}
        />
      )}
      <aside
        className={open ? "crmSidebar isOpen" : "crmSidebar"}
        ref={side}
        role={open ? "dialog" : undefined}
        aria-modal={open ? true : undefined}
        aria-label="Workspace menyusu"
      >
        <div className="crmRow">
          <Link href="/" className="crmLogo">
            <img src="/new-era-logo.png" alt="New Era" />
          </Link>
          <button
            className="crmMobile"
            onClick={() => setOpen(false)}
            aria-label="Menyunu bağla"
          >
            <X />
          </button>
        </div>
        <div className="crmCompany">
          <Building2 />
          <select
            aria-label="Şirkət seç"
            value={id}
            onChange={(e) => (location.href = "/workspace/" + e.target.value)}
          >
            <option value={id}>{meta.company.name}</option>
            {companies
              .filter((c) => c.company.id !== id)
              .map((c) => (
                <option key={c.id} value={c.company.id}>
                  {c.company.name}
                </option>
              ))}
          </select>
        </div>
        <small>İŞ MƏKANI</small>
        <nav>
          {visible.map(([s, label, Icon]) => (
            <button
              className={section === s ? "active" : ""}
              key={s}
              onClick={() => tab(s)}
              aria-current={section === s ? "page" : undefined}
            >
              <Icon size={19} />
              {label}
            </button>
          ))}
        </nav>
        <Link href="/workspace">Şirkətlər / yeni Workspace</Link>
        <Link href="/workspace/demo">Nümunə demo</Link>
        <Link href="/">Sayta qayıt</Link>
      </aside>
      <div className="crmBody" inert={open ? true : undefined}>
        <header className="crmTop">
          <button
            className="crmMobile"
            onClick={() => setOpen(true)}
            aria-label="Menyunu aç"
          >
            <Menu />
          </button>
          <span>
            Workspace{" "}
            <b>› {tabs.find((t) => t[0] === section)?.[1] || section}</b>
          </span>
          <div className="crmActions">
            <button
              onClick={() => setNotifications(!notifications)}
              aria-expanded={notifications}
              aria-label="Bildirişlər"
            >
              <Bell size={19} />
              {meta.notifications.some((n: R) => !n.data.read) && <i />}
            </button>
            <Link href="/workspace/account">
              <UserRound size={17} />
              {meta.email}
            </Link>
          </div>
          {notifications && (
            <section className="crmNotifications crmPanel">
              <h3>Bildirişlər</h3>
              {meta.notifications.length ? (
                meta.notifications.map((n: R) => (
                  <button
                    key={n.id}
                    onClick={async () => {
                      await api(url("notification"), { id: n.id });
                      await refreshMeta();
                    }}
                  >
                    {n.data.read ? "✓ " : ""}
                    {n.data.title}
                  </button>
                ))
              ) : (
                <p>Yeni bildiriş yoxdur.</p>
              )}
            </section>
          )}
        </header>
        <main id="crm-main" className="crmContent">
          {meta.support && (
            <div className="crmSupport">
              Super Admin{" "}
              {meta.support === "READ" ? "baxış" : "dəstək dəyişiklikləri"}{" "}
              rejimi — {meta.company.name}
            </div>
          )}
          {billing &&
            meta.company.state === "TRIAL" &&
            !meta.member?.dismissedAt && (
              <div className="crmBanner">
                <span>
                  Pulsuz istifadə:{" "}
                  {Math.max(
                    0,
                    Math.ceil(
                      (new Date(meta.company.trialEnd).getTime() - Date.now()) /
                        86400000,
                    ),
                  )}{" "}
                  gün qalıb
                </span>
                <button onClick={() => tab("billing")}>Planlara bax</button>
                <button
                  aria-label="Bildirişi bağla"
                  onClick={() =>
                    action("dismiss", {}).catch((e) => setError(e.message))
                  }
                >
                  ×
                </button>
              </div>
            )}
          {!["TRIAL", "ACTIVE"].includes(meta.company.state) && (
            <p className="crmBanner">
              {meta.company.state === "SUSPENDED"
                ? "Workspace müvəqqəti dayandırılıb."
                : "Sınaq müddəti bitib. Mövcud məlumatlara baxa bilərsiniz."}{" "}
              {billing
                ? "Abunəlik bölməsindən aktivləşdirmə sorğusu göndərin."
                : "Davam etmək üçün şirkət rəhbəri abunəliyi aktivləşdirməlidir."}
            </p>
          )}
          <header className="crmHeading">
            <small>NEW ERA WORKSPACE</small>
            <h1>
              {tabs.find((t) => t[0] === section)?.[1] || "İş məkanı"}
              <em>.</em>
            </h1>
            <p>
              {meta.company.name} ·{" "}
              {meta.member ? roleNames[meta.member.role] : "Platforma dəstəyi"}
            </p>
          </header>
          {error && (
            <p className="crmError" role="alert">
              {error}
              <button onClick={() => setError("")}>×</button>
            </p>
          )}
          {notice && (
            <p className="crmBanner">
              {notice}
              <button onClick={() => setNotice("")}>×</button>
            </p>
          )}
          {(recordKinds.includes(section) || section === "reports") && (
            <section className="crmTools">
              <label>
                <Search size={17} />
                <input
                  aria-label="Axtar"
                  placeholder="Ad, e-poçt, telefon…"
                  value={q}
                  onChange={(e) => {
                    setQ(e.target.value);
                    setPage(1);
                  }}
                />
              </label>
              <select
                aria-label="Məsul əməkdaş filtri"
                value={assignee}
                onChange={(e) => {
                  setAssignee(e.target.value);
                  setPage(1);
                }}
              >
                <option value="">Bütün əlçatan əməkdaşlar</option>
                {meta.members.map((m: R) => (
                  <option key={m.id} value={m.id}>
                    {m.user.email}
                  </option>
                ))}
              </select>
              {section === "reports" ? (
                <>
                  <label>
                    Tarixdən
                    <input
                      type="date"
                      value={from}
                      onChange={(e) => setFrom(e.target.value)}
                    />
                  </label>
                  <label>
                    Tarixədək
                    <input
                      type="date"
                      value={to}
                      onChange={(e) => setTo(e.target.value)}
                    />
                  </label>
                </>
              ) : (
                <>
                  <select
                    aria-label="Status filtri"
                    value={status}
                    onChange={(e) => {
                      setStatus(e.target.value);
                      setPage(1);
                    }}
                  >
                    <option value="">Bütün statuslar</option>
                    {[
                      "OPEN",
                      "ACTIVE",
                      "ARCHIVED",
                      "WON",
                      "LOST",
                      "IN_PROGRESS",
                      "DONE",
                      "DRAFT",
                      "SENT",
                      "ACCEPTED",
                      "REJECTED",
                      "RECORDED",
                      "VOID",
                      "RECEIVED",
                    ].map((s) => (
                      <option key={s}>{s}</option>
                    ))}
                  </select>
                  {can(section, "export") && (
                    <a href={url("export/" + section + "?" + query)}>
                      İxrac et (CSV)
                    </a>
                  )}
                  {writable && can(section, "create") && (
                    <button
                      className="crmPrimary"
                      onClick={() => setEditing(null)}
                    >
                      + Yeni qeyd
                    </button>
                  )}
                </>
              )}
            </section>
          )}
          {recordKinds.includes(section) && (
            <div className="crmTools">
              {section === "sales" && (
                <select
                  aria-label="Satış prosesi"
                  value={pipeline}
                  onChange={(e) => {
                    setPipeline(e.target.value);
                    setPage(1);
                  }}
                >
                  <option value="main">Əsas satış</option>
                  {(meta.company.preferences?.pipelines || []).map((p: R) => (
                    <option value={p.id} key={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              )}
              <select
                aria-label="Yadda saxlanmış görünüş"
                defaultValue=""
                onChange={(e) => {
                  const view = views.find((v) => v.id === e.target.value)?.data;
                  if (view) {
                    setQ(view.q || "");
                    setStatus(view.status || "");
                    setAssignee(view.assigneeId || "");
                    setPipeline(view.pipelineId || "main");
                    setPage(1);
                  }
                }}
              >
                <option value="">Yadda saxlanmış görünüşlər</option>
                {views
                  .filter((v) => v.data.kind === section)
                  .map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.data.name}
                    </option>
                  ))}
              </select>
              <button
                onClick={async () => {
                  const name = prompt("Görünüşün adı");
                  if (!name) return;
                  try {
                    await action("view", {
                      name,
                      kind: section,
                      q,
                      status,
                      assigneeId: assignee,
                      pipelineId: pipeline,
                    });
                    setViews(await api(url("views")));
                  } catch (e) {
                    setError((e as Error).message);
                  }
                }}
              >
                Görünüşü saxla
              </button>
            </div>
          )}
          {recordKinds.includes(section) &&
            (section === "sales" ? (
              <section className="crmKanban">
                {[
                  ...(pipeline && pipeline !== "main"
                    ? (meta.company.preferences?.pipelines || []).find(
                        (p: R) => p.id === pipeline,
                      )?.stages || meta.company.stages
                    : meta.company.stages),
                  "WON",
                  "LOST",
                ].map((stage: string) => (
                  <div
                    key={stage}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      const item = items.find(
                        (x: R) => x.id === e.dataTransfer.getData("text/plain"),
                      );
                      if (item) move(item, stage);
                    }}
                  >
                    <h3>{stage}</h3>
                    {items
                      .filter((i: R) =>
                        stage === "WON" || stage === "LOST"
                          ? i.status === stage
                          : i.status === "OPEN" && i.stage === stage,
                      )
                      .map((i: R) => (
                        <article
                          className="crmCard"
                          key={i.id}
                          draggable={writable && can("sales", "update")}
                          onDragStart={(e) =>
                            e.dataTransfer.setData("text/plain", i.id)
                          }
                        >
                          <button
                            className="crmRecordTitle"
                            onClick={() => setEditing(i)}
                          >
                            {i.title}
                          </button>
                          <strong>
                            {i.amount} {i.currency}
                          </strong>
                          <small>{dt(i.dueAt)}</small>
                        </article>
                      ))}
                  </div>
                ))}
              </section>
            ) : section === "calendar" ? (
              <section className="crmCalendar">
                {items
                  .slice()
                  .sort((a: R, b: R) =>
                    String(a.dueAt).localeCompare(String(b.dueAt)),
                  )
                  .map((i: R) => (
                    <button
                      className="crmPanel"
                      key={i.id}
                      onClick={() => setEditing(i)}
                    >
                      <small>
                        {dt(i.dueAt)} ·{" "}
                        {i.dueAt
                          ? new Date(i.dueAt).toLocaleTimeString("az-AZ", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : ""}
                      </small>
                      <h3>{i.title}</h3>
                      <span>{i.status}</span>
                    </button>
                  ))}
              </section>
            ) : (
              <section className="crmPanel crmTableWrap">
                <table>
                  <thead>
                    <tr>
                      <th>Ad</th>
                      <th>Status</th>
                      <th>Əlaqə / məbləğ</th>
                      <th>Son tarix</th>
                      <th>Məsul şəxs</th>
                      <th>Əməliyyat</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((i: R) => (
                      <tr key={i.id}>
                        <td>
                          <button
                            className="crmRecordTitle"
                            onClick={() => setEditing(i)}
                          >
                            {i.title}
                          </button>
                        </td>
                        <td>
                          <span className="crmBadge">{i.status}</span>
                        </td>
                        <td>
                          {section === "customers"
                            ? `${i.email || ""} ${i.phone || ""}`
                            : ["quotes", "payments"].includes(section)
                              ? `${i.amount} ${i.currency}`
                              : i.data.priority || "—"}
                        </td>
                        <td>{dt(i.dueAt)}</td>
                        <td>
                          {meta.members.find((m: R) => m.id === i.assigneeId)
                            ?.user.email || "—"}
                        </td>
                        <td>
                          <div className="crmActions">
                            {section === "quotes" && can(section, "export") && (
                              <a href={url("pdf/" + i.id)}>PDF</a>
                            )}
                            {section === "messages" &&
                              i.status === "DRAFT" &&
                              !i.data.delivery &&
                              writable &&
                              can(section, "update") && (
                                <button
                                  onClick={async () => {
                                    if (
                                      !confirm(
                                        "Bu mesajı həqiqətən göndərmək istəyirsiniz?",
                                      )
                                    )
                                      return;
                                    try {
                                      await action("send", {
                                        id: i.id,
                                        confirm: true,
                                      });
                                    } catch (e) {
                                      setError((e as Error).message);
                                    }
                                  }}
                                >
                                  Göndər
                                </button>
                              )}
                            {writable && can(section, "delete") && (
                              <button
                                onClick={async () => {
                                  if (confirm("Qeydi silirsiniz?"))
                                    try {
                                      await action("delete", {
                                        id: i.id,
                                        version: i.version,
                                      });
                                    } catch (e) {
                                      setError((e as Error).message);
                                    }
                                }}
                              >
                                Sil
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {!items.length && (
                  <p className="crmEmpty">
                    Məlumat yoxdur. İcazəniz varsa yeni qeyd əlavə edin.
                  </p>
                )}
              </section>
            ))}
          {recordKinds.includes(section) && (
            <div className="crmPagination">
              <button
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Əvvəlki
              </button>
              <span>
                {page} · Cəmi {data.total || 0}
              </span>
              <button
                disabled={page * 25 >= (data.total || 0)}
                onClick={() => setPage((p) => p + 1)}
              >
                Növbəti
              </button>
            </div>
          )}
          {section === "overview" && <DailyFocus url={url} meta={meta} writable={writable} navigate={tab} openRecord={item=>{tab(item.kind);setEditing(item);}}/>}
          {section === "reports" && (
            <>
              <div className="crmCards">
                {[
                  ["Satışlar", data.sales],
                  ["Qazanılmış", data.won],
                  [
                    "Konversiya",
                    data.conversion === undefined
                      ? undefined
                      : data.conversion + "%",
                  ],
                  ["Gecikmiş işlər", data.overdue],
                ]
                  .filter((x) => x[1] !== undefined)
                  .map(([label, value]) => (
                    <article key={String(label)} className="crmCard">
                      <Target />
                      <small>{label}</small>
                      <strong>{value}</strong>
                    </article>
                  ))}
              </div>
              {data.received && (
                <section className="crmPanel">
                  <h2>Faktiki daxilolmalar</h2>
                  <Table
                    rows={Object.entries(data.received).map(
                      ([currency, amount]) => ({
                        Valyuta: currency,
                        Məbləğ: amount,
                      }),
                    )}
                  />
                </section>
              )}
              {data.balances && (
                <section className="crmPanel">
                  <h2>Razılaşdırılmış məbləğ və qalıq borc</h2>
                  <Table
                    rows={data.balances.map((b: R) => ({
                      Satış: b.title,
                      Valyuta: b.currency,
                      Razılaşdırılıb: b.agreed,
                      Ödənilib: b.received,
                      Qalıq: b.balance,
                    }))}
                  />
                </section>
              )}
              {section === "reports" && (
                <>
                  <section className="crmPanel">
                    <h2>Müraciət mənbələri</h2>
                    <Table
                      rows={Object.entries(data.sources || {}).map(
                        ([k, v]) => ({ Mənbə: k, Say: v }),
                      )}
                    />
                  </section>
                  <section className="crmPanel">
                    <h2>Mərhələdə gözləmə</h2>
                    <Table
                      rows={(data.stageWait || []).map((x: R) => ({
                        Satış: x.title,
                        Mərhələ: x.stage,
                        Gün: x.days,
                      }))}
                    />
                  </section>
                  <section className="crmPanel">
                    <h2>Əməkdaş nəticələri</h2>
                    <Table
                      rows={Object.entries(data.employees || {}).map(
                        ([key, v]) => ({
                          Əməkdaş:
                            meta.members.find((m: R) => m.id === key)?.user
                              .email || "Təyin edilməyib",
                          Satış: (v as R).total,
                          Qazanılmış: (v as R).won,
                        }),
                      )}
                    />
                  </section>
                </>
              )}
              {!can("reports") && (
                <section className="crmPanel">
                  <h2>Xoş gəlmisiniz</h2>
                  <p>İcazənizə uyğun bölmələri soldakı menyudan seçin.</p>
                </section>
              )}
            </>
          )}
          {["team", "settings", "billing", "automation", "messages"].includes(
            section,
          ) && (
            <Sections
              section={section}
              data={data}
              meta={meta}
              url={url}
              action={action}
              writable={writable}
              refresh={refreshMeta}
              error={setError}
            />
          )}
          <Advanced
            section={section}
            meta={meta}
            url={url}
            action={action}
            writable={writable}
            error={setError}
          />
          {editing !== false && (
            <Editor
              key={section + (editing?.id || "new")}
              kind={section}
              item={editing}
              meta={meta}
              url={url}
              writable={writable}
              close={() => setEditing(false)}
              saved={async () => { await load(); await refreshMeta(); }}
            />
          )}
          {billing &&
            !meta.support &&
            meta.member &&
            !meta.member.welcomedAt && (
              <Modal
                title="Workspace-iniz hazırdır — 1 ay pulsuz istifadə edin!"
                close={() => welcomed()}
              >
                {error && <p className="crmError">{error}</p>}
                <p>
                  Komandanızı dəvət edin, müştərilərinizi əlavə edin və satış
                  prosesinizi idarə etməyə başlayın. Pulsuz istifadəniz{" "}
                  {dt(meta.company.trialEnd)}-dək aktivdir. Avtomatik ödəniş
                  tutulmayacaq.
                </p>
                <div className="crmActions">
                  <button className="crmPrimary" onClick={() => welcomed(true)}>
                    Komandanı dəvət et
                  </button>
                  <button onClick={() => welcomed()}>İstifadəyə başla</button>
                </div>
              </Modal>
            )}
        </main>
      </div>
    </div>
  );
}
