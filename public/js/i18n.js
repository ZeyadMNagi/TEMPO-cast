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