// Shared employee card template (vertical 300x480, maroon design)
// Used by EmployeeManagerModal export buttons + employeeCard.tsx page

export const CARD_W = 300;
export const CARD_H = 480;

// Card fonts
export const CARD_FONT_CSS = `@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@500;600;700&family=IBM+Plex+Sans:wght@300;400;500;600;700&display=swap');`;
export const CARD_FONT_FAMILY = `'IBM Plex Sans', ui-sans-serif, system-ui, sans-serif`;
export const SERIF_FAMILY = `'Playfair Display', ui-serif, Georgia, serif`;

let fontLoaded = false;
let fontLoadingPromise: Promise<void> | null = null;

export async function ensureCardFonts(): Promise<void> {
  if (fontLoaded) return;
  // Deduplicate concurrent calls — chỉ chạy 1 lần dù gọi nhiều lần đồng thời
  if (fontLoadingPromise) return fontLoadingPromise;

  fontLoadingPromise = (async () => {
    const style = document.createElement("style");
    style.textContent = CARD_FONT_CSS;
    document.head.appendChild(style);
    if ((document as any).fonts?.ready) {
      await (document as any).fonts.ready;
    }
    fontLoaded = true;
  })();

  return fontLoadingPromise;
}

// Pre-import html-to-image khi idle, tránh dynamic import delay lúc click
let htmlToImagePromise: Promise<typeof import("html-to-image")> | null = null;

export function preloadHtmlToImage(): void {
  if (htmlToImagePromise) return;
  if (typeof window === "undefined") return;
  const schedule =
    (window as any).requestIdleCallback ??
    ((cb: () => void) => setTimeout(cb, 200));
  schedule(() => {
    htmlToImagePromise = import("html-to-image");
  });
}

async function getHtmlToImage() {
  if (!htmlToImagePromise) {
    htmlToImagePromise = import("html-to-image");
  }
  return htmlToImagePromise;
}

// ─── Preload tất cả <img> bên trong element trước khi capture ───────────────
async function preloadImages(el: HTMLElement): Promise<void> {
  const imgs = Array.from(el.querySelectorAll("img")) as HTMLImageElement[];
  await Promise.all(
    imgs.map(async (img) => {
      try {
        if (img.complete && img.naturalWidth > 0) return;
        img.crossOrigin = "anonymous";
        await new Promise<void>((resolve) => {
          img.onload = () => resolve();
          img.onerror = () => resolve();
        });
      } catch {
        // ignore
      }
    })
  );
}

// skipRaf: true khi caller đã chờ rAF bên ngoài (captureOne dùng)
export async function captureCardEl(
  el: HTMLElement,
  skipRaf = false
): Promise<string> {
  await ensureCardFonts();
  await preloadImages(el);

  if (!skipRaf) {
    await new Promise((r) => requestAnimationFrame(r));
    await new Promise((r) => requestAnimationFrame(r));
  }

  const { toPng } = await getHtmlToImage();

  return toPng(el, {
    pixelRatio: 2,
    backgroundColor: "#FAFAFA",
    width: CARD_W,
    height: CARD_H,
    skipAutoScale: true,
    cacheBust: false,
    style: { borderRadius: "20px" },
  });
}

