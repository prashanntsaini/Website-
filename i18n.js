// Gyaan Hub - English UI text. Add more keys here; use data-i18n="key" in HTML or t("key") in JS.
import { getPrefs } from "./prefs.js?v=29";

const D = {
  en: {
    "nav.home": "Home", "nav.dashboard": "Dashboard", "nav.tests": "Tests", "nav.community": "Community", "nav.profile": "Profile", "nav.messages": "Messages", "nav.reels": "Reels", "nav.settings": "Settings", "nav.free": "Free Tests", "nav.admin": "Admin",
    "nav.privacy": "Privacy Policy", "nav.terms": "Terms of Use", "nav.cookies": "Cookie preferences",
    "nav.signin": "Sign In", "nav.signup": "Sign Up", "nav.logout": "Logout", "nav.signedAs": "Signed in as",
    "acc.title": "Accounts", "acc.add": "Add account", "acc.switch": "Switch account", "acc.logoutThis": "Log out of this account", "acc.close": "Close", "acc.max": "You can keep up to 5 accounts on this device.",
    "acc.adding": "Adding another account. Sign in or sign up with a different email.", "acc.cancel": "Cancel", "acc.createNew": "Create new account",

    "dash.welcome": "Welcome,", "dash.sub": "Pick what you want to study.",
    "dash.search": "Search by title or subject, e.g. Calculus, Physics, DBMS...",
    "dash.all": "All", "dash.notes": "Notes", "dash.papers": "Papers", "dash.videos": "Videos", "dash.mock": "Mock Tests",
    "dash.onlineTests": "Online Tests", "dash.material": "Study Material", "dash.continue": "Continue learning",
    "dash.one": "resource available", "dash.many": "resources available", "dash.empty": "No results found. Try a different search term or filter.",
    "dash.new": "NEW", "dash.start": "Start", "dash.newBanner": "new item(s) added in the last 7 days.", "dash.resume": "Resume",
    "dash.allSubjects": "All subjects", "dash.pickSubject": "Choose a subject", "dash.pickClass": "Choose your class", "dash.tests": "tests", "dash.test1": "test", "dash.mats": "materials", "dash.mat1": "material", "dash.open": "Open", "dash.general": "General", "dash.class": "Class", "dash.other": "Other", "dash.noChapter": "General", "dash.results": "Search results",

    "set.title": "Settings", "set.sub": "Manage your profile, security, devices and how the site works for you.",
    "set.profile": "Profile", "set.photo": "Profile photo", "set.photoHint": "JPG or PNG. It is resized on your device before saving.",
    "set.upload": "Upload photo", "set.remove": "Remove", "set.name": "Display name", "set.nameSave": "Save name", "set.email": "Email",
    "set.appearance": "Appearance", "set.theme": "Theme", "set.dark": "Dark", "set.light": "Light", "set.system": "System",
    "set.lang": "Language", "set.langHint": "Changes menus and main screens.",
    "set.security": "Password & email", "set.curPw": "Current password", "set.newPw": "New password (min 6 characters)", "set.confPw": "Confirm new password",
    "set.changePw": "Change password", "set.newEmail": "New email address", "set.changeEmail": "Change email",
    "set.googleNote": "You signed in with Google, so your password and email are managed in your Google account.",
    "set.emailNote": "We send a verification link to the new address. The email changes after you click it.",
    "set.devices": "Active devices", "set.devicesSub": "Everywhere your account is signed in. If you do not recognise one, log it out and change your password.",
    "set.thisDevice": "This device", "set.lastActive": "Last active", "set.signedIn": "Signed in", "set.logoutDevice": "Log out",
    "set.logoutOthers": "Log out all other devices", "set.logoutAll": "Log out from all devices", "set.refresh": "Refresh",
    "set.noDevices": "No device records yet.", "set.loading": "Loading...",
    "set.notifications": "Notifications", "set.nResults": "Email my test results", "set.nResultsHint": "Send a copy of your score and rank to your email after each test.",
    "set.nNew": "New material alerts", "set.nNewHint": "Show a NEW badge and a banner when new notes, videos or papers are added.",
    "set.player": "Player settings", "set.speed": "Default speed", "set.quality": "Default video quality", "set.qualityHint": "YouTube may ignore this on some videos or networks.",
    "set.autoplay": "Autoplay", "set.autoplayHint": "Start videos automatically when you open them.",
    "set.resume": "Resume from last position", "set.resumeHint": "Videos and PDFs reopen where you stopped.",
    "set.download": "Show download button", "set.downloadHint": "In the notes / PDF viewer.",
    "set.data": "Download & data usage", "set.saver": "Data saver mode", "set.saverHint": "Lower video quality (360p), PDFs render at normal resolution, no autoplay.",
    "set.clearCache": "Clear saved data on this device", "set.clearCacheHint": "Removes cached lists and resume positions stored in this browser.", "set.clear": "Clear",
    "set.privacy": "Privacy & cookies", "set.cookies": "Cookie preferences", "set.cookiesHint": "Review or change which optional cookies we may use.", "set.manage": "Manage",
    "set.withdraw": "Withdraw consent", "set.withdrawHint": "Removes your consent and signs you out. You confirm the Terms and Privacy Policy again when you sign in.", "set.reset": "Withdraw & sign out", "set.withdrawAsk": "Withdraw consent and sign out?", "set.policies": "Policies",
    "set.yourData": "Your data", "set.export": "Export my data", "set.exportHint": "Download your profile, settings, devices, learning progress and test results as a JSON file.",
    "set.exportBtn": "Download JSON", "set.danger": "Danger zone", "set.delete": "Delete my account",
    "set.deleteHint": "Permanently deletes your account, test results and saved data. This cannot be undone.",
    "set.deleteBtn": "Delete account", "set.deleteConfirm": "Type DELETE to confirm", "set.confirmPw": "Your password",
    "set.session": "Session", "set.sessionHint": "Sign out of this device", "set.saved": "Saved.",
    "set.search": "Search", "set.grpAccount": "Your account", "set.grpUse": "How you use Gyaan Hub", "set.grpPrivacy": "Privacy", "set.grpSubs": "Subscriptions", "set.grpData": "Your data and login",
    "set.community": "Community and messages", "set.subTitle": "Subscription", "set.free": "Free plan", "set.noMatch": "No settings found.", "set.logoutRow": "Log out",

    "pl.back": "Back", "pl.speed": "Speed", "pl.quality": "Quality", "pl.auto": "Auto", "pl.download": "Download", "pl.open": "Open original",
    "pl.fullscreen": "Fullscreen", "pl.page": "Page", "pl.fit": "Fit", "pl.night": "Night mode", "pl.loading": "Loading...",
    "pl.resumed": "Resumed from", "pl.startOver": "Start over", "pl.noLink": "This material has no link yet.", "pl.qualityNote": "YouTube may override the quality.",

    "tests.title": "Online Tests", "tests.sub": "Pick a test, answer within the time limit and see your score instantly.",
    "common.back": "Back"
  }
};

export const lang = () => "en";
export function t(key) { return (D[lang()] && D[lang()][key]) || D.en[key] || key; }

export function applyI18n(root = document) {
  root.querySelectorAll("[data-i18n]").forEach(el => { el.textContent = t(el.dataset.i18n); });
  root.querySelectorAll("[data-i18n-ph]").forEach(el => { el.placeholder = t(el.dataset.i18nPh); });
  root.querySelectorAll("[data-i18n-title]").forEach(el => { el.title = t(el.dataset.i18nTitle); });
}
window.addEventListener("prefs-changed", () => applyI18n());
