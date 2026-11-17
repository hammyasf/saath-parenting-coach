import type { Lang } from "./types";

// Fixed page copy in three variants. Urdu-script strings are kept to one short
// sentence each; they are model-written and back-translated, not native-reviewed.
const S = {
  tagline: {
    en: "AI coach, not a doctor.",
    ur: "اے آئی کوچ ہے، ڈاکٹر نہیں۔",
    "roman-ur": "AI coach hai, doctor nahi.",
  },
  welcome: {
    en: "Tell your parenting coach what's going on today",
    ur: "آج آپ کے بچے کے ساتھ کیا مسئلہ ہے؟",
    "roman-ur": "Aaj aap ke bachay ke saath kya masla hai?",
  },
  lead: {
    en: "Write it in English, Urdu or Roman Urdu. You get up to three steps for today and a check-in tomorrow.",
    ur: "انگریزی، اردو یا رومن اردو میں لکھیں۔ آج کے لیے تین قدم اور کل ایک سوال ملے گا۔",
    "roman-ur": "English, Urdu ya Roman Urdu mein likhein. Aaj ke liye teen qadam aur kal ek sawal milega.",
  },
  say: { en: "Say", ur: "یہ کہیں", "roman-ur": "Yeh kahein" },
  why: { en: "Why it works", ur: "یہ کیوں کام کرتا ہے", "roman-ur": "Yeh kyun kaam karta hai" },
  done: { en: "Done", ur: "ہو گیا", "roman-ur": "Ho gaya" },
  swap: { en: "Swap this step", ur: "یہ قدم بدلیں", "roman-ur": "Yeh qadam badlein" },
  swapWhy: { en: "What's in the way?", ur: "کیا مشکل ہے؟", "roman-ur": "Kya mushkil hai?" },
  reasonHard: { en: "Too hard right now", ur: "ابھی بہت مشکل ہے", "roman-ur": "Abhi bohat mushkil hai" },
  reasonTried: { en: "Already tried it", ur: "پہلے آزما چکے ہیں", "roman-ur": "Pehle aazma chuke hain" },
  reasonFit: { en: "Doesn't fit us", ur: "ہمارے لیے مناسب نہیں", "roman-ur": "Hamare liye munasib nahi" },
  swapping: { en: "Finding another way…", ur: "دوسرا طریقہ ڈھونڈ رہا ہوں…", "roman-ur": "Doosra tareeqa dhoond raha hoon…" },
  swapFailed: {
    en: "Couldn't swap it just now. Try again.",
    ur: "ابھی نہیں بدل سکا۔ دوبارہ کوشش کریں۔",
    "roman-ur": "Abhi nahi badal saka. Dobara koshish karein.",
  },
  getPlan: { en: "Get my plan", ur: "میرا پلان دیں", "roman-ur": "Mera plan dein" },
  skipAsk: { en: "Skip, just give me a plan", ur: "چھوڑیں، بس پلان دیں", "roman-ur": "Chhorein, bas plan dein" },
  tonight: { en: "Tonight", ur: "آج رات", "roman-ur": "Aaj raat" },
  whichStep: { en: "Which step didn't hold?", ur: "کون سا قدم نہیں چلا؟", "roman-ur": "Kaun sa qadam nahi chala?" },
  allSteps: { en: "All of them", ur: "سب", "roman-ur": "Sab" },
  share: { en: "Share this plan", ur: "یہ پلان شیئر کریں", "roman-ur": "Yeh plan share karein" },
  copied: { en: "Copied. Paste it anywhere.", ur: "کاپی ہو گیا۔ کہیں بھی پیسٹ کریں۔", "roman-ur": "Copy ho gaya. Kahin bhi paste karein." },
  addCal: { en: "Add to calendar", ur: "کیلنڈر میں شامل کریں", "roman-ur": "Calendar mein shamil karein" },
  fieldLabel: {
    en: "Your concern",
    ur: "آپ کی پریشانی",
    "roman-ur": "Aap ki pareshani",
  },
  placeholder: {
    en: "My 6-year-old won't…",
    ur: "اپنی پریشانی لکھیں…",
    "roman-ur": "Apni pareshani likhein…",
  },
  send: { en: "Send", ur: "بھیجیں", "roman-ur": "Bhejein" },
  reset: { en: "Start over", ur: "نئی گفتگو", "roman-ur": "Nayi guftagu" },
  thinking: { en: "Thinking it through…", ur: "سوچ رہا ہوں…", "roman-ur": "Soch raha hoon…" },
  watchFor: { en: "Watch for", ur: "دھیان رکھیں", "roman-ur": "Dhyan rakhein" },
  checkIn: { en: "Check-in", ur: "دوبارہ بات", "roman-ur": "Dobara baat" },
  remindMe: { en: "Remind me", ur: "یاد دلائیں", "roman-ur": "Yaad dilayein" },
  saved: { en: "Saved for", ur: "محفوظ:", "roman-ur": "Mehfooz:" },
  answerNow: { en: "Answer now", ur: "ابھی جواب دیں", "roman-ur": "Abhi jawab dein" },
  youWereTrying: { en: "You were trying:", ur: "آپ یہ آزما رہے تھے:", "roman-ur": "Aap yeh aazma rahe thay:" },
  better: { en: "Better", ur: "بہتر", "roman-ur": "Behtar" },
  same: { en: "Same", ur: "ویسا ہی", "roman-ur": "Waisa hi" },
  harder: { en: "Harder", ur: "زیادہ مشکل", "roman-ur": "Zyada mushkil" },
  crisisTitle: {
    en: "This needs more than a coach",
    ur: "اس کے لیے کوچ کافی نہیں",
    "roman-ur": "Is ke liye coach kaafi nahi",
  },
  crisis_danger: {
    en: "It sounds like someone may be in danger right now. An AI coach is not the right help for this. Please contact emergency services now.",
    ur: "لگتا ہے کوئی ابھی خطرے میں ہے۔ براہِ کرم ابھی ایمرجنسی سروس سے رابطہ کریں۔",
    "roman-ur": "Lagta hai koi abhi khatray mein hai. AI coach is mein sahi madad nahi. Meharbani kar ke abhi emergency service se rabta karein.",
  },
  crisis_abuse: {
    en: "It sounds like a child may be being harmed. An AI coach is not the right help for this. Please talk to a child protection service now.",
    ur: "لگتا ہے کسی بچے کو نقصان پہنچ رہا ہے۔ براہِ کرم ابھی بچوں کے تحفظ کی سروس سے بات کریں۔",
    "roman-ur": "Lagta hai kisi bachay ko nuqsan pohanch raha hai. AI coach is mein sahi madad nahi. Meharbani kar ke abhi child protection service se baat karein.",
  },
  "crisis_self-harm": {
    en: "It sounds like you or your child may be thinking about self-harm. You deserve real support from a person, right now. Please reach out.",
    ur: "لگتا ہے آپ یا آپ کا بچہ خود کو نقصان پہنچانے کا سوچ رہا ہے۔ براہِ کرم ابھی کسی سے مدد لیں۔",
    "roman-ur": "Lagta hai aap ya aap ka bacha khud ko nuqsan pohanchanay ka soch raha hai. Aap ko abhi kisi insaan ki madad milni chahiye. Meharbani kar ke rabta karein.",
  },
  crisisGeneric: {
    en: "Call your local emergency number or go to the nearest hospital emergency department.",
    ur: "اپنے مقامی ایمرجنسی نمبر پر کال کریں یا قریبی ہسپتال کی ایمرجنسی جائیں۔",
    "roman-ur": "Apne local emergency number par call karein ya qareebi hospital ki emergency jayein.",
  },
  crisisAfter: {
    en: "You can keep writing here whenever you're ready.",
    ur: "جب چاہیں یہاں لکھتے رہیں۔",
    "roman-ur": "Jab chahein yahan likhte rahein.",
  },
  getHelpNow: { en: "Get help now", ur: "ابھی مدد لیں", "roman-ur": "Abhi madad lein" },
  supportStrip: {
    en: "If you ever feel you might hurt your child, help is here.",
    ur: "اگر کبھی لگے کہ آپ بچے کو نقصان پہنچا سکتے ہیں تو مدد یہاں ہے۔",
    "roman-ur": "Agar kabhi lagay ke aap bachay ko nuqsan pohancha sakte hain, madad yahan hai.",
  },
  fallback: {
    en: "I can't answer this one well right now. Try saying it another way, or try again in a minute.",
    ur: "میں ابھی اس کا اچھا جواب نہیں دے سکتا۔ دوسرے الفاظ میں لکھیں یا تھوڑی دیر بعد کوشش کریں۔",
    "roman-ur": "Main abhi is ka acha jawab nahi de sakta. Doosre alfaaz mein likhein ya thori dair baad koshish karein.",
  },
  redirect: {
    en: "I can only help with parenting concerns. Tell me what's happening with your child.",
    ur: "میں صرف بچوں کی پرورش میں مدد کر سکتا ہوں۔ بتائیں بچے کے ساتھ کیا ہو رہا ہے۔",
    "roman-ur": "Main sirf parenting mein madad kar sakta hoon. Batayein bachay ke saath kya ho raha hai.",
  },
  tooLong: {
    en: "Please write a message of up to 2,000 characters.",
    ur: "براہِ کرم 2000 حروف تک کا پیغام لکھیں۔",
    "roman-ur": "Meharbani kar ke 2000 huroof tak ka paigham likhein.",
  },
  privacy: {
    en: "This conversation stays in your browser.",
    ur: "یہ گفتگو صرف آپ کے براؤزر میں رہتی ہے۔",
    "roman-ur": "Yeh guftagu sirf aap ke browser mein rehti hai.",
  },
  regionLabel: { en: "Helplines for", ur: "ہیلپ لائن:", "roman-ur": "Helpline:" },
  skipDemo: {
    en: "Demo: skip to check-in time",
    ur: "Demo: skip to check-in time",
    "roman-ur": "Demo: skip to check-in time",
  },
} as const;

export type StringKey = keyof typeof S;

export const t = (key: StringKey, lang: Lang): string => S[key][lang];

/** BCP 47 tag: Roman Urdu is Urdu in Latin script, so screen readers do not read it as English. */
export const langAttr = (lang: Lang) => (lang === "ur" ? "ur" : lang === "roman-ur" ? "ur-Latn" : "en");

export const dirOf = (lang: Lang) => (lang === "ur" ? "rtl" : "ltr");

/** Starter chips: one everyday concern per script. */
export const STARTERS: { lang: Lang; text: string }[] = [
  { lang: "en", text: "My 4-year-old won't go to sleep at night" },
  { lang: "ur", text: "میرا بیٹا ہر بات پر ضد کرتا ہے" },
  { lang: "roman-ur", text: "Meri beti school jaane se darti hai" },
];