// ─── captureOne helper — front + back song song ──────────────────────────────
export async function captureOne(
  front: FrontData,
  back: BackData,
  qrCache?: { fanpageQr: string; waQr: string }
): Promise<{ front: string; back: string }> {
  const container = document.createElement("div");
  container.style.cssText =
    "position:fixed;left:0;top:0;opacity:0;pointer-events:none;z-index:99999;display:flex;gap:8px;";
  document.body.appendChild(container);

  try {
    // Tạo cả 2 element song song
    const [fEl, bEl] = await Promise.all([
      Promise.resolve(makeFrontEl(front)),
      qrCache
        ? Promise.resolve(makeBackEl(back, qrCache.fanpageQr, qrCache.waQr))
        : makeBackElAsync(back),
    ]);

    container.appendChild(fEl);
    container.appendChild(bEl);

    // Font + image preload song song cho cả 2
    await Promise.all([ensureCardFonts(), preloadImages(fEl), preloadImages(bEl)]);

    // Chờ layout 1 lần duy nhất cho cả 2
    await new Promise((r) => requestAnimationFrame(r));
    await new Promise((r) => requestAnimationFrame(r));

    // Capture song song
    const [f, b] = await Promise.all([
      captureCardEl(fEl, true /* skipRaf */),
      captureCardEl(bEl, true /* skipRaf */),
    ]);

    return { front: f, back: b };
  } finally {
    document.body.removeChild(container);
  }
}

export const getInitials = (name: string) =>
  (name || "?")
    .trim()
    .split(/\s+/)
    .map((w) => w[0]?.toUpperCase() || "")
    .slice(-2)
    .join("");

export type FrontData = {
  name: string;
  nickname?: string;
  dob?: string;
  empCode: string;
  role: string;
  dept?: string;
  company?: string;
  photoUrl?: string;
  logoUrl?: string;
};

export type BackData = {
  company?: string;
  terms?: string;
  phone?: string;
  instagram?: string;
  whatsapp?: string;
  wechat?: string;
  fanpageUrl?: string;
  whatsappUrl?: string;
};

const MAROON = "#8B1A38";
const MAROON_DEEP = "#1A0A10";
const PINK_BG = "#F8EDF0";
const PINK_BORDER = "#E8C0CC";

