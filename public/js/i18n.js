const notificationTranslations = {
  en: {
    nav_notifications: "Get Alerts",
    notification_subscribed: "You're subscribed to alerts!",
    notification_manage: "Manage preferences",
    notification_prompt_title: "Stay Protected",
    notification_prompt_desc:
      "Get personalized air quality alerts based on your health profile and location.",
    notification_subscribe_now: "Subscribe Now",
  },
  ar: {
    nav_notifications: "احصل على التنبيهات",
    notification_subscribed: "أنت مشترك في التنبيهات!",
    notification_manage: "إدارة التفضيلات",
    notification_prompt_title: "ابق محميًا",
    notification_prompt_desc:
      "احصل على تنبيهات مخصصة لجودة الهواء بناءً على ملفك الصحي وموقعك.",
    notification_subscribe_now: "اشترك الآن",
  },
};

let translations = {};
let currentLang = "en";

async function setLanguage(lang) {
  try {
    const response = await fetch(`../locales/${lang}.json`);
    if (!response.ok) {
      console.error(`Could not load translation file for ${lang}.`);
      return;
    }
    translations = await response.json();
    updateContent();
    updatePageDirection(lang);
    currentLang = lang;
    localStorage.setItem("language", lang);
  } catch (error) {
    console.error("Error loading or parsing translation file:", error);
  }
}

function updateContent() {
  document.querySelectorAll("[data-i18n]").forEach((element) => {
    const key = element.getAttribute("data-i18n");
    if (translations[key]) {
      // Handle different element types
      if (element.hasAttribute("placeholder")) {
        element.setAttribute("placeholder", translations[key]);
      } else {
        element.innerHTML = translations[key];
      }
    }
  });
}

function updatePageDirection(lang) {
  const rtlStylesheet = document.getElementById("rtl-stylesheet");
  if (lang === "ar") {
    document.documentElement.lang = "ar";
    document.body.dir = "rtl";
    if (rtlStylesheet) rtlStylesheet.disabled = false;
  } else {
    document.documentElement.lang = "en";
    document.body.dir = "ltr";
    if (rtlStylesheet) rtlStylesheet.disabled = true;
  }

  const langToggleBtn = document.getElementById("lang-toggle-btn");
  if (langToggleBtn) {
    // Update button text to show the *other* language
    langToggleBtn.textContent = lang === "ar" ? "English" : "العربية";
  }
}

function getTranslation(key) {
  return translations[key] || key;
}

document.addEventListener("DOMContentLoaded", () => {
  const savedLang = localStorage.getItem("language") || "en";
  setLanguage(savedLang);

  const langToggleBtn = document.getElementById("lang-toggle-btn");
  if (langToggleBtn) {
    langToggleBtn.addEventListener("click", () => {
      const newLang = currentLang === "en" ? "ar" : "en";
      setLanguage(newLang);
    });
  }
});
