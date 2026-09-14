import React from "react";

export const BRAND_NAME = "eBag AI";
export const BRAND_TAGLINE = "Notes, plan & AI summaries";

export default function BrandMark({
  inverted = false,
  showTagline = true,
  compact = false,
}) {
  const titleClass = inverted ? "text-white" : "text-slate-900";
  const tagClass = inverted ? "text-slate-300" : "text-slate-400";

  return (
    <div className={`flex flex-col min-w-0 ${compact ? "leading-tight" : ""}`}>
      <span className={`font-semibold tracking-tight ${compact ? "text-[14px]" : "text-[15px]"} ${titleClass}`}>
        {BRAND_NAME}
      </span>
      {showTagline && (
        <span className={`font-medium ${compact ? "text-[9px]" : "text-[11px]"} ${tagClass} truncate`}>
          {BRAND_TAGLINE}
        </span>
      )}
    </div>
  );
}