// ─────────────────────────────────────────────────────────────────────────────
// FRONT face
// ─────────────────────────────────────────────────────────────────────────────
export function makeFrontEl(d: FrontData): HTMLDivElement {
  const el = document.createElement("div");
  el.style.cssText = `
    width:${CARD_W}px;height:${CARD_H}px;border-radius:20px;overflow:hidden;
    background:#FAFAFA;border:1.5px solid #ddd;display:flex;position:relative;
    font-family:${CARD_FONT_FAMILY};box-sizing:border-box;
  `;

  const ini = getInitials(d.name);
  const company = (d.company || "CÔNG TY").toUpperCase();

  const photoInner = d.photoUrl
    ? `<img src="${d.photoUrl}" crossorigin="anonymous" style="width:100%;height:100%;object-fit:cover;border-radius:7px;"/>`
    : `<span style="font-family:${SERIF_FAMILY};font-size:36px;font-weight:600;color:${MAROON};">${ini}</span>`;

  const logoInner = d.logoUrl
    ? `<img src="${d.logoUrl}" crossorigin="anonymous"
            style="width:54px;height:54px;object-fit:contain;border-radius:50%;"/>`
    : `<div style="display:flex;flex-direction:column;align-items:center;gap:2px;">
         <svg viewBox="0 0 20 20" width="22" height="22" fill="none" stroke="#C0A0A8" stroke-width="1.5">
           <rect x="2" y="5" width="16" height="12" rx="2"/>
           <circle cx="10" cy="11" r="3"/>
           <path d="M7 5V4a1 1 0 011-1h4a1 1 0 011 1v1" stroke-linecap="round"/>
         </svg>
         <span style="font-size:7px;color:#C0A0A8;letter-spacing:.4px;text-transform:uppercase;">Logo</span>
       </div>`;

  el.innerHTML = `
<div style="flex:1;display:flex;flex-direction:column;overflow:hidden;min-width:0;">
  <!-- Photo -->
  <div style="padding:20px 14px 12px;display:flex;justify-content:center;">
    <div style="width:130px;height:160px;border-radius:10px;
                background:linear-gradient(135deg,#F4C5CF,#E8889A);border:3px solid #fff;
                box-shadow:0 0 0 1.5px #ddd;overflow:hidden;display:flex;align-items:center;
                justify-content:center;position:relative;">
      ${photoInner}
    </div>
  </div>

  <!-- Name row -->
  <div style="padding:0 14px 14px;display:flex;flex-direction:column;">
    <div style="display:flex;align-items:baseline;gap:6px;margin-bottom:4px;">
      <span style="font-family:${SERIF_FAMILY};font-size:17px;font-weight:600;color:${MAROON_DEEP};
                   white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:130px;">
        ${escapeHtml(d.nickname || d.name)}
      </span>
      ${d.dob ? `<span style="font-size:10px;color:${MAROON};font-weight:500;white-space:nowrap;letter-spacing:.3px;">${escapeHtml(d.dob)}</span>` : ""}
    </div>
    <div style="height:.5px;background:#e0e0e0;margin:6px 0;"></div>

    ${field("Họ và tên", d.name.toUpperCase())}
    ${field("Mã nhân viên", d.empCode)}
    ${field("Chức vụ", d.role || "Nhân viên")}
  </div>

  <!-- Bottom: dept tag + logo -->
  <div style="margin-top:auto;padding:10px 14px;display:flex;align-items:center;gap:10px;
              border-top:.5px solid #eee;min-height:76px;">
    <span style="font-size:11.5px;color:${MAROON};background:${PINK_BG};border:1px solid ${PINK_BORDER};
                 border-radius:20px;padding:5px 14px;letter-spacing:.4px;font-weight:600;line-height:1.3;">
      ${escapeHtml(d.dept || "Phòng nhân sự")}
    </span>
    <div style="width:62px;height:62px;border-radius:50%;border:1.5px solid #C0A0A8;
                display:flex;align-items:center;justify-content:center;
                margin-left:auto;background:#fff;flex-shrink:0;overflow:hidden;">
      ${logoInner}
    </div>
  </div>
</div>

<!-- Vertical side strip -->
<div style="width:66px;background:${MAROON};display:flex;flex-direction:column;align-items:center;
            justify-content:center;flex-shrink:0;position:relative;">
  <div style="display:flex;flex-direction:column;gap:4px;margin-bottom:14px;">
    ${dot()}${dot()}${dot()}
  </div>
  <span style="font-family:${SERIF_FAMILY};font-size:15px;font-weight:700;color:#fff;
               letter-spacing:4px;text-transform:uppercase;writing-mode:vertical-rl;
               text-orientation:mixed;line-height:1;">${escapeHtml(company)}</span>
  <div style="display:flex;flex-direction:column;gap:4px;margin-top:14px;">
    ${dot()}${dot()}${dot()}
  </div>
</div>
`;
  return el;
}

// ─────────────────────────────────────────────────────────────────────────────
// BACK face — async version (QR local, không fetch network)
// ─────────────────────────────────────────────────────────────────────────────
export async function makeBackElAsync(d: BackData = {}): Promise<HTMLDivElement> {
  const fanpage = d.fanpageUrl || "https://facebook.com/cinnamonforest";
  const waUrl = d.whatsappUrl || "https://wa.me/84901234567";

  let fanpageQr = "";
  let waQr = "";
  try {
    const QRCode = await import("qrcode");
    [fanpageQr, waQr] = await Promise.all([
      QRCode.toDataURL(fanpage, { width: 78, margin: 0, color: { dark: "#000000", light: "#FFFFFF" } }),
      QRCode.toDataURL(waUrl, { width: 78, margin: 0, color: { dark: "#000000", light: "#FFFFFF" } }),
    ]);
  } catch {
    const qrUrl = (data: string) =>
      `https://api.qrserver.com/v1/create-qr-code/?size=160x160&margin=0&color=000000&bgcolor=FFFFFF&data=${encodeURIComponent(data)}`;
    fanpageQr = qrUrl(fanpage);
    waQr = qrUrl(waUrl);
  }

  return makeBackEl(d, fanpageQr, waQr);
}

