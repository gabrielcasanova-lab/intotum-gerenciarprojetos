import { changeLanguage } from "@/app/language-actions";
import { LANGUAGES, languageName, type Language } from "@/lib/i18n";

/** Botões "Português | Español" para trocar o idioma das telas. */
export function LanguageSwitch({ current }: { current: Language }) {
  return (
    <form action={changeLanguage} className="flex items-center gap-1 text-xs">
      {LANGUAGES.map((l) => (
        <button
          key={l}
          name="language"
          value={l}
          disabled={l === current}
          aria-pressed={l === current}
          className="rounded px-1.5 py-0.5 text-slate-600 hover:bg-slate-100 disabled:font-semibold disabled:text-slate-900 disabled:hover:bg-transparent"
        >
          {languageName[l]}
        </button>
      ))}
    </form>
  );
}
