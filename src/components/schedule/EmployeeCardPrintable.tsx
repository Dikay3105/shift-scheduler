import QRCode from "react-qr-code";
import type { Employee } from "@/lib/schedule-types";

type Props = {
  employee: Employee;
  index: number;
  brand?: string;
  period?: string;
};

export function EmployeeCardPrintable({ employee, index, brand = "Cinnamon Forest", period = "2024–2026" }: Props) {
  const initials = (employee.name || "?")
    .trim()
    .split(/\s+/)
    .map((w) => w[0]?.toUpperCase() || "")
    .slice(-2)
    .join("");

  const code = `CF-${String(index + 1).padStart(4, "0")}`;

  return (
    <div
      style={{
        width: 350,
        height: 230,
        background: "#FFFAF8",
        border: "1px solid #FFADD0",
        borderRadius: 18,
        overflow: "hidden",
        fontFamily: "ui-sans-serif, system-ui, sans-serif",
        boxShadow: "0 12px 32px rgba(180,60,100,.18)",
      }}
    >
      {/* Header */}
      <div
        style={{
          position: "relative",
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "12px 16px",
          background: "linear-gradient(90deg,#E8607A,#CC4070,#A8305C)",
          color: "white",
        }}
      >
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: 999,
            background: "rgba(255,255,255,0.2)",
            border: "1px solid rgba(255,255,255,0.4)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 16,
          }}
        >
          ✦
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p
            style={{
              margin: 0,
              fontFamily: "ui-serif, Georgia, serif",
              fontSize: 15,
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: 2,
            }}
          >
            {brand}
          </p>
        </div>
        <span
          style={{
            background: "rgba(0,0,0,0.15)",
            padding: "4px 8px",
            borderRadius: 6,
            fontSize: 8,
            textTransform: "uppercase",
            letterSpacing: 1,
            color: "rgba(255,255,255,0.85)",
          }}
        >
          {period}
        </span>
      </div>

      {/* Body */}
      <div style={{ display: "flex", alignItems: "center", gap: 16, padding: "12px 16px", height: 140 }}>
        <div
          style={{
            width: 76,
            height: 76,
            borderRadius: 999,
            border: "2.5px solid #fff",
            background: "linear-gradient(135deg,#F9C6D5,#E88AAE)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: "ui-serif, Georgia, serif",
            fontSize: 28,
            fontWeight: 600,
            color: "#922054",
            boxShadow: "0 0 0 1.5px #FFADD0",
            flexShrink: 0,
          }}
        >
          {initials}
        </div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <p
            style={{
              margin: 0,
              fontFamily: "ui-serif, Georgia, serif",
              fontSize: 20,
              fontWeight: 600,
              color: "#4A0F2A",
              lineHeight: 1.1,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {employee.name}
          </p>
          <p
            style={{
              margin: "4px 0 12px",
              fontSize: 10,
              textTransform: "uppercase",
              letterSpacing: 1.2,
              color: "#E0528A",
            }}
          >
            {employee.role || "Nhân viên"}
          </p>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              border: "1px solid #FFD6E7",
              background: "#FFF0F5",
              borderRadius: 8,
              overflow: "hidden",
            }}
          >
            <span
              style={{
                background: "#FFD6E7",
                padding: "4px 8px",
                fontSize: 9,
                fontWeight: 500,
                textTransform: "uppercase",
                letterSpacing: 0.8,
                color: "#922054",
              }}
            >
              ID
            </span>
            <span
              style={{
                padding: "4px 12px",
                fontSize: 11,
                letterSpacing: 1.2,
                color: "#4A0F2A",
                fontWeight: 500,
              }}
            >
              {code}
            </span>
          </div>
        </div>
        <div
          style={{
            width: 60,
            height: 60,
            border: "1px solid #FFD6E7",
            borderRadius: 8,
            background: "#fff",
            padding: 3,
            flexShrink: 0,
          }}
        >
          <QRCode value={`${brand}|${employee.name}|${code}`} size={54} fgColor="#922054" bgColor="#FFFFFF" />
        </div>
      </div>

      {/* Footer */}
      <div
        style={{
          height: 30,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 16px",
          background: "linear-gradient(90deg,#CC4070,#E8607A)",
          color: "rgba(255,255,255,0.85)",
        }}
      >
        <div style={{ display: "flex", gap: 4 }}>
          <span style={{ width: 5, height: 5, borderRadius: 999, background: "rgba(255,255,255,0.5)" }} />
          <span style={{ width: 5, height: 5, borderRadius: 999, background: "rgba(255,255,255,0.5)" }} />
          <span style={{ width: 5, height: 5, borderRadius: 999, background: "rgba(255,255,255,0.5)" }} />
        </div>
        <span style={{ fontSize: 8.5, textTransform: "uppercase", letterSpacing: 2.5 }}>Nhân viên chính thức</span>
        <span style={{ fontSize: 10, color: "rgba(255,255,255,0.6)" }}>✦</span>
      </div>
    </div>
  );
}