// ─────────────────────────────────────────────────────────────────────────────
// BACK face — sync version (dùng khi đã có QR data URL sẵn)
// ─────────────────────────────────────────────────────────────────────────────
export function makeBackEl(d: BackData = {}, fanpageQr?: string, waQr?: string): HTMLDivElement {
  const el = document.createElement("div");
  el.style.cssText = `
    width:${CARD_W}px;height:${CARD_H}px;border-radius:20px;overflow:hidden;
    background:#FAFAFA;border:1.5px solid #ddd;display:flex;flex-direction:column;
    font-family:${CARD_FONT_FAMILY};box-sizing:border-box;
  `;

  const company = (d.company || "CÔNG TY").toUpperCase();
  const terms =
    d.terms ||
    "Thẻ này có hiệu lực đến hết năm 2026. Nếu tìm thấy, vui lòng liên hệ công ty hoặc trả lại cho người sở hữu.";

  const phone = d.phone || "0901 234 567";
  const ig = d.instagram || "@cinnamonforest";
  const wa = d.whatsapp || "+84 901 234 567";
  const wc = d.wechat || "cinnamonforest";

  const fanpage = d.fanpageUrl || "https://facebook.com/cinnamonforest";
  const waUrl = d.whatsappUrl || "https://wa.me/84901234567";

  const qrServerUrl = (data: string) =>
    `https://api.qrserver.com/v1/create-qr-code/?size=160x160&margin=0&color=000000&bgcolor=FFFFFF&data=${encodeURIComponent(data)}`;

  const finalFanpageQr = fanpageQr || qrServerUrl(fanpage);
  const finalWaQr = waQr || qrServerUrl(waUrl);

  el.innerHTML = `
<!-- Top brand bar -->
<div style="background:${MAROON};padding:0 20px;height:72px;display:flex;align-items:center;
            justify-content:center;flex-shrink:0;">
  <span style="font-family:${SERIF_FAMILY};font-size:22px;font-weight:700;color:#fff;
               letter-spacing:6px;text-transform:uppercase;text-align:center;line-height:1.2;">
    ${escapeHtml(company)}
  </span>
</div>

<!-- Body -->
<div style="flex:1;display:flex;flex-direction:column;padding:14px 20px 10px;overflow:hidden;">

  <!-- Terms -->
  <div style="margin-bottom:12px;">
    <div style="font-size:9.5px;font-weight:700;color:${MAROON_DEEP};letter-spacing:2.5px;
                text-transform:uppercase;padding-bottom:6px;border-bottom:1px solid #e0e0e0;
                margin-bottom:9px;text-align:center;">Điều khoản &amp; Điều kiện</div>
    <p style="font-size:11px;color:#666;line-height:1.6;letter-spacing:.2px;margin:0;">${escapeHtml(terms)}</p>
  </div>

  <!-- Contact -->
  <div style="display:flex;flex-direction:column;">
    <div style="font-size:9.5px;font-weight:700;color:${MAROON_DEEP};letter-spacing:2.5px;
                text-transform:uppercase;padding-bottom:6px;border-bottom:1px solid #e0e0e0;
                margin-bottom:9px;text-align:center;">Liên hệ</div>

    <div style="display:flex;flex-direction:column;gap:8px;">
      ${contactRow(iconPhone(), phone)}
      ${contactRow(iconInstagram(), ig)}
      ${contactRow(iconWhatsapp(), wa)}
      ${contactRow(iconWechat(), wc)}
    </div>
  </div>
</div>

<!-- Wave + 2 QR -->
<div style="position:relative;height:150px;flex-shrink:0;overflow:hidden;">
  <svg viewBox="0 0 300 150" preserveAspectRatio="none"
       style="position:absolute;inset:0;width:100%;height:100%;">
    <rect width="300" height="150" fill="#FAFAFA"/>
    <path d="M0,46 Q80,4 150,26 Q220,50 300,8 L300,150 L0,150 Z" fill="#F4E0E6"/>
  </svg>
  <div style="position:absolute;bottom:8px;left:0;right:0;display:flex;justify-content:center;
              gap:18px;align-items:flex-end;">
    <div style="display:flex;flex-direction:column;align-items:center;gap:4px;">
      <div style="width:86px;height:86px;background:#fff;border:1.5px solid ${PINK_BORDER};
                  border-radius:10px;overflow:hidden;display:flex;align-items:center;justify-content:center;
                  box-shadow:0 2px 8px rgba(139,26,56,.1);padding:4px;">
        <img src="${finalFanpageQr}" crossorigin="anonymous" width="78" height="78"
             style="display:block;width:78px;height:78px;"/>
      </div>
      <span style="font-size:8.5px;color:#4267B2;letter-spacing:1px;text-transform:uppercase;font-weight:700;">Fanpage</span>
    </div>
    <div style="display:flex;flex-direction:column;align-items:center;gap:4px;">
      <div style="width:86px;height:86px;background:#fff;border:1.5px solid ${PINK_BORDER};
                  border-radius:10px;overflow:hidden;display:flex;align-items:center;justify-content:center;
                  box-shadow:0 2px 8px rgba(139,26,56,.1);padding:4px;">
        <img src="${finalWaQr}" crossorigin="anonymous" width="78" height="78"
             style="display:block;width:78px;height:78px;"/>
      </div>
      <span style="font-size:8.5px;color:#25D366;letter-spacing:1px;text-transform:uppercase;font-weight:700;">WhatsApp</span>
    </div>
  </div>
</div>
`;
  return el;
}

