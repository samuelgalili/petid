import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, Copy, Check, ChevronLeft, ChevronRight, Smartphone, Square, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';

// Import ad images
import petInsuranceDog from '@/assets/ads/pet-insurance-dog.png';
import dogTraining from '@/assets/ads/dog-training.png';
import breedRecognition from '@/assets/ads/breed-recognition.png';
import petShopCat from '@/assets/ads/pet-shop-cat.png';
import loyaltyClub from '@/assets/ads/loyalty-club.png';

interface AdCampaign {
  id: string;
  name: string;
  nameHe: string;
  color: string;
  image: string;
  headline: {
    he: string;
    en: string;
  };
  subHeadline: {
    he: string;
    en: string;
  };
  cta: {
    he: string;
    en: string;
  };
  storyText: {
    he: string;
    en: string;
  };
  feedCaption: {
    he: string;
    en: string;
  };
  imagePrompt: string;
}

const campaigns: AdCampaign[] = [
  {
    id: 'insurance',
    name: 'Pet Insurance',
    nameHe: 'ביטוח חיות מחמד',
    color: '#3B82F6',
    image: petInsuranceDog,
    headline: {
      he: 'קרה לכם פעם שהייתם צריכים לוותר על טיפול לחיית המחמד בגלל המחיר?',
      en: 'Ever had to skip pet care because of the cost?'
    },
    subHeadline: {
      he: 'כיסוי רפואי מותאם אישית — במחיר נוח.',
      en: 'Personalized medical coverage — at an affordable price.'
    },
    cta: {
      he: 'קבלו הצעת מחיר',
      en: 'Get Quote'
    },
    storyText: {
      he: 'ביטוח חיות מחמד.\nכיסוי אמיתי, מחיר נגיש.\nלחצו לקבלת הצעת מחיר.',
      en: 'Pet Insurance.\nReal coverage, accessible price.\nTap for a quote.'
    },
    feedCaption: {
      he: 'הכי כואב זה לוותר על טיפול בגלל העלויות.\nעם PetID Insurance — חיית המחמד שלכם מקבלת כיסוי אמיתי.\nלחצו לקבלת הצעת מחיר מותאמת אישית.',
      en: 'PetID Insurance — real protection for your pet.\nTap to get a personalized quote.'
    },
    imagePrompt: 'Cute golden retriever puppy sitting on pure white background, soft studio lighting, minimalistic premium aesthetic, professional pet photography'
  },
  {
    id: 'training',
    name: 'Dog Training Course',
    nameHe: 'קורס אילוף אינטראקטיבי',
    color: '#22C55E',
    image: dogTraining,
    headline: {
      he: 'האילוף הראשון בעולם שמתקדם רק כשאתם מצלמים את הכלב שלכם 📸🐶',
      en: "The world's first training that advances only when you film your dog 📸🐶"
    },
    subHeadline: {
      he: 'AI מאשר את הביצוע → השלב הבא נפתח.',
      en: 'AI verifies the task → Next level unlocks.'
    },
    cta: {
      he: 'למידע נוסף',
      en: 'Learn More'
    },
    storyText: {
      he: 'אילוף AI לכלבים\nהכלב מצלם → המערכת מאשרת → מתקדמים.\nהתחילו עכשיו.',
      en: 'AI Dog Training\nFilm → System verifies → Progress.\nStart now.'
    },
    feedCaption: {
      he: 'קורס אילוף חדשני מבוסס צילום:\nכל שלב נפתח רק לאחר שהכלב מבצע את המשימה ואתם מעלים הוכחה.\nהכול מותאם לפי גזע, גיל ואופי.\nלחצו לפרטים.',
      en: "The world's first AI-verified dog training.\nUpload your dog's progress — unlock the next level."
    },
    imagePrompt: 'Adorable border collie dog in training pose on pure white background, attentive expression, soft studio lighting, minimalistic premium aesthetic'
  },
  {
    id: 'breed',
    name: 'Breed Recognition',
    nameHe: 'זיהוי גזע בעזרת AI',
    color: '#F97316',
    image: breedRecognition,
    headline: {
      he: 'עולה תמונה → מקבלים את הגזע המדויק תוך 3 שניות',
      en: 'Upload a photo → Get the exact breed in 3 seconds'
    },
    subHeadline: {
      he: 'AI מתקדם שמזהה מעל 500 גזעים ותתי-גזעים.',
      en: 'Advanced AI that identifies over 500 breeds and sub-breeds.'
    },
    cta: {
      he: 'נסו עכשיו',
      en: 'Try Now'
    },
    storyText: {
      he: 'צלמו את הכלב → גזע מדויק תוך שניות.',
      en: "Photo your dog → Exact breed in seconds."
    },
    feedCaption: {
      he: 'לא בטוחים מה הגזע?\nעם PetID AI — תמונה אחת וזהו.\nנסו עכשיו.',
      en: "Upload a photo → Instantly get your dog's exact breed."
    },
    imagePrompt: 'Beautiful husky dog portrait on pure white background, majestic pose, soft studio lighting, minimalistic premium aesthetic'
  },
  {
    id: 'shop',
    name: 'PetID Shop',
    nameHe: 'חנות מוצרים לחיות מחמד',
    color: '#EF4444',
    image: petShopCat,
    headline: {
      he: 'מוצרים נבחרים לכלבים וחתולים — משלוח מהיר + נקודות נאמנות',
      en: 'Selected products for dogs & cats — Fast delivery + loyalty points'
    },
    subHeadline: {
      he: 'חנות פרימיום עם מוצרים אמינים בלבד.',
      en: 'Premium shop with only trusted products.'
    },
    cta: {
      he: 'קנו עכשיו',
      en: 'Shop Now'
    },
    storyText: {
      he: 'מבצעים חדשים + משלוח מהיר\nצברו נקודות על כל רכישה.',
      en: 'New deals + Fast delivery\nEarn points on every purchase.'
    },
    feedCaption: {
      he: 'PetID Shop — החנות הרשמית למוצרים איכותיים לכלבים וחתולים.\nרק מוצרים מומלצים באמת.\nלחצו לרכישה.',
      en: 'Premium pet shop.\nFast delivery + earn loyalty points on every order.'
    },
    imagePrompt: 'Cute British shorthair cat with premium pet accessories on pure white background, elegant pose, soft studio lighting'
  },
  {
    id: 'loyalty',
    name: 'Loyalty Club',
    nameHe: 'מועדון לקוחות + נקודות + קופונים',
    color: '#EAB308',
    image: loyaltyClub,
    headline: {
      he: 'מועדון הלקוחות של PetID — צוברים נקודות בכל קנייה',
      en: 'PetID Loyalty Club — Earn points on every purchase'
    },
    subHeadline: {
      he: 'הנחות, קופונים, הטבות ומבצעים בלעדיים.',
      en: 'Discounts, coupons, benefits and exclusive deals.'
    },
    cta: {
      he: 'הצטרפו עכשיו',
      en: 'Join Now'
    },
    storyText: {
      he: 'מועדון PetID\nצברו נקודות בכל קנייה.\nהצטרפו עכשיו.',
      en: 'PetID Club\nEarn points every purchase.\nJoin now.'
    },
    feedCaption: {
      he: 'מועדון הלקוחות הרשמי של PetID:\nצברו נקודות בכל קנייה, קופונים ייחודיים והפתעות חודשיות.\nהצטרפו עכשיו בלחיצה.',
      en: 'Join the PetID Loyalty Club.\nEarn points on every purchase + exclusive rewards.'
    },
    imagePrompt: 'Happy corgi dog with joyful expression on pure white background, celebrating pose, soft studio lighting'
  }
];

