import { mergeTranslations } from "ra-core";
import polyglotI18nProvider from "ra-i18n-polyglot";
import englishMessages from "ra-language-english";
import { raSupabaseEnglishMessages } from "ra-supabase-language-english";

import { ru } from "./ru";

const raSupabaseEnglishMessagesOverride = {
  "ra-supabase": {
    auth: {
      password_reset: "Check your emails for a Reset Password message.",
    },
  },
};

const english = mergeTranslations(
  englishMessages,
  raSupabaseEnglishMessages,
  raSupabaseEnglishMessagesOverride,
);

export const i18nProvider = polyglotI18nProvider(
  (locale: string) => {
    if (locale === "ru") {
      return mergeTranslations(english, ru);
    }
    return english;
  },
  "ru",
  [
    { locale: "ru", name: "Русский" },
    { locale: "en", name: "English" },
  ],
  { allowMissing: true },
);