// ─── small helpers ───────────────────────────────────────────────────────────
function escapeHtml(s: string): string {
  return String(s).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!)
  );
}

function field(label: string, value: string): string {
  return `
<div style="margin-bottom:8px;">
  <div style="font-size:8.5px;color:#999;text-transform:uppercase;letter-spacing:1.2px;margin-bottom:2px;">${escapeHtml(label)}</div>
  <div style="font-size:13px;color:${MAROON_DEEP};font-weight:500;letter-spacing:.5px;padding-bottom:4px;border-bottom:1px solid #e8e8e8;">${escapeHtml(value)}</div>
</div>`;
}

function dot(): string {
  return `<span style="width:5px;height:5px;border-radius:50%;background:rgba(255,255,255,.4);display:block;"></span>`;
}

function contactRow(icon: string, text: string): string {
  return `
<div style="display:flex;align-items:center;gap:9px;">
  <div style="width:24px;height:24px;border-radius:6px;background:${PINK_BG};border:1px solid ${PINK_BORDER};
              display:flex;align-items:center;justify-content:center;flex-shrink:0;">${icon}</div>
  <span style="font-size:12px;color:${MAROON_DEEP};letter-spacing:.2px;line-height:1.3;">${escapeHtml(text)}</span>
</div>`;
}

const ICON = `width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="${MAROON}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"`;
function iconPhone(): string {
  return `<svg ${ICON}><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.4 10.82 19.79 19.79 0 01.33 2.18 2 2 0 012.31 0h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z"/></svg>`;
}
function iconInstagram(): string {
  return `<svg ${ICON}><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r=".8" fill="${MAROON}" stroke="none"/></svg>`;
}
function iconWhatsapp(): string {
  return `<svg ${ICON}><path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z"/></svg>`;
}
function iconWechat(): string {
  return `<svg ${ICON}><path d="M9 11a1 1 0 100-2 1 1 0 000 2zm5 0a1 1 0 100-2 1 1 0 000 2z"/><path d="M12 2C6.48 2 2 6.03 2 11c0 2.89 1.46 5.45 3.75 7.1L5 21l3.19-1.56A10.5 10.5 0 0012 20c5.52 0 10-4.03 10-9S17.52 2 12 2z"/></svg>`;
}