// PetID brand colors
const PETID_BLUE = '#1D4E89';
const PETID_GOLD = '#F7BF00';

const AdCampaigns = () => {
  const [currentCampaign, setCurrentCampaign] = useState(0);
  const [language, setLanguage] = useState<'he' | 'en'>('he');
  const [format, setFormat] = useState<'feed' | 'story'>('feed');
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const { toast } = useToast();

  const campaign = campaigns[currentCampaign];

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    toast({
      title: language === 'he' ? 'הועתק!' : 'Copied!',
      description: language === 'he' ? 'הטקסט הועתק ללוח' : 'Text copied to clipboard'
    });
    setTimeout(() => setCopiedField(null), 2000);
  };

  const downloadImage = () => {
    const link = document.createElement('a');
    link.href = campaign.image;
    link.download = `petid-${campaign.id}-${format}-${language}.png`;
    link.click();
    toast({
      title: language === 'he' ? 'התמונה הורדה!' : 'Image Downloaded!',
      description: `${campaign.name} - ${format.toUpperCase()}`
    });
  };

  const nextCampaign = () => {
    setCurrentCampaign((prev) => (prev + 1) % campaigns.length);
  };

  const prevCampaign = () => {
    setCurrentCampaign((prev) => (prev - 1 + campaigns.length) % campaigns.length);
  };

  const CopyButton = ({ text, field }: { text: string; field: string }) => (
    <Button
      variant="ghost"
      size="sm"
      className="h-8 w-8 p-0"
      onClick={() => copyToClipboard(text, field)}
    >
      {copiedField === field ? (
        <Check className="h-4 w-4 text-success" />
      ) : (
        <Copy className="h-4 w-4 text-muted-foreground" />
      )}
    </Button>
  );

  return (
    <div className="min-h-screen bg-background pb-20" dir={language === 'he' ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b border-border">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold text-foreground">
              PetID Ad Campaigns
            </h1>
            <div className="flex items-center gap-2">
              <Button
                variant={language === 'he' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setLanguage('he')}
                className={language === 'he' ? 'bg-[#1D4E89] hover:bg-[#1D4E89]/90' : ''}
              >
                עברית
              </Button>
              <Button
                variant={language === 'en' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setLanguage('en')}
                className={language === 'en' ? 'bg-[#1D4E89] hover:bg-[#1D4E89]/90' : ''}
              >
                English
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Campaign Navigator */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <Button variant="ghost" size="icon" onClick={prevCampaign}>
            <ChevronLeft className="h-6 w-6" />
          </Button>
          
          <div className="flex-1 flex justify-center gap-2 overflow-x-auto px-4">
            {campaigns.map((c, idx) => (
              <button
                key={c.id}
                onClick={() => setCurrentCampaign(idx)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap ${
                  idx === currentCampaign
                    ? 'text-white shadow-lg scale-105'
                    : 'bg-secondary text-muted-foreground hover:bg-secondary/80'
                }`}
                style={idx === currentCampaign ? { backgroundColor: c.color } : {}}
              >
                {language === 'he' ? c.nameHe : c.name}
              </button>
            ))}
          </div>
          
          <Button variant="ghost" size="icon" onClick={nextCampaign}>
            <ChevronRight className="h-6 w-6" />
          </Button>
        </div>

        {/* Format Toggle */}
        <div className="flex justify-center mb-8">
          <div className="bg-secondary rounded-full p-1 flex gap-1">
            <button
              onClick={() => setFormat('feed')}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                format === 'feed' ? 'bg-card text-foreground shadow' : 'text-muted-foreground'
              }`}
            >
              <Square className="h-4 w-4" />
              Feed (1080×1080)
            </button>
            <button
              onClick={() => setFormat('story')}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                format === 'story' ? 'bg-card text-foreground shadow' : 'text-muted-foreground'
              }`}
            >
              <Smartphone className="h-4 w-4" />
              Story (1080×1920)
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid lg:grid-cols-2 gap-8">
          {/* Ad Preview */}
          <AnimatePresence mode="wait">
            <motion.div
              key={`${campaign.id}-${format}-${language}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="flex justify-center"
            >
              <div
                className={`bg-white rounded-2xl shadow-2xl overflow-hidden ${
                  format === 'feed' ? 'w-[340px] aspect-square' : 'w-[280px] aspect-[9/16]'
                }`}
              >
                {/* Ad Content */}
                <div className="h-full flex flex-col p-6 relative">
                  {/* Logo */}
                  <div className="flex justify-center mb-4">
                    <div className="flex items-center gap-1">
                      <span className="text-2xl font-black" style={{ color: PETID_BLUE }}>Pet</span>
                      <span className="text-2xl font-black" style={{ color: PETID_GOLD }}>ID</span>
                    </div>
                  </div>

                  {/* Image */}
                  <div className={`flex-1 flex items-center justify-center ${format === 'story' ? 'my-4' : 'my-2'}`}>
                    <img
                      src={campaign.image}
                      alt={campaign.name}
                      className={`object-contain ${format === 'feed' ? 'max-h-[140px]' : 'max-h-[200px]'}`}
                    />
                  </div>

                  {/* Text Content */}
                  <div className="text-center space-y-3">
                    <h2 className={`font-bold text-gray-900 leading-tight ${format === 'feed' ? 'text-sm' : 'text-base'}`}>
                      {campaign.headline[language]}
                    </h2>
                    <p className="text-gray-600 text-xs">
                      {campaign.subHeadline[language]}
                    </p>
                  </div>

                  {/* CTA Button */}
                  <div className="mt-4">
                    <button
                      className="w-full py-3 rounded-xl font-semibold text-white text-sm shadow-lg"
                      style={{ backgroundColor: PETID_BLUE }}
                    >
                      {campaign.cta[language]}
                    </button>
                  </div>

                  {/* Story-specific bottom text */}
                  {format === 'story' && (
                    <p className="text-center text-[10px] text-gray-400 mt-3">
                      {language === 'he' ? 'החליקו למעלה' : 'Swipe up'}
                    </p>
                  )}
                </div>
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Copy & Assets */}
          <div className="space-y-6">
            {/* Campaign Info Card */}
            <div className="bg-card rounded-2xl p-6 border border-border">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div 
                    className="w-4 h-4 rounded-full" 
                    style={{ backgroundColor: campaign.color }}
                  />
                  <h3 className="font-bold text-lg text-foreground">
                    {language === 'he' ? campaign.nameHe : campaign.name}
                  </h3>
                </div>
                <Button onClick={downloadImage} className="bg-[#1D4E89] hover:bg-[#1D4E89]/90">
                  <Download className="h-4 w-4 mr-2" />
                  {language === 'he' ? 'הורדת תמונה' : 'Download'}
                </Button>
              </div>

              <Tabs defaultValue="headline" className="w-full">
                <TabsList className="w-full grid grid-cols-4 bg-secondary">
                  <TabsTrigger value="headline">{language === 'he' ? 'כותרת' : 'Headline'}</TabsTrigger>
                  <TabsTrigger value="caption">{language === 'he' ? 'קאפשן' : 'Caption'}</TabsTrigger>
                  <TabsTrigger value="story">{language === 'he' ? 'סטורי' : 'Story'}</TabsTrigger>
                  <TabsTrigger value="prompt">{language === 'he' ? 'פרומפט' : 'Prompt'}</TabsTrigger>
                </TabsList>

                <TabsContent value="headline" className="mt-4 space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-start justify-between">
                      <label className="text-sm font-medium text-muted-foreground">
                        {language === 'he' ? 'כותרת ראשית' : 'Main Headline'}
                      </label>
                      <CopyButton text={campaign.headline[language]} field="headline" />
                    </div>
                    <p className="text-foreground bg-secondary p-3 rounded-lg text-sm">
                      {campaign.headline[language]}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-start justify-between">
                      <label className="text-sm font-medium text-muted-foreground">
                        {language === 'he' ? 'כותרת משנה' : 'Sub-headline'}
                      </label>
                      <CopyButton text={campaign.subHeadline[language]} field="subheadline" />
                    </div>
                    <p className="text-foreground bg-secondary p-3 rounded-lg text-sm">
                      {campaign.subHeadline[language]}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-start justify-between">
                      <label className="text-sm font-medium text-muted-foreground">
                        {language === 'he' ? 'כפתור CTA' : 'CTA Button'}
                      </label>
                      <CopyButton text={campaign.cta[language]} field="cta" />
                    </div>
                    <p className="text-foreground bg-secondary p-3 rounded-lg text-sm font-medium">
                      {campaign.cta[language]}
                    </p>
                  </div>
                </TabsContent>

                <TabsContent value="caption" className="mt-4">
                  <div className="space-y-2">
                    <div className="flex items-start justify-between">
                      <label className="text-sm font-medium text-muted-foreground">
                        {language === 'he' ? 'קאפשן לפיד' : 'Feed Caption'}
                      </label>
                      <CopyButton text={campaign.feedCaption[language]} field="caption" />
                    </div>
                    <p className="text-foreground bg-secondary p-4 rounded-lg text-sm whitespace-pre-line">
                      {campaign.feedCaption[language]}
                    </p>
                  </div>
                </TabsContent>

                <TabsContent value="story" className="mt-4">
                  <div className="space-y-2">
                    <div className="flex items-start justify-between">
                      <label className="text-sm font-medium text-muted-foreground">
                        {language === 'he' ? 'טקסט לסטורי' : 'Story Text'}
                      </label>
                      <CopyButton text={campaign.storyText[language]} field="story" />
                    </div>
                    <p className="text-foreground bg-secondary p-4 rounded-lg text-sm whitespace-pre-line">
                      {campaign.storyText[language]}
                    </p>
                  </div>
                </TabsContent>

                <TabsContent value="prompt" className="mt-4">
                  <div className="space-y-2">
                    <div className="flex items-start justify-between">
                      <label className="text-sm font-medium text-muted-foreground">
                        Image Generation Prompt
                      </label>
                      <CopyButton text={campaign.imagePrompt} field="prompt" />
                    </div>
                    <p className="text-foreground bg-secondary p-4 rounded-lg text-sm font-mono">
                      {campaign.imagePrompt}
                    </p>
                  </div>
                </TabsContent>
              </Tabs>
            </div>

            {/* Design Specifications */}
            <div className="bg-card rounded-2xl p-6 border border-border">
              <h4 className="font-bold text-foreground mb-4 flex items-center gap-2">
                <Globe className="h-5 w-5" />
                {language === 'he' ? 'מפרט עיצוב' : 'Design Specifications'}
              </h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="space-y-1">
                  <span className="text-muted-foreground">{language === 'he' ? 'רקע' : 'Background'}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-white border border-gray-200" />
                    <span className="text-foreground">White #FFFFFF</span>
                  </div>
                </div>
                <div className="space-y-1">
                  <span className="text-muted-foreground">{language === 'he' ? 'צבע ראשי' : 'Primary Color'}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded" style={{ backgroundColor: PETID_BLUE }} />
                    <span className="text-foreground">Blue #1D4E89</span>
                  </div>
                </div>
                <div className="space-y-1">
                  <span className="text-muted-foreground">{language === 'he' ? 'צבע זהב' : 'Gold Accent'}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded" style={{ backgroundColor: PETID_GOLD }} />
                    <span className="text-foreground">Gold #F7BF00</span>
                  </div>
                </div>
                <div className="space-y-1">
                  <span className="text-muted-foreground">{language === 'he' ? 'טקסט' : 'Text'}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-gray-900" />
                    <span className="text-foreground">Black/Grey</span>
                  </div>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-border">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Feed:</span>
                    <span className="text-foreground ml-2">1080×1080px</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Story:</span>
                    <span className="text-foreground ml-2">1080×1920px</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* All Campaigns Overview */}
        <div className="mt-12">
          <h2 className="text-2xl font-bold text-foreground mb-6 text-center">
            {language === 'he' ? 'כל הקמפיינים' : 'All Campaigns'}
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {campaigns.map((c, idx) => (
              <motion.button
                key={c.id}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setCurrentCampaign(idx)}
                className={`bg-card rounded-xl p-4 border transition-all ${
                  idx === currentCampaign ? 'border-2 shadow-lg' : 'border-border'
                }`}
                style={idx === currentCampaign ? { borderColor: c.color } : {}}
              >
                <img src={c.image} alt={c.name} className="w-full aspect-square object-contain mb-3" />
                <p className="text-sm font-medium text-foreground text-center">
                  {language === 'he' ? c.nameHe : c.name}
                </p>
                <div 
                  className="w-full h-1 rounded-full mt-2"
                  style={{ backgroundColor: c.color }}
                />
              </motion.button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdCampaigns;
