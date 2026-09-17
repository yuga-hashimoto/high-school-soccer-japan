"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const SUGGESTIONS = ["東福岡", "プレミア", "福岡", "プリンス", "青森山田"];

export function SearchForm({ initialQuery }: { initialQuery: string }) {
  const router = useRouter();
  const [value, setValue] = useState(initialQuery);

  function submit(query: string) {
    const trimmed = query.trim();
    if (trimmed.length === 0) {
      router.push("/search");
      return;
    }
    router.push(`/search?q=${encodeURIComponent(trimmed)}`);
  }

  return (
    <div className="px-4 pt-3">
      <form
        role="search"
        onSubmit={(event) => {
          event.preventDefault();
          submit(value);
        }}
        className="flex items-center gap-2"
      >
        <input
          type="search"
          name="q"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          enterKeyHint="search"
          autoComplete="off"
          placeholder="学校・チーム・リーグ・都道府県"
          aria-label="全国検索"
          className="min-w-0 flex-1 rounded-lg border border-line-strong px-3 py-2.5 text-[15px] outline-none focus:border-accent"
        />
        <button
          type="submit"
          className="shrink-0 rounded-lg bg-accent px-4 py-2.5 text-[14px] font-medium text-white"
        >
          検索
        </button>
      </form>
      {initialQuery.length === 0 ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {SUGGESTIONS.map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              onClick={() => {
                setValue(suggestion);
                submit(suggestion);
              }}
              className="rounded-full border border-line px-3 py-1.5 text-[12px] text-ink-soft"
            >
              {suggestion}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
