import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { getCorsHeaders, handleCorsPreflightRequest } from "../_shared/cors.ts";

// 50 Demo users with Hebrew names and pet-related profiles
const demoUsers = [
  { email: 'miki.dog@demo.petish.com', full_name: 'מיקי הכלב', avatar_url: 'https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=150&h=150&fit=crop', bio: 'אוהב לרוץ בפארק ולשחק עם כדורים 🐕' },
  { email: 'luna.cat@demo.petish.com', full_name: 'לונה החתולה', avatar_url: 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=150&h=150&fit=crop', bio: 'מלכת הבית 👑 אוהבת שמש ושינה' },
  { email: 'boni.golden@demo.petish.com', full_name: 'בוני הגולדן', avatar_url: 'https://images.unsplash.com/photo-1552053831-71594a27632d?w=150&h=150&fit=crop', bio: 'הכלב הכי ידידותי בשכונה! 🦮' },
  { email: 'shoko.lab@demo.petish.com', full_name: 'שוקו הלברדור', avatar_url: 'https://images.unsplash.com/photo-1529429617124-95b109e86bb8?w=150&h=150&fit=crop', bio: 'אוהב מים ושחייה 🏊‍♂️' },
  { email: 'simba.cat@demo.petish.com', full_name: 'סימבה החתול', avatar_url: 'https://images.unsplash.com/photo-1573865526739-10659fec78a5?w=150&h=150&fit=crop', bio: 'מלך הג׳ונגל של הסלון 🦁' },
  { email: 'max.husky@demo.petish.com', full_name: 'מקס ההאסקי', avatar_url: 'https://images.unsplash.com/photo-1605568427561-40dd23c2acea?w=150&h=150&fit=crop', bio: 'אוהב שלג וריצה 🐺' },
  { email: 'bella.poodle@demo.petish.com', full_name: 'בלה הפודל', avatar_url: 'https://images.unsplash.com/photo-1608744882201-52a7f7f3dd60?w=150&h=150&fit=crop', bio: 'אלגנטית ומפונקת ✨' },
  { email: 'rocky.boxer@demo.petish.com', full_name: 'רוקי הבוקסר', avatar_url: 'https://images.unsplash.com/photo-1558929996-da64ba858215?w=150&h=150&fit=crop', bio: 'חזק אבל עדין בלב 💪' },
  { email: 'nala.persian@demo.petish.com', full_name: 'נאלה הפרסית', avatar_url: 'https://images.unsplash.com/photo-1574158622682-e40e69881006?w=150&h=150&fit=crop', bio: 'יפהפייה ומפונקת 👸' },
  { email: 'charlie.beagle@demo.petish.com', full_name: 'צ׳רלי הביגל', avatar_url: 'https://images.unsplash.com/photo-1505628346881-b72b27e84530?w=150&h=150&fit=crop', bio: 'סקרן וחמוד 🔍' },
  { email: 'toffee.corgi@demo.petish.com', full_name: 'טופי הקורגי', avatar_url: 'https://images.unsplash.com/photo-1612536057832-2ff7ead58194?w=150&h=150&fit=crop', bio: 'רגליים קצרות, לב גדול 🧡' },
  { email: 'whiskers.tabby@demo.petish.com', full_name: 'שפם הטאבי', avatar_url: 'https://images.unsplash.com/photo-1495360010541-f48722b34f7d?w=150&h=150&fit=crop', bio: 'חתול רחוב שהפך לנסיך 👑' },
  { email: 'duke.german@demo.petish.com', full_name: 'דיוק הרועה', avatar_url: 'https://images.unsplash.com/photo-1568572933382-74d440642117?w=150&h=150&fit=crop', bio: 'נאמן ואמיץ 🐕‍🦺' },
  { email: 'mochi.shiba@demo.petish.com', full_name: 'מוצ׳י השיבה', avatar_url: 'https://images.unsplash.com/photo-1583337130417-3346a1be7dee?w=150&h=150&fit=crop', bio: 'חמוד ועקשן 🍡' },
  { email: 'oliver.orange@demo.petish.com', full_name: 'אוליבר הג׳ינג׳י', avatar_url: 'https://images.unsplash.com/photo-1543852786-1cf6624b9987?w=150&h=150&fit=crop', bio: 'ג׳ינג׳י ושמח 🧡' },
  { email: 'teddy.pom@demo.petish.com', full_name: 'טדי הפומרניאן', avatar_url: 'https://images.unsplash.com/photo-1535930891776-0c2dfb7fda1a?w=150&h=150&fit=crop', bio: 'פלאפי וקטן 🧸' },
  { email: 'cleo.siamese@demo.petish.com', full_name: 'קליאו הסיאמית', avatar_url: 'https://images.unsplash.com/photo-1596854407944-bf87f6fdd49e?w=150&h=150&fit=crop', bio: 'עיניים כחולות ויפות 💙' },
  { email: 'jack.russell@demo.petish.com', full_name: 'ג׳ק ראסל', avatar_url: 'https://images.unsplash.com/photo-1558929996-da64ba858215?w=150&h=150&fit=crop', bio: 'אנרגטי ומלא חיים ⚡' },
  { email: 'mocha.maine@demo.petish.com', full_name: 'מוקה המיין קון', avatar_url: 'https://images.unsplash.com/photo-1615497001839-b0a0eac3274c?w=150&h=150&fit=crop', bio: 'הענק העדין 🦁' },
  { email: 'lucky.mix@demo.petish.com', full_name: 'לאקי המעורב', avatar_url: 'https://images.unsplash.com/photo-1548199973-03cce0bbc87b?w=150&h=150&fit=crop', bio: 'הכלב הכי שמח 🍀' },
  { email: 'princess.ragdoll@demo.petish.com', full_name: 'נסיכה הראגדול', avatar_url: 'https://images.unsplash.com/photo-1592194996308-7b43878e84a6?w=150&h=150&fit=crop', bio: 'רכה כבובת סמרטוט 🎀' },
  { email: 'bruno.bulldog@demo.petish.com', full_name: 'ברונו הבולדוג', avatar_url: 'https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?w=150&h=150&fit=crop', bio: 'נחרן מקסים 😴' },
  { email: 'pepper.black@demo.petish.com', full_name: 'פפר השחורה', avatar_url: 'https://images.unsplash.com/photo-1571566882372-1598d88abd90?w=150&h=150&fit=crop', bio: 'חתולה שחורה ומזל טוב 🖤' },
  { email: 'ziggy.dachshund@demo.petish.com', full_name: 'זיגי התחש', avatar_url: 'https://images.unsplash.com/photo-1518020382113-a7e8fc38eac9?w=150&h=150&fit=crop', bio: 'ארוך וחמוד 🌭' },
  { email: 'misty.british@demo.petish.com', full_name: 'מיסטי הבריטית', avatar_url: 'https://images.unsplash.com/photo-1518791841217-8f162f1e1131?w=150&h=150&fit=crop', bio: 'אצילית ומלכותית 🇬🇧' },
  { email: 'rex.shepherd@demo.petish.com', full_name: 'רקס הרועה', avatar_url: 'https://images.unsplash.com/photo-1589941013453-ec89f33b5e95?w=150&h=150&fit=crop', bio: 'שומר נאמן 🐕‍🦺' },
  { email: 'snowball.white@demo.petish.com', full_name: 'כדור שלג', avatar_url: 'https://images.unsplash.com/photo-1513360371669-4adf3dd7dff8?w=150&h=150&fit=crop', bio: 'לבן ופלאפי ❄️' },
  { email: 'ginger.terrier@demo.petish.com', full_name: 'ג׳ינג׳ר הטרייר', avatar_url: 'https://images.unsplash.com/photo-1544568100-847a948585b9?w=150&h=150&fit=crop', bio: 'חמודה וגאונה 🧡' },
  { email: 'shadow.black@demo.petish.com', full_name: 'שאדו השחור', avatar_url: 'https://images.unsplash.com/photo-1573865526739-10659fec78a5?w=150&h=150&fit=crop', bio: 'מסתורי ויפה 🌙' },
  { email: 'daisy.retriever@demo.petish.com', full_name: 'דייזי הרטריבר', avatar_url: 'https://images.unsplash.com/photo-1561037404-61cd46aa615b?w=150&h=150&fit=crop', bio: 'שמחה כמו פרח 🌼' },
  { email: 'smokey.gray@demo.petish.com', full_name: 'סמוקי האפור', avatar_url: 'https://images.unsplash.com/photo-1606214174585-fe31582dc6ee?w=150&h=150&fit=crop', bio: 'אפור ומגניב 🌫️' },
  { email: 'buddy.golden@demo.petish.com', full_name: 'באדי הזהוב', avatar_url: 'https://images.unsplash.com/photo-1633722715463-d30f4f325e24?w=150&h=150&fit=crop', bio: 'החבר הכי טוב 💛' },
  { email: 'mittens.calico@demo.petish.com', full_name: 'מיטנס הקליקו', avatar_url: 'https://images.unsplash.com/photo-1615789591457-74a63395c990?w=150&h=150&fit=crop', bio: 'צבעונית ומיוחדת 🎨' },
  { email: 'zeus.great@demo.petish.com', full_name: 'זאוס הדני', avatar_url: 'https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=150&h=150&fit=crop', bio: 'ענק עדין 👑' },
  { email: 'luna.scottish@demo.petish.com', full_name: 'לונה הסקוטית', avatar_url: 'https://images.unsplash.com/photo-1518791841217-8f162f1e1131?w=150&h=150&fit=crop', bio: 'אוזניים מקופלות ❤️' },
  { email: 'coco.chihuahua@demo.petish.com', full_name: 'קוקו הצ׳יוואווה', avatar_url: 'https://images.unsplash.com/photo-1587402092301-725e37c70fd8?w=150&h=150&fit=crop', bio: 'קטנה אבל עם אופי גדול 💃' },
  { email: 'tiger.orange@demo.petish.com', full_name: 'טייגר הנמר', avatar_url: 'https://images.unsplash.com/photo-1543852786-1cf6624b9987?w=150&h=150&fit=crop', bio: 'נמר הבית 🐯' },
  { email: 'rusty.setter@demo.petish.com', full_name: 'ראסטי הסטר', avatar_url: 'https://images.unsplash.com/photo-1605568427561-40dd23c2acea?w=150&h=150&fit=crop', bio: 'ג׳ינג׳י ומשוגע 🧡' },
  { email: 'pearl.white@demo.petish.com', full_name: 'פנינה הלבנה', avatar_url: 'https://images.unsplash.com/photo-1592194996308-7b43878e84a6?w=150&h=150&fit=crop', bio: 'יקרה כמו פנינה 💎' },
  { email: 'thor.malamute@demo.petish.com', full_name: 'תור המלמוט', avatar_url: 'https://images.unsplash.com/photo-1568572933382-74d440642117?w=150&h=150&fit=crop', bio: 'אל הרעם ⚡' },
  { email: 'patches.spotted@demo.petish.com', full_name: 'פאצ׳ס המנומר', avatar_url: 'https://images.unsplash.com/photo-1543852786-1cf6624b9987?w=150&h=150&fit=crop', bio: 'כתמים בכל מקום 🐄' },
  { email: 'sam.samoyed@demo.petish.com', full_name: 'סאם הסמויד', avatar_url: 'https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=150&h=150&fit=crop', bio: 'ענן לבן מחייך ☁️' },
  { email: 'willow.calico@demo.petish.com', full_name: 'וילו הקליקו', avatar_url: 'https://images.unsplash.com/photo-1615789591457-74a63395c990?w=150&h=150&fit=crop', bio: 'רכה כערבה 🌿' },
  { email: 'ace.pointer@demo.petish.com', full_name: 'אייס הפוינטר', avatar_url: 'https://images.unsplash.com/photo-1558929996-da64ba858215?w=150&h=150&fit=crop', bio: 'ציד וספורטאי 🎯' },
  { email: 'luna.tabby@demo.petish.com', full_name: 'לונה הטאבי', avatar_url: 'https://images.unsplash.com/photo-1495360010541-f48722b34f7d?w=150&h=150&fit=crop', bio: 'חתולה טאבי חמודה 🌙' },
  { email: 'oscar.mixed@demo.petish.com', full_name: 'אוסקר המעורב', avatar_url: 'https://images.unsplash.com/photo-1548199973-03cce0bbc87b?w=150&h=150&fit=crop', bio: 'מעורב מדהים 🏆' },
  { email: 'cinnamon.bengal@demo.petish.com', full_name: 'קינמון הבנגלי', avatar_url: 'https://images.unsplash.com/photo-1574158622682-e40e69881006?w=150&h=150&fit=crop', bio: 'נמר מיניאטורי 🐆' },
  { email: 'max.aussie@demo.petish.com', full_name: 'מקס האוסטרלי', avatar_url: 'https://images.unsplash.com/photo-1605568427561-40dd23c2acea?w=150&h=150&fit=crop', bio: 'רועה אוסטרלי מדהים 🇦🇺' },
  { email: 'gracie.persian@demo.petish.com', full_name: 'גרייסי הפרסית', avatar_url: 'https://images.unsplash.com/photo-1596854407944-bf87f6fdd49e?w=150&h=150&fit=crop', bio: 'חמודה ומפונקת 👸' },
  { email: 'finn.collie@demo.petish.com', full_name: 'פין הקולי', avatar_url: 'https://images.unsplash.com/photo-1568572933382-74d440642117?w=150&h=150&fit=crop', bio: 'כמו לאסי 🐕' },
];

// Posts - all 1:1 aspect ratio images
const demoPosts = [
  { image_url: 'https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=800&h=800&fit=crop', caption: 'יום מושלם בפארק! 🐕☀️ מי רוצה לצאת איתי לטיול?' },
  { image_url: 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=800&h=800&fit=crop', caption: 'מנוחת צהריים על הספה האהובה עליי 😺💤' },
  { image_url: 'https://images.unsplash.com/photo-1552053831-71594a27632d?w=800&h=800&fit=crop', caption: 'חיוך גדול אחרי טיול ארוך! 🦮❤️' },
  { image_url: 'https://images.unsplash.com/photo-1529429617124-95b109e86bb8?w=800&h=800&fit=crop', caption: 'מי אמר שכלבים לא יודעים לשחות? 🏊‍♂️💦' },
  { image_url: 'https://images.unsplash.com/photo-1573865526739-10659fec78a5?w=800&h=800&fit=crop', caption: 'המבט שעושים כשהאוכל מאחר... 🦁🍽️' },
  { image_url: 'https://images.unsplash.com/photo-1601758228041-f3b2795255f1?w=800&h=800&fit=crop', caption: 'יום הולדת שמח לי! 🎂🐾' },
  { image_url: 'https://images.unsplash.com/photo-1548199973-03cce0bbc87b?w=800&h=800&fit=crop', caption: 'טיול עם החבר הכי טוב! 🐕🐕' },
  { image_url: 'https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?w=800&h=800&fit=crop', caption: 'הפוזה שלי לצילום 📸✨' },
  { image_url: 'https://images.unsplash.com/photo-1605568427561-40dd23c2acea?w=800&h=800&fit=crop', caption: 'האסקי בשלג - אין דבר יותר מאושר 🐺❄️' },
  { image_url: 'https://images.unsplash.com/photo-1574158622682-e40e69881006?w=800&h=800&fit=crop', caption: 'חתול פרסי מלכותי 👑' },
  { image_url: 'https://images.unsplash.com/photo-1495360010541-f48722b34f7d?w=800&h=800&fit=crop', caption: 'סקרנות היא השם האמצעי שלי 🔍' },
  { image_url: 'https://images.unsplash.com/photo-1543852786-1cf6624b9987?w=800&h=800&fit=crop', caption: 'שמש על הפרווה - אין כמו זה! ☀️' },
  { image_url: 'https://images.unsplash.com/photo-1568572933382-74d440642117?w=800&h=800&fit=crop', caption: 'רועה גרמני בשירות הציבור 🐕‍🦺' },
  { image_url: 'https://images.unsplash.com/photo-1583337130417-3346a1be7dee?w=800&h=800&fit=crop', caption: 'שיבה אינו מדויייק! 🍡' },
  { image_url: 'https://images.unsplash.com/photo-1592194996308-7b43878e84a6?w=800&h=800&fit=crop', caption: 'ראגדול רכרוכה 🎀' },
  { image_url: 'https://images.unsplash.com/photo-1558929996-da64ba858215?w=800&h=800&fit=crop', caption: 'בוקסר בפעולה 💪' },
  { image_url: 'https://images.unsplash.com/photo-1535930891776-0c2dfb7fda1a?w=800&h=800&fit=crop', caption: 'פומרניאן פלאפי 🧸' },
  { image_url: 'https://images.unsplash.com/photo-1596854407944-bf87f6fdd49e?w=800&h=800&fit=crop', caption: 'עיניים כחולות יפות 💙' },
  { image_url: 'https://images.unsplash.com/photo-1615497001839-b0a0eac3274c?w=800&h=800&fit=crop', caption: 'מיין קון - הענק העדין 🦁' },
  { image_url: 'https://images.unsplash.com/photo-1571566882372-1598d88abd90?w=800&h=800&fit=crop', caption: 'חתול שחור = מזל טוב! 🖤🍀' },
  { image_url: 'https://images.unsplash.com/photo-1518020382113-a7e8fc38eac9?w=800&h=800&fit=crop', caption: 'תחש ארוך ומקסים 🌭' },
  { image_url: 'https://images.unsplash.com/photo-1518791841217-8f162f1e1131?w=800&h=800&fit=crop', caption: 'בריטית קצרת שיער - אצילות טהורה 🇬🇧' },
  { image_url: 'https://images.unsplash.com/photo-1589941013453-ec89f33b5e95?w=800&h=800&fit=crop', caption: 'רועה גרמני על המשמר 🛡️' },
  { image_url: 'https://images.unsplash.com/photo-1544568100-847a948585b9?w=800&h=800&fit=crop', caption: 'טרייר חמוד ומלא אנרגיה ⚡' },
  { image_url: 'https://images.unsplash.com/photo-1561037404-61cd46aa615b?w=800&h=800&fit=crop', caption: 'רטריבר זהוב - החבר הכי טוב 💛' },
  { image_url: 'https://images.unsplash.com/photo-1606214174585-fe31582dc6ee?w=800&h=800&fit=crop', caption: 'חתול אפור מסתורי 🌫️' },
  { image_url: 'https://images.unsplash.com/photo-1633722715463-d30f4f325e24?w=800&h=800&fit=crop', caption: 'גולדן רטריבר שמח 🌟' },
  { image_url: 'https://images.unsplash.com/photo-1615789591457-74a63395c990?w=800&h=800&fit=crop', caption: 'חתולת קליקו יפהפייה 🎨' },
  { image_url: 'https://images.unsplash.com/photo-1587402092301-725e37c70fd8?w=800&h=800&fit=crop', caption: 'צ׳יוואווה עם אופי גדול 💃' },
  { image_url: 'https://images.unsplash.com/photo-1513360371669-4adf3dd7dff8?w=800&h=800&fit=crop', caption: 'לבן כמו שלג ❄️' },
  // Park posts
  { image_url: 'https://images.unsplash.com/photo-1601758228041-f3b2795255f1?w=800&h=800&fit=crop', caption: '🌳 גינת כלבים מדהימה בפארק הירקון! #גינתכלבים #פארק' },
  { image_url: 'https://images.unsplash.com/photo-1548199973-03cce0bbc87b?w=800&h=800&fit=crop', caption: '🐕 כיף בגינה עם החברים! #גינתכלבים #חברים' },
  { image_url: 'https://images.unsplash.com/photo-1552053831-71594a27632d?w=800&h=800&fit=crop', caption: '☀️ יום שמשי בגינת הכלבים #גינתכלבים #שמש' },
  { image_url: 'https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=800&h=800&fit=crop', caption: '🏃 ריצה חופשית בפארק! #גינתכלבים #ריצה' },
  { image_url: 'https://images.unsplash.com/photo-1558929996-da64ba858215?w=800&h=800&fit=crop', caption: '🎾 משחק עם הכדור בגינה #גינתכלבים #משחק' },
  // More varied posts
  { image_url: 'https://images.unsplash.com/photo-1605568427561-40dd23c2acea?w=800&h=800&fit=crop', caption: 'האסקי שלי אוהב שלג! 🐺❄️' },
  { image_url: 'https://images.unsplash.com/photo-1608744882201-52a7f7f3dd60?w=800&h=800&fit=crop', caption: 'פודל מתוקה 🐩💕' },
  { image_url: 'https://images.unsplash.com/photo-1505628346881-b72b27e84530?w=800&h=800&fit=crop', caption: 'ביגל סקרן 🔍' },
  { image_url: 'https://images.unsplash.com/photo-1612536057832-2ff7ead58194?w=800&h=800&fit=crop', caption: 'קורגי עם רגליים קצרות 🧡' },
];

// Stories
const demoStories = [
  { media_url: 'https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=800&h=1400&fit=crop' },
  { media_url: 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=800&h=1400&fit=crop' },
  { media_url: 'https://images.unsplash.com/photo-1552053831-71594a27632d?w=800&h=1400&fit=crop' },
  { media_url: 'https://images.unsplash.com/photo-1529429617124-95b109e86bb8?w=800&h=1400&fit=crop' },
  { media_url: 'https://images.unsplash.com/photo-1573865526739-10659fec78a5?w=800&h=1400&fit=crop' },
  { media_url: 'https://images.unsplash.com/photo-1605568427561-40dd23c2acea?w=800&h=1400&fit=crop' },
  { media_url: 'https://images.unsplash.com/photo-1574158622682-e40e69881006?w=800&h=1400&fit=crop' },
  { media_url: 'https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?w=800&h=1400&fit=crop' },
  { media_url: 'https://images.unsplash.com/photo-1568572933382-74d440642117?w=800&h=1400&fit=crop' },
  { media_url: 'https://images.unsplash.com/photo-1543852786-1cf6624b9987?w=800&h=1400&fit=crop' },
];

// Adoption pets
const adoptionPets = [
  { name: 'לוקי', type: 'כלב', breed: 'מעורב', age_years: 2, age_months: 0, gender: 'זכר', size: 'בינוני', description: 'כלב חברותי ומשחקן', is_vaccinated: true, is_neutered: true, image_url: 'https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=800&h=800&fit=crop', status: 'available' },
  { name: 'מיה', type: 'חתול', breed: 'טאבי', age_years: 1, age_months: 6, gender: 'נקבה', size: 'קטן', description: 'חתולה עדינה ושקטה', is_vaccinated: true, is_neutered: true, image_url: 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=800&h=800&fit=crop', status: 'available' },
  { name: 'מקס', type: 'כלב', breed: 'לברדור', age_years: 3, age_months: 0, gender: 'זכר', size: 'גדול', description: 'אוהב ילדים ומשפחות', is_vaccinated: true, is_neutered: true, image_url: 'https://images.unsplash.com/photo-1552053831-71594a27632d?w=800&h=800&fit=crop', status: 'available' },
  { name: 'שירה', type: 'חתול', breed: 'פרסי', age_years: 4, age_months: 0, gender: 'נקבה', size: 'בינוני', description: 'מפונקת ואוהבת ליטופים', is_vaccinated: true, is_neutered: true, image_url: 'https://images.unsplash.com/photo-1574158622682-e40e69881006?w=800&h=800&fit=crop', status: 'available' },
  { name: 'רוקי', type: 'כלב', breed: 'בוקסר', age_years: 5, age_months: 0, gender: 'זכר', size: 'גדול', description: 'שומר נאמן ומסור', is_vaccinated: true, is_neutered: true, image_url: 'https://images.unsplash.com/photo-1558929996-da64ba858215?w=800&h=800&fit=crop', status: 'available' },
  { name: 'קוקו', type: 'חתול', breed: 'סיאמי', age_years: 2, age_months: 0, gender: 'נקבה', size: 'קטן', description: 'עיניים כחולות ויפות', is_vaccinated: true, is_neutered: false, image_url: 'https://images.unsplash.com/photo-1596854407944-bf87f6fdd49e?w=800&h=800&fit=crop', status: 'available' },
  { name: 'באדי', type: 'כלב', breed: 'גולדן רטריבר', age_years: 1, age_months: 0, gender: 'זכר', size: 'גדול', description: 'ידידותי ואוהב לשחק', is_vaccinated: true, is_neutered: false, image_url: 'https://images.unsplash.com/photo-1633722715463-d30f4f325e24?w=800&h=800&fit=crop', status: 'available' },
  { name: 'לילי', type: 'חתול', breed: 'בריטית קצרת שיער', age_years: 3, age_months: 0, gender: 'נקבה', size: 'בינוני', description: 'שקטה ואצילית', is_vaccinated: true, is_neutered: true, image_url: 'https://images.unsplash.com/photo-1518791841217-8f162f1e1131?w=800&h=800&fit=crop', status: 'available' },
];

Deno.serve(async (req) => {
  const corsResponse = handleCorsPreflightRequest(req);
  if (corsResponse) return corsResponse;

  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  try {
    console.log("Starting demo data creation...");
    
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const createdUsers: string[] = [];
    const errors: string[] = [];

    // Create demo users
    console.log(`Creating ${demoUsers.length} demo users...`);
    for (const user of demoUsers) {
      try {
        const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
        const existingUser = existingUsers?.users?.find(u => u.email === user.email);
        
        let userId: string;

        if (existingUser) {
          userId = existingUser.id;
          createdUsers.push(`${user.full_name} (existing)`);
        } else {
          const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
            email: user.email,
            password: 'DemoPass123!',
            email_confirm: true,
            user_metadata: { full_name: user.full_name }
          });

          if (createError) {
            errors.push(`Failed to create ${user.email}: ${createError.message}`);
            continue;
          }

          userId = newUser.user.id;
          createdUsers.push(user.full_name);
        }

        // Update profile
        await supabaseAdmin
          .from('profiles')
          .upsert({
            id: userId,
            full_name: user.full_name,
            email: user.email,
            avatar_url: user.avatar_url,
            bio: user.bio,
            points: Math.floor(Math.random() * 500) + 100
          });

      } catch (e: unknown) {
        const errorMessage = e instanceof Error ? e.message : 'Unknown error';
        errors.push(`Error with ${user.email}: ${errorMessage}`);
      }
    }

    // Get all demo user IDs
    const { data: profiles } = await supabaseAdmin
      .from('profiles')
      .select('id, full_name')
      .like('email', '%@demo.petish.com');

    console.log(`Found ${profiles?.length || 0} demo profiles`);

    if (profiles && profiles.length > 0) {
      // Create posts for demo users
      console.log(`Creating ${demoPosts.length} posts...`);
      for (let i = 0; i < demoPosts.length; i++) {
        const userIndex = i % profiles.length;
        const post = demoPosts[i];
        
        const { data: existingPost } = await supabaseAdmin
          .from('posts')
          .select('id')
          .eq('user_id', profiles[userIndex].id)
          .eq('image_url', post.image_url)
          .maybeSingle();

        if (!existingPost) {
          await supabaseAdmin
            .from('posts')
            .insert({
              user_id: profiles[userIndex].id,
              image_url: post.image_url,
              caption: post.caption,
              created_at: new Date(Date.now() - Math.random() * 14 * 24 * 60 * 60 * 1000).toISOString()
            });
        }
      }

      // Create stories for demo users
      console.log(`Creating ${demoStories.length} stories...`);
      for (let i = 0; i < demoStories.length; i++) {
        const userIndex = i % profiles.length;
        const story = demoStories[i];
        
        const { data: existingStory } = await supabaseAdmin
          .from('stories')
          .select('id')
          .eq('user_id', profiles[userIndex].id)
          .eq('media_url', story.media_url)
          .maybeSingle();

        if (!existingStory) {
          const createdAt = new Date(Date.now() - Math.random() * 12 * 60 * 60 * 1000);
          const expiresAt = new Date(createdAt.getTime() + 24 * 60 * 60 * 1000);
          
          await supabaseAdmin
            .from('stories')
            .insert({
              user_id: profiles[userIndex].id,
              media_url: story.media_url,
              media_type: 'image',
              created_at: createdAt.toISOString(),
              expires_at: expiresAt.toISOString()
            });
        }
      }

      // Add likes and comments
      console.log("Adding likes and comments...");
      const { data: posts } = await supabaseAdmin
        .from('posts')
        .select('id, user_id')
        .limit(30);

      if (posts) {
        for (const post of posts) {
          for (const profile of profiles) {
            if (profile.id !== post.user_id && Math.random() > 0.4) {
              const { data: existingLike } = await supabaseAdmin
                .from('post_likes')
                .select('id')
                .eq('post_id', post.id)
                .eq('user_id', profile.id)
                .maybeSingle();

              if (!existingLike) {
                await supabaseAdmin
                  .from('post_likes')
                  .insert({ post_id: post.id, user_id: profile.id });
              }
            }
          }
        }
      }
    }

    // Create adoption pets
    console.log(`Creating ${adoptionPets.length} adoption pets...`);
    for (const pet of adoptionPets) {
      const { data: existingPet } = await supabaseAdmin
        .from('adoption_pets')
        .select('id')
        .eq('name', pet.name)
        .eq('breed', pet.breed)
        .maybeSingle();

      if (!existingPet) {
        await supabaseAdmin
          .from('adoption_pets')
          .insert(pet);
      }
    }

    console.log("Demo data creation completed!");

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Demo data created successfully',
        stats: {
          users: createdUsers.length,
          posts: demoPosts.length,
          stories: demoStories.length,
          adoptionPets: adoptionPets.length
        },
        created: createdUsers,
        errors: errors.length > 0 ? errors : undefined
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error("Error creating demo data:", errorMessage);
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
