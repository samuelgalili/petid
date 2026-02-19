import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { url } = await req.json();
    if (!url) {
      return new Response(JSON.stringify({ success: false, error: "URL is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");
    if (!FIRECRAWL_API_KEY) {
      return new Response(JSON.stringify({ success: false, error: "Firecrawl not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ success: false, error: "AI key not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Step 1: Scrape with Firecrawl ──
    console.log("Scraping URL:", url);
    const scrapeRes = await fetch("https://api.firecrawl.dev/v1/scrape", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${FIRECRAWL_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url,
        formats: ["markdown", "html", "links"],
        onlyMainContent: false,
        waitFor: 3000,
      }),
    });

    const scrapeData = await scrapeRes.json();
    if (!scrapeRes.ok || !scrapeData.success) {
      console.error("Firecrawl error:", scrapeData);
      return new Response(
        JSON.stringify({ success: false, error: "Failed to scrape page: " + (scrapeData.error || scrapeRes.status) }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const markdown = scrapeData.data?.markdown || scrapeData.markdown || "";
    const html = scrapeData.data?.html || scrapeData.html || "";
    const metadata = scrapeData.data?.metadata || scrapeData.metadata || {};

    // Extract main image from HTML
    const ogImage = metadata?.ogImage || metadata?.["og:image"] || "";
    const imageMatch = html.match(/<img[^>]+class="[^"]*(?:wp-post-image|woocommerce-product-gallery__image|product-image)[^"]*"[^>]+src="([^"]+)"/i)
      || html.match(/<div[^>]+class="[^"]*woocommerce-product-gallery[^"]*"[^>]*>[\s\S]*?<img[^>]+src="([^"]+)"/i)
      || html.match(/<meta[^>]+property="og:image"[^>]+content="([^"]+)"/i);
    const mainImage = ogImage || (imageMatch ? imageMatch[1] : "");

    // Extract price directly from HTML as fallback
    let htmlPrice: number | null = null;
    let htmlSalePrice: number | null = null;
    let htmlOriginalPrice: number | null = null;
    
    // WooCommerce sale price pattern: <del><bdi>original</bdi></del> <ins><bdi>sale</bdi></ins>
    const salePriceMatch = html.match(/<del[^>]*>.*?<bdi[^>]*>.*?([\d,.]+).*?<\/bdi>.*?<\/del>[\s\S]*?<ins[^>]*>.*?<bdi[^>]*>.*?([\d,.]+).*?<\/bdi>.*?<\/ins>/i);
    if (salePriceMatch) {
      htmlOriginalPrice = parseFloat(salePriceMatch[1].replace(/,/g, ""));
      htmlSalePrice = parseFloat(salePriceMatch[2].replace(/,/g, ""));
      htmlPrice = htmlOriginalPrice;
    }
    
    // WooCommerce single price
    if (!htmlPrice) {
      const priceMatch = html.match(/<(?:span|p|bdi)[^>]*class="[^"]*(?:woocommerce-Price-amount|price)[^"]*"[^>]*>.*?([\d,.]+).*?<\/(?:span|p|bdi)>/i)
        || html.match(/<meta[^>]+property="product:price:amount"[^>]+content="([\d,.]+)"/i)
        || html.match(/₪\s*([\d,.]+)/);
      if (priceMatch) {
        htmlPrice = parseFloat(priceMatch[1].replace(/,/g, ""));
      }
    }

    // Also try markdown for price (often near top)
    if (!htmlPrice) {
      const mdPriceMatch = markdown.match(/₪\s*([\d,.]+)/);
      if (mdPriceMatch) {
        htmlPrice = parseFloat(mdPriceMatch[1].replace(/,/g, ""));
      }
    }

    console.log("Scraped successfully, markdown length:", markdown.length, "image:", mainImage ? "found" : "none", "htmlPrice:", htmlPrice);

    // ── Step 2: Send to LLM for structured extraction ──
    const extractionPrompt = `You are a product data extraction specialist for a pet e-commerce platform that sells BOTH food AND accessories (collars, leashes, toys, beds, grooming tools).

Analyze the following scraped product page content and extract ALL data into the exact JSON structure below.

CATEGORY DETECTION - CRITICAL:
- If the page contains keywords like "מחסום", "muzzle", "זמם" → set category to "muzzles"
- If the page contains keywords like "חטיף", "treat", "snack", "חטיפון", "מקל לעיסה", "עצם לעיסה", "לעיסה", "chew", "פרס", "reward", "זרעי דלעת" → set category to "treats"
- If the page contains keywords like "שימורים", "פטה", "pate", "paté", "פחית", "canned", "wet food", "מזון רטוב" AND/OR weight ~400g → set category to "wet-food"
- If the page contains keywords like "lickimat", "ליקימט", "lick mat", "מפית ליקוק", "משטח ליקוק", "enrichment", "העשרה", "slow feeder", "אנטי גלופ" → set category to "enrichment"
- If the page contains keywords like "collar", "קולר", "צווארון", "רצועה", "leash", "harness", "הרנס", "toy", "צעצוע", "nylon", "ניילון", "D-ring", "buckle", "אבזם", "quick-release", "שחרור מהיר" → set category to "accessories"
- If the page contains keywords like "מיטה", "bed", "mat", "מזרן", "כרית", "cushion", "fluffy", "פלאפי", "snuggle" → set category to "beds"
- If the page contains keywords like "anti spill", "אנטי שפיכה", "bowl", "קערה", "splash", "מצוף", "floating", "no-mess", "שותה מבולגן", "messy drink" → set category to "bowls"
- If the page contains keywords like "plush", "פלאש", "בובה", "squeaky", "squeaker", "צפצפה", "crinkle", "מרשרש", "teething toy", "נשכן", "stuffed" → set category to "plush-toys"
- If the page contains keywords like "KONG", "קונג", "puzzle toy", "צעצוע חשיבה", "enrichment", "העשרה", "stuffing", "מילוי", "lick mat" → set category to "enrichment"
- If the page contains keywords like "training pad", "puppy pad", "pee pad", "פד אילוף", "רפידה", "רפידות", "פדים", "potty", "wee-wee", "absorbent pad", "attractant spray", "potty spray", "ספריי אילוף", "housebreaking spray" → set category to "potty-training"
- If the page contains keywords like "מזון", "food", "kibble" → set category to "dry-food" or "food"
- For WET FOOD: populate product_attributes with texture (e.g. "פטה", "נתחים ברוטב", "מוס"), origin/made_in (e.g. "איטליה", "Italy"), moisture_pct if mentioned. If text mentions glucosamine/chondroitin/מפרקים, note joint_support: true. If text mentions hydration/כליות/kidney/לחות, note hydration_support: true. Also extract mixing_tip if topper/mixed feeding is mentioned.
- For ENRICHMENT/PUZZLE/KONG products: populate product_attributes with material (e.g. "TPR לא רעיל", "סיליקון Food Grade", "Natural Red Rubber"), dimensions (e.g. "20x20 cm"), and boolean features: freezer_safe, microwave_safe, dishwasher_safe, has_erratic_bounce. Extract anxiety_uses as array (e.g. ["vet_visits", "fireworks", "boredom", "separation"]). Extract recipes as array of spreading ideas mentioned (e.g. ["יוגורט", "חמאת בוטנים", "מזון רטוב"]). Note dental/digestion benefits from licking action. Extract chew_resistance_level (e.g. "power chewer", "average chewer"). Note is_stuffable: true if product can be filled. Note expert_approved: true if veterinarian/trainer recommended.
- For accessories/muzzles: populate product_attributes with technical specs (material, size, color, features, closure, dimensions, care_instructions)
- For muzzles specifically: map "היקף" to "circumference", "אורך" to "length", extract size_number, and add breed_recommendations as an array of breed names
- For TREATS/SNACKS: populate product_attributes with texture (e.g. "קשה", "רך"), purpose (e.g. "פרס אילוף", "העסקה ולעיסה"), safety_tip (e.g. "מומלץ לעיסה בפיקוח"), and highlight special ingredients like "זרעי דלעת", "כבד עוף". For SUPERFOOD/FUNCTIONAL TREATS: also extract has_taurine (boolean), has_omega (boolean), has_cod_skin (boolean), has_fiber (boolean), is_dehydrated (boolean), protein_pct (number), is_100_natural (boolean), soulmate_brand (boolean if "Soulmate" brand), banana_content (boolean). If product contains "Taurine"/"טאורין", "Cod Skin"/"עור דג", or "Dehydrated"/"מיובש", trigger the superfood template.
- For BEDS/BEDDING products: populate product_attributes with material/texture (e.g. "בד פלאפי", "קטיפה"), diameter (e.g. "80 cm"), max_weight (e.g. "15 kg"), best_for (e.g. "כלבים קטנים עד בינוניים"), care_instructions (e.g. "כביסה עדינה במכונה"). Extract boolean features: is_washable, is_luxury_design. Note anxiety_relief if raised walls/bolsters mentioned. Note joint_support if orthopedic/senior mentioned.
- For BOWLS/UTILITY products: populate product_attributes with capacity (e.g. "1 ליטר"), brand (e.g. "Els Pet"), material (e.g. "PP Food Grade"), mechanism (e.g. "מנגנון מצוף"), maintenance (e.g. "פירוק וניקוי קל"). Extract boolean features: non_slip, travel_safe. Note messy_drinker_friendly: true if anti-spill/splash. Extract usage_scenarios as array (e.g. ["נסיעות ברכב", "כלבים מבולגנים", "אנטי החלקה"]).
- For CRATE/KENNEL/TRAINING products: populate product_attributes with material (e.g. "Heavy-Duty Steel"), doors (e.g. "Double Door"), latch_type (e.g. "Dual-Sliding Latches"), max_weight (e.g. "70 lbs"), crate_size (e.g. "36 inch"), includes_divider (boolean), is_foldable (boolean), has_removable_tray (boolean), is_training_crate (boolean). Extract pros as array (e.g. ["Easy assembly", "Spacious"]). Extract breed_size (e.g. "Large breeds").
- For GROOMING/SPA products: populate product_attributes with active_ingredients (array of ingredient names like "חלבוני משי", "ויטמין E"), coat_type (e.g. "פרוות בינונית עד ארוכה"), usage_steps (array of step strings), and boolean features: anti_static, non_greasy, odor_repellent, uv_protection, leave_in (no rinse). Extract visible_results as array (e.g. ["ברק של משי", "מגע רך", "הפחתת קשרים"]).
- For ADVANCED HYGIENE products (Arm & Hammer, Baking Soda shampoos): populate product_attributes with ph_balanced (boolean), core_technology (e.g. "Baking Soda"), scent (e.g. "Kiwi Blossom + Cucumber & Mint"), treatment_safe (boolean - safe with flea/tick treatments). Extract formula_attributes as array (e.g. ["paraben-free", "sulfate-free", "fast-acting"]). If brand is "Arm & Hammer" or text includes "Baking Soda" + "Shampoo", always set ph_balanced: true and treatment_safe: true.
- For POTTY TRAINING / PUPPY PADS: populate product_attributes with absorbency_cups (number e.g. 2), layer_count (number e.g. 5), has_attractant (boolean), has_odor_neutralizer (boolean), pad_dimensions (e.g. "22x22 inch"), pad_count (number e.g. 14), leakproof (boolean). Set life_stage to "puppy" when applicable. Extract brand for cross-sell suggestions.
- For ATTRACTANT SPRAY / POTTY SPRAY: populate product_attributes with is_spray (boolean: true), has_pheromone (boolean), natural_ingredients (boolean - based on fatty acids/non-toxic mentions), family_safe (boolean), indoor_outdoor (boolean). Extract safety_warnings as array (e.g. ["eye contact", "keep from children"]). Note training_booster description. Set life_stage to "puppy". Set category to "potty-training".
- For DESHEDDING/TOOL products (Furminator, deshedding, combs, rakes): populate product_attributes with efficiency_pct (number, e.g. 90 for "reduces shedding up to 90%"), tech_features (array of strings like ["FURejector Button", "Skin Guard", "Curved Edge"]), weight_range (e.g. "23-41 kg"), coat_type (e.g. "Long (over 5 cm)"), pro_tip (usage instructions string), and boolean home_hygiene. Extract brand carefully (e.g. "Furminator"). Set category to "deshedding" or "tools".
- For FLEA & TICK / MEDICAL PROTECTION products (Seresto, flea collars, spot-on): populate product_attributes with protection_duration_months (number, e.g. 8), active_ingredients (array e.g. ["Imidacloprid", "Flumethrin"]), species_warning (string e.g. "NOT FOR CATS"), min_age_weeks (number e.g. 7), and boolean features: water_resistant, odorless, non_greasy. Extract application_steps as array of strings. Note brand_authority (e.g. "Bayer"). Set category to "flea-tick" or "medical-protection".
- For PLUSH/TEETHING TOY products: populate product_attributes with has_squeaker (boolean), has_crinkle (boolean), has_rope (boolean), fabric_type (e.g. "Pineapple Plaid"), is_teething (boolean), durability_level (e.g. "sturdier plush"). Extract usage_scenarios as array (e.g. ["tug", "fetch", "cuddle"]). Note is_gift_worthy: true if cute/gift/birthday mentioned. Set category to "plush-toys".
- For PUPPY FOOD products: Set life_stage to "puppy". Extract feeding_guide with AGE-BASED groupings if available (e.g. rows containing "1-3 mos", "3-5 mos" etc. should preserve the age range in the "range" field alongside the weight). In product_attributes, include: has_dha (boolean if DHA/ARA/Omega mentioned for brain/eye development), has_antioxidants (boolean if antioxidant/LifeSource/immune mentioned), top_ingredient (string - the #1 ingredient e.g. "Deboned Chicken"), grain_contains (array e.g. ["barley", "oatmeal"]), grain_free_of (array e.g. ["corn", "wheat", "soy"]), satisfaction_guarantee (boolean if 100% satisfaction/guarantee mentioned). PRIORITY RULE: If product name includes "Puppy"/"גור"/"Growth"/"Junior" AND brand is "Blue Buffalo"/"Hill's"/"Royal Canin", always set life_stage to "puppy" and extract DHA, antioxidant, and top ingredient data.
- For food: populate product_attributes with nutritional values (protein_pct, fat_pct, fiber_pct, moisture_pct, ash_pct)
- For JOINT SUPPLEMENTS / THERAPEUTIC SUPPLEMENTS: populate product_attributes with has_glucosamine (boolean), glucosamine_mg (number), has_msm (boolean), msm_mg (number), has_chondroitin (boolean), chondroitin_mg (number), has_green_lipped_mussel (boolean), mussel_mg (number), has_antioxidants (boolean), has_omega (boolean), tablet_form (boolean). Extract dosage_initial and dosage_maintenance as weight-based arrays if available. Set category to "health" or "supplements".

RULES:
- Extract EXACTLY what is on the page. Do NOT invent or hallucinate data.
- For Hebrew text, keep it in Hebrew.
- For FOOD products:
  - feeding_guide: Extract EVERY row from feeding tables. Format: { "range": "weight range text", "amount": "daily amount text" }
  - ingredients: Extract the FULL ingredients list as a single string
  - benefits: Health benefits as [{ "title": "name", "description": "short description" }]
- For TREAT/SNACK products:
  - Extract ingredients as a single string
  - feeding_guide: Use for serving suggestions if available, otherwise empty array []
  - benefits: Extract health benefits focusing on ingredient-derived advantages. Map specific ingredients to health claims:
    - Chicken liver / כבד עוף → "תמיכה בשרירים" (Muscle Support)
    - Pumpkin seeds / זרעי דלעת → "סיוע בעיכול" (Digestion Aid)
    - Fatty acids / חומצות שומן / אומגה → "פרווה בריאה" (Shiny Coat)
    - Long chew / לעיסה ממושכת → "הפגת מתח" (Stress Relief)
    - Teeth cleaning / ניקוי שיניים / dental → "היגיינת שיניים" (Dental Hygiene)
  - special_diet: Include texture and natural claims like ["טבעי", "ללא חומרים משמרים", "ללא צבעים"]
  - In product_attributes, include:
    - texture: describe the chew texture in Hebrew (e.g. "קשה ועמיד", "לעיסתי ועמיד", "רך")
    - chew_duration: integer 1-5 (1=very short, 2=short, 3=medium, 4=long, 5=very long). If product name includes "Donut", "דונאט", "Bone", or "עצם", default to 4+
    - protein_pct: extract protein percentage if mentioned (e.g. "70% protein" → 70)
    - purpose: usage purpose (e.g. "פרס אילוף", "העסקה ולעיסה ממושכת")
    - safety_tip: safety recommendation if applicable (e.g. "מומלץ לעיסה בפיקוח")
  - PRIORITY RULE: If product name includes "Donut"/"דונאט"/"Bone"/"עצם", always extract chew_duration and dental-related benefits first
- For ACCESSORY products:
  - Set feeding_guide to empty array []
  - Set ingredients to null
  - In product_attributes, include: material, size, color, features (as comma-separated text), closure type, dimensions, and care_instructions (e.g. "ניקוי במטלית לחה")
  - For MUZZLE products specifically: in product_attributes also include circumference (map from "היקף"), length (map from "אורך"), size_number, and breed_recommendations as an array of Hebrew breed names the muzzle fits (e.g. ["ברניז", "באסט האונד", "רוטוויילר"])
  - benefits: Product features/advantages as [{ "title": "name", "description": "short description" }]
- PRIORITY RULE: If brand is "Arm & Hammer" or product contains both "Shampoo"/"שמפו" and "Baking Soda"/"סודה", always set category to "grooming", set ph_balanced: true, extract scent profile, and include Science Corner data about pH differences between dog and human skin
- PRIORITY RULE: If product name includes "Oil"/"שמן"/"Silk"/"משי"/"Shampoo"/"שמפו"/"Coat Care"/"Spray"/"ספריי"/"Conditioner"/"מרכך", always set category to "grooming" and prioritize visible results, active ingredients, and coat type extraction
- category: one of: dry-food, wet-food, treats, toys, grooming, health, food, accessories, collars, leashes, beds, clothing, muzzles, enrichment, bowls, deshedding, tools, crates, kennels, training, flea-tick, medical-protection, plush-toys, puzzle, potty-training. Use null if unclear.
- PRIORITY RULE: If product name/description includes "Crate"/"כלוב"/"Kennel"/"מלונה"/"Cage"/"Training Crate", always set category to "crates" and extract material, doors, latch type, max weight, crate size, divider, foldable, removable tray, and training features.
- PRIORITY RULE: If the brand is "Furminator" or product name/description includes "Deshedding", "Comb"/"מסרק", "Shedding", "Undercoat", or "Rake", always set category to "deshedding", extract efficiency percentage, and trigger the size guide (weight_range + coat_type).
- PRIORITY RULE: If product weight is ~400g and keywords like "Pate"/"פטה"/"Can"/"פחית"/"שימורים" appear, always set category to "wet-food" and extract hydration/moisture benefits first
- PRIORITY RULE: If product name includes "Bed"/"מיטה"/"Mat"/"מזרן"/"Fluffy"/"פלאפי", always set category to "beds" and prioritize texture, sizing, and sleep/comfort features
- PRIORITY RULE: If product name includes "Anti Spill"/"Bowl"/"קערה"/"Splash", always set category to "bowls" and prioritize no-mess benefits. Link to "puppy" life_stage when applicable (puppies are often messy drinkers).
- PRIORITY RULE: If product name is "Seresto" or contains "Flea & Tick"/"Flea and Tick"/"פרעושים וקרציות", always set category to "flea-tick". Extract protection_duration_months, active_ingredients, species_warning, min_age_weeks, and boolean features: water_resistant, odorless, non_greasy. If brand is "Bayer" or "Seresto", always enforce species warning and min_age extraction.
- PRIORITY RULE: If product is a "Plush"/"פלאש"/"בובה"/"Squeaky"/"צפצפה"/"Teething Toy"/"נשכן"/"Stuffed", always set category to "plush-toys" and extract has_squeaker, has_crinkle, fabric_type, is_teething, usage_scenarios. Emphasize sensory sounds and durability features.
- PRIORITY RULE: If brand is "KONG"/"קונג" or product is a "Puzzle Toy"/"צעצוע חשיבה"/"Enrichment"/"העשרה"/"Stuffing", always set category to "enrichment" and extract is_stuffable, material (especially "Natural Red Rubber"), chew_resistance_level ("power chewer"/"average chewer"), has_erratic_bounce, expert_approved. Trigger the stuffing recipe card and prioritize the chewer resistance level in the UI.
- PRIORITY RULE: If product is "Training Pad"/"Puppy Pad"/"Pee Pad"/"פד אילוף"/"רפידות"/"Potty Pad"/"Wee-Wee", always set category to "potty-training" and extract absorbency_cups, layer_count, has_attractant, has_odor_neutralizer, pad_dimensions, pad_count. Set life_stage to "puppy". Prioritize absorbency and training guide in the UI.
- PRIORITY RULE: If product is "Attractant Spray"/"Potty Spray"/"ספריי אילוף"/"Housebreaking Spray"/"House Training Spray", always set category to "potty-training" and extract is_spray: true, has_pheromone, natural_ingredients, family_safe, indoor_outdoor, safety_warnings. Focus on family safety and instructional aspects. Set life_stage to "puppy".
- PRIORITY RULE: If product contains "Taurine"/"טאורין" or "Cod Skin"/"עור דג" or "Dehydrated"/"מיובש" in a TREAT context, always extract has_taurine, has_omega, has_cod_skin, has_fiber, is_dehydrated, protein_pct, is_100_natural, soulmate_brand. Focus on health-boost icons and dehydration technology note.
- PRIORITY RULE: If product contains "Glucosamine"/"גלוקוזאמין" or "Joint"/"מפרק" or "Supplement"/"תוסף" or "Chondroitin"/"כונדרויטין" or "MSM" or "Green Lipped Mussel", always set category to "health", extract all active ingredient dosages (mg), and trigger the two-stage dosage calculator and clinical ingredients table. Set life_stage to "senior" if joint/mobility context.
- PRIORITY RULE: If product contains "Salmon Oil"/"שמן סלמון" or "Omega-3"/"אומגה 3" or "Fish Oil"/"שמן דגים" in a LIQUID/OIL context (not capsule), always set category to "omega" or "liquid-supplement". Extract has_dha (boolean), has_epa (boolean), purity_pct (number), source_origin (e.g. "Norwegian"), is_multi_pet (boolean for dogs+cats), pump_serving (boolean). Set special_diet to include "omega-3". If product mentions both dogs and cats, set pet_type to "all".
- PRIORITY RULE: If product is a "Carrier"/"נשיאה"/"Travel Bag"/"תיק נסיעות"/"Backpack"/"תרמיל"/"Pet Bag", always set category to "carriers" or "travel". Extract max_weight_kg (number), dimensions (string e.g. "45x25x30"), is_expandable (boolean), has_ventilation (boolean), has_safety_tether (boolean), has_shoulder_strap (boolean), is_foldable (boolean), is_washable (boolean), has_hard_bottom (boolean), target_pets (e.g. "small dogs and cats"). Focus on weight limits and ventilation specs.
- PRIORITY RULE: If product contains "Obesity"/"השמנה" or "Vet Life"/"Veterinary Diet"/"מזון רפואי" or "Metabolic"/"Weight Management" with prescription context (but NOT specifically "Diabetic"), always set category to "veterinary" or "vet-diet". Extract fat_pct (number), kcal_per_kg (number), has_l_carnitine (boolean), has_high_fiber (boolean), glycemic_index ("low"/"medium"/"high"), usage_duration_months (number). Set life_stage to "adult" or "senior". Always flag as requiring veterinary supervision.
- PRIORITY RULE: If product contains "Diabetic"/"סוכרת" or "D/W" or "Diabetes" or explicitly "Glycemic"/"גליקמי", always set category to "diabetic". Extract protein_pct (number), fat_pct (number), has_psyllium (boolean), has_beet_pulp (boolean), has_glucosamine (boolean), has_chondroitin (boolean), glycemic_index ("low"). Set special_diet to include "diabetic". Always flag as requiring veterinary supervision and note meal timing with insulin.
- PRIORITY RULE: If product contains "Struvite"/"סטרוויט" or "Urinary"/"דרכי השתן" or "S/O"/"U/C" or "stone dissolution"/"אבני שתן" or "pH balance", always set category to "urinary" or "struvite". Extract has_dl_methionine (boolean), low_magnesium (boolean), low_phosphorus (boolean), has_glucosamine (boolean), glucosamine_pct (number), dissolution_weeks (string e.g. "5-12"), maintenance_months (number). Always flag as requiring veterinary prescription.
- PRIORITY RULE: If product contains "Renal"/"כלייתי"/"כליות" or "K/D" or "Kidney" or "CKD" or "Chronic Kidney Disease", always set category to "renal". Extract low_phosphorus (boolean), controlled_protein (boolean), low_sodium (boolean), has_omega3 (boolean), omega3_source (string), ph_optimized (boolean). Set special_diet to include "renal". Always flag as requiring veterinary supervision and emphasize hydration and periodic blood tests.
- PRIORITY RULE: If product contains "UltraHypo"/"Hypoallergenic"/"היפואלרגני" or "Hydrolyzed"/"הידרוליזד"/"מפורק" or "Atopic"/"אטופי" or "Elimination Diet"/"דיאטת אלימינציה", always set category to "hypoallergenic" or "dermatology". Extract dalton_size (number), has_hydrolyzed_protein (boolean), omega3_pct (number), has_rice_starch (boolean), elimination_weeks (number). Set special_diet to include "hypoallergenic". Always flag as requiring veterinary supervision and strict elimination diet compliance.
- PRIORITY RULE: If product contains "Intestinal"/"מעי" or "Gastro"/"גסטרו" or "I/D" or "GI" or "Pancreatitis"/"דלקת לבלב" or "Digestive Care"/"עיכול", always set category to "gastrointestinal" or "intestinal". Extract has_fos (boolean), has_mos (boolean), has_omega3 (boolean), is_low_fat (boolean), digestibility_pct (number). Set special_diet to include "gastrointestinal". Always flag as requiring veterinary supervision and recommend splitting meals to 3-4 per day.
- PRIORITY RULE: If product contains "Joint"/"מפרקים" or "Mobility"/"ניידות" or "J/D" or "Orthopedic"/"אורתופדי" or "Osteoarthritis"/"שחיקת סחוס", always set category to "joint" or "mobility". Extract has_glucosamine (boolean), glucosamine_mg_kg (number), has_chondroitin (boolean), chondroitin_mg_kg (number), omega3_pct (number), epa_pct (number), dha_pct (number), protein_pct (number), fat_pct (number). Set special_diet to include "joint-support". Always flag as requiring veterinary supervision and recommend monitoring mobility improvement within 4-8 weeks.
- PRIORITY RULE: If product contains "Hepatic"/"כבדי"/"כבד" or "L/D" or "Liver" or "Copper Storage", always set category to "hepatic". Extract copper_mg_kg (number), protein_pct (number), has_fos (boolean), has_mos (boolean), omega3_pct (number), has_spelt (boolean). Set special_diet to include "hepatic". Always flag as requiring veterinary supervision and emphasize periodic liver enzyme blood tests.
- PRIORITY RULE: If product contains "Cardiac"/"לבבי"/"לב" or "Heart" or "Cardio", always set category to "cardiac". Extract low_sodium (boolean), has_ginseng (boolean), has_sod (boolean), has_fit_aroma (boolean), has_xos (boolean), omega3_pct (number). Set special_diet to include "cardiac". Always flag as requiring veterinary supervision and note signs like shortness of breath or unusual fatigue.
- pet_type: dog, cat, or all.
- life_stage: puppy, kitten, adult, senior, all. Use null if unclear.
- dog_size: small, medium, large, all. Use null if unclear.
- brand: Extract the brand/manufacturer name.
- special_diet: Array of dietary features (food) or product features (accessories) like ["grain-free"] or ["reflective", "padded"].

Return ONLY valid JSON, no markdown fences, no explanation.

JSON STRUCTURE:
{
  "name": "string",
  "brand": "string or null",
  "price": number or 0,
  "sale_price": number or null,
  "original_price": number or null,
  "description": "string",
  "ingredients": "string or null",
  "benefits": [{"title":"string","description":"string"}],
  "feeding_guide": [{"range":"string","amount":"string"}],
  "product_attributes": {},
  "category": "string or null",
  "pet_type": "string",
  "life_stage": "string or null",
  "dog_size": "string or null",
  "special_diet": ["string"],
  "sku": "string or null",
  "weight_text": "string or null"
}

PAGE CONTENT:
${markdown.slice(0, 24000)}`;

    console.log("Sending to AI for extraction...");
    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "user", content: extractionPrompt },
        ],
        temperature: 0.1,
      }),
    });

    if (!aiRes.ok) {
      const errText = await aiRes.text();
      console.error("AI error:", aiRes.status, errText);
      if (aiRes.status === 429) {
        return new Response(JSON.stringify({ success: false, error: "Rate limit exceeded, try again shortly" }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiRes.status === 402) {
        return new Response(JSON.stringify({ success: false, error: "AI credits exhausted" }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ success: false, error: "AI extraction failed" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiRes.json();
    const rawContent = aiData.choices?.[0]?.message?.content || "";

    // Parse the JSON from LLM response (strip markdown fences if any)
    let extracted: any;
    try {
      const jsonStr = rawContent.replace(/```json?\s*/g, "").replace(/```/g, "").trim();
      extracted = JSON.parse(jsonStr);
    } catch (parseErr) {
      console.error("Failed to parse AI response:", rawContent.slice(0, 500));
      return new Response(
        JSON.stringify({ success: false, error: "AI returned invalid JSON", raw: rawContent.slice(0, 1000) }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── Step 3: Assemble final result ──
    const result = {
      name: extracted.name || metadata?.title || "",
      brand: extracted.brand || null,
      price: extracted.price || htmlPrice || 0,
      sale_price: extracted.sale_price || htmlSalePrice || null,
      original_price: extracted.original_price || htmlOriginalPrice || null,
      description: extracted.description || "",
      image_url: mainImage || "/placeholder.svg",
      images: mainImage ? [mainImage] : [],
      sku: extracted.sku || null,
      source_url: url,
      category: extracted.category || null,
      pet_type: extracted.pet_type || "all",
      ingredients: extracted.ingredients || null,
      benefits: Array.isArray(extracted.benefits) ? extracted.benefits : [],
      feeding_guide: Array.isArray(extracted.feeding_guide) ? extracted.feeding_guide : [],
      product_attributes: extracted.product_attributes || {},
      life_stage: extracted.life_stage || null,
      dog_size: extracted.dog_size || null,
      special_diet: Array.isArray(extracted.special_diet) ? extracted.special_diet : [],
      weight_text: extracted.weight_text || null,
      needs_review: !extracted.ingredients,
      review_reasons: !extracted.ingredients ? ["missing_ingredients"] : [],
    };

    console.log("Extraction complete:", result.name, "| benefits:", result.benefits.length, "| feeding rows:", result.feeding_guide.length);

    return new Response(JSON.stringify({ success: true, data: result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("smart-scrape-product error:", err);
    return new Response(
      JSON.stringify({ success: false, error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
