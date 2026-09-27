# External product images

Live catalogue `GET https://mipo.pet/api/products`, probed on 27 September 2026 from this audit.
No product rows and no image files were changed. A URL is external when it is absolute and its host is not `mipo.pet`.
Each URL was fetched once (12s timeout). `ok` means the response was an image. `HTML` means the body was an HTML page (here, HTTP 202 captcha). `403` is HTTP 403.

## Summary

- 82 in-stock products use an externally hosted **main** image. One more product is out of stock. 92 distinct external URLs in total, including gallery copies.
- This probe: **72 ok**, **18 HTML**, **2 with status 403**, **0 timeouts**.
- 25 in-stock products have a main image that did not load: 23 on `ken-hatuki.co.il` (HTML captcha) and 2 on `speedog.co.il` (403).
- `foodforafriend.co.il` returned an image (HTTP 200) in this probe. QA had seen that host time out, so it is still an off-site dependency even though it answered this time. Product `ce74ab15-ae9b-4663-b06d-f5560d20b19f` עצם דחוסה 10".
- Re-hosting is an owner decision. Nothing here was copied onto mipo.pet.

## Not loading

### ken-hatuki.co.il

- `HTML`, HTTP 202
  - https://ken-hatuki.co.il/wp-content/uploads/2024/11/vital_perro_mantenimiento-no-backround-e1735810301760.webp
  - `cd927dc5-1650-4e91-bff8-121949dcd648` ג’ארד מיינטננס 20 ק”ג (in stock, main)

- `HTML`, HTTP 202
  - https://ken-hatuki.co.il/wp-content/uploads/2024/12/%D7%90%D7%95%D7%9B%D7%9C-%D7%9C%D7%92%D7%95%D7%A8-%D7%92%D7%95%D7%A0%D7%99%D7%95%D7%A8-%D7%90%D7%A7%D7%A1%D7%98%D7%A8%D7%94-%D7%A2%D7%95%D7%A3-1.webp
  - `55cdedf5-6bad-4f1e-9258-beb22ec2a83f` קוואטרו כלב ג’וניור אקסטרה עוף 7 קג (in stock, main)
  - `98e4cc1c-37c1-4008-ac21-bfc1e1310e2a` קוואטרו כלב ג’וניור אקסטרה עוף 7 קג (in stock, main)

- `HTML`, HTTP 202
  - https://ken-hatuki.co.il/wp-content/uploads/2024/12/%D7%90%D7%A7%D7%A1%D7%98%D7%A8%D7%94-%D7%A2%D7%95%D7%A3-%D7%9C%D7%9B%D7%9C-%D7%94%D7%9E%D7%99%D7%A0%D7%99%D7%9D.webp
  - `96feeb9e-e651-4eea-ba21-df52f58e6c09` קוואטרו כלב בוגר אקסטרה עוף 12 ק"ג (in stock, main)
  - `dd235990-7fd0-4e0d-98ae-957d02289393` קוואטרו כלב בוגר אקסטרה עוף 3 ק"ג (in stock, main)

- `HTML`, HTTP 202
  - https://ken-hatuki.co.il/wp-content/uploads/2024/12/%D7%91%D7%95%D7%92%D7%A8-%D7%A7%D7%95%D7%95%D7%90%D7%98%D7%A8%D7%95-%D7%90%D7%A7%D7%A1%D7%98%D7%A8%D7%94-%D7%9B%D7%91%D7%A9.webp
  - `da58d8b0-6e6c-4bbb-b563-9c5ad627bf91` קוואטרו כלב בוגר אקסטרה כבש 3 ק"ג (in stock, main)
  - `4c5ef0b7-3b2e-4452-a661-5727bd89694d` קוואטרו כלב בוגר אקסטרה כבש 12 ק"ג (in stock, main)

- `HTML`, HTTP 202
  - https://ken-hatuki.co.il/wp-content/uploads/2024/12/%D7%9B%D7%9C%D7%91-%D7%91%D7%95%D7%92%D7%A8-%D7%90%D7%A7%D7%A1%D7%98%D7%A8%D7%94-%D7%A1%D7%9C%D7%9E%D7%95%D7%9F-%D7%A7%D7%95%D7%95%D7%90%D7%98%D7%A8%D7%95.webp
  - `357633ed-a8e2-44d1-bbf4-5743fed59ed5` קוואטרו בוגר אקסטרה סלמון 3 ק"ג (in stock, main)
  - `220bdeb7-d737-497f-a706-c74b41f8b97e` קוואטרו בוגר אקסטרה סלמון 12 ק"ג (in stock, main)

- `HTML`, HTTP 202
  - https://ken-hatuki.co.il/wp-content/uploads/2024/12/%D7%A1%D7%9C%D7%9E%D7%95%D7%9F-%D7%A7%D7%A8%D7%99%D7%9C-%D7%91%D7%95%D7%92%D7%A8-%D7%9B%D7%9C-%D7%94%D7%92%D7%93%D7%9C%D7%99%D7%9D-12-1.webp
  - `a30a67ee-d2f3-4054-a3de-e44dfce4227c` קוואטרו גרין פרי בוגר סלמון וקריל 12 ק"ג (in stock, main)

- `HTML`, HTTP 202
  - https://ken-hatuki.co.il/wp-content/uploads/2024/12/%D7%A1%D7%9C%D7%9E%D7%95%D7%9F-%D7%A7%D7%A8%D7%99%D7%9C-%D7%91%D7%95%D7%92%D7%A8-%D7%9E%D7%99%D7%A0%D7%99-1-5-1.webp
  - `94ee3d55-3c30-4c1a-a619-b55d5ae7c310` קוואטרו גרין פרי בוגר מיני סלמון וקריל היפואלרגני 7 ק"ג (in stock, main)

- `HTML`, HTTP 202
  - https://ken-hatuki.co.il/wp-content/uploads/2024/12/%D7%A7%D7%95%D7%95%D7%90%D7%98%D7%A8%D7%95-%D7%90%D7%95%D7%9B%D7%9C-%D7%9C%D7%9B%D7%9C%D7%91-%D7%91%D7%95%D7%92%D7%A8-%D7%9B%D7%91%D7%A9-12.webp
  - `025ae904-fa99-435d-b692-7a9de674c740` קוואטרו גרין פרי בוגר כבש 12 ק”ג (in stock, main)

- `HTML`, HTTP 202
  - https://ken-hatuki.co.il/wp-content/uploads/2024/12/%D7%A7%D7%95%D7%95%D7%90%D7%98%D7%A8%D7%95-%D7%92%D7%A8%D7%99%D7%9F-%D7%A4%D7%A8%D7%99-%D7%91%D7%95%D7%92%D7%A8-%D7%9B%D7%9C-%D7%94%D7%92%D7%93%D7%9C%D7%99%D7%9D-12-%D7%91%D7%A8%D7%95%D7%95%D7%96.webp
  - `8a724b82-44c4-47e9-bfdc-085a4bd1b835` קוואטרו גרין פרי בוגר ברווז 12 ק"ג (in stock, main)

- `HTML`, HTTP 202
  - https://ken-hatuki.co.il/wp-content/uploads/2024/12/%D7%A7%D7%95%D7%95%D7%90%D7%98%D7%A8%D7%95-%D7%92%D7%A8%D7%99%D7%9F-%D7%A4%D7%A8%D7%99-%D7%91%D7%95%D7%92%D7%A8-%D7%9E%D7%99%D7%A0%D7%99-7-%D7%91%D7%A8%D7%95%D7%95%D7%96-1.webp
  - `e3949d58-3c77-491d-833d-5a7419702823` קוואטרו גרין פרי בוגר מיני ברווז סנסיטיב 7 ק"ג (in stock, main)

- `HTML`, HTTP 202
  - https://ken-hatuki.co.il/wp-content/uploads/2024/12/%D7%A7%D7%95%D7%95%D7%90%D7%98%D7%A8%D7%95-%D7%92%D7%A8%D7%99%D7%9F-%D7%A4%D7%A8%D7%99-%D7%92%D7%95%D7%A0%D7%99%D7%95%D7%A8-%D7%91%D7%A8%D7%95%D7%95%D7%96-%D7%9E%D7%99%D7%A0%D7%99.webp
  - `2f423cde-8d17-43b8-8bee-82fc5a8379ca` קוואטרו גרין פרי ג’וניור מיני ברווז 1.5 ק"ג (in stock, main)

- `HTML`, HTTP 202
  - https://ken-hatuki.co.il/wp-content/uploads/2024/12/%D7%A7%D7%95%D7%95%D7%90%D7%98%D7%A8%D7%95-%D7%92%D7%A8%D7%99%D7%9F-%D7%A4%D7%A8%D7%99-%D7%92%D7%95%D7%A8-7-%D7%91%D7%A8%D7%95%D7%95%D7%96-1.webp
  - `2cf8fd17-7c6a-442f-b7bc-1fad76b217b3` קוואטרו גרין פרי פאפי מיני ברווז 7 ק"ג (in stock, main)

- `HTML`, HTTP 202
  - https://ken-hatuki.co.il/wp-content/uploads/2024/12/%D7%A7%D7%95%D7%95%D7%90%D7%98%D7%A8%D7%95-%D7%A1%D7%A0%D7%99%D7%95%D7%A8-%D7%9E%D7%99%D7%A0%D7%99-%D7%93%D7%92-%D7%9C%D7%91%D7%9F-7.webp
  - `e0c6ac9b-0784-4587-90f6-82816c879c08` קוואטרו סניור מיני דג לבן וקריל גרין פרי 1.5 ק"ג (in stock, main)
  - `7c0c170e-00ca-4727-a6ec-82c2e2f9a65d` קוואטרו סניור מיני דג לבן וקריל גרין פרי 7 ק"ג (in stock, main)

- `HTML`, HTTP 202
  - https://ken-hatuki.co.il/wp-content/uploads/2024/12/%D7%A7%D7%95%D7%95%D7%90%D7%98%D7%A8%D7%95-%D7%A4%D7%90%D7%A4%D7%99-%D7%9E%D7%99%D7%A0%D7%99-%D7%91%D7%A8%D7%95%D7%95%D7%96-1.5.webp
  - `6cd7157a-f6fc-4210-81c9-c7f31d91de78` קוואטרו גרין פרי פאפי מיני ברווז 1.5 ק"ג (in stock, main)

- `HTML`, HTTP 202
  - https://ken-hatuki.co.il/wp-content/uploads/2024/12/quattro-dogs-1.5kg-smallbreed-lamb-579x923px-1.png
  - `21ac1d01-f977-4697-8912-748cf06b0442` קוואטרו גרין פרי בוגר מיני כבש 1.5 ק"ג (in stock, main)

- `HTML`, HTTP 202
  - https://ken-hatuki.co.il/wp-content/uploads/2024/12/quattro-dogs-15kg-smallbreed-lamb-1.webp
  - `1ae7c311-d36c-4d3f-90ef-27b5387145f6` קוואטרו גרין פרי בוגר מיני כבש 7 ק"ג (in stock, main)

- `HTML`, HTTP 202
  - https://ken-hatuki.co.il/wp-content/uploads/2024/12/quattro-dogs-15kg-smallbreed-salmonwithkrill-579x923px-1.png
  - `6e09496f-aa98-4714-ab95-43476c271aa0` קוואטרו סלמון וקריל בוגר גזע מיני גרין פרי היפואלרגני 1.5 ק"ג (in stock, main)

- `HTML`, HTTP 202
  - https://ken-hatuki.co.il/wp-content/uploads/2025/06/Q-All-breed-junior-duck-580x923px-2.webp
  - `623b0fd2-3b7d-476f-a002-1b6931b992a7` קוואטרו ג’וניור ברווז גרין פרי 3 ק"ג (in stock, main)

### speedog.co.il

- `403`, HTTP 403
  - https://speedog.co.il/wp-content/uploads/2022/10/%D7%A2%D7%A6%D7%9D-%D7%93%D7%97%D7%95%D7%A1%D7%94-12_.jpg
  - `293af4d2-728e-4822-b3f6-0d48758637ae` עצם דחוסה (in stock, main)

- `403`, HTTP 403
  - https://speedog.co.il/wp-content/uploads/2022/10/%D7%A7%D7%95%D7%A0%D7%92-%D7%9B%D7%93%D7%95%D7%A8-%D7%98%D7%A0%D7%99%D7%A1-%D7%91%D7%A0%D7%95%D7%A0%D7%99-1-%D7%99%D7%97.jpg
  - `27e1a898-c4cb-4846-9044-93cc113204b6` קונג כדור טניס בנוני 1 יח' (in stock, main)

## Loading

### d3m9l0v76dty0.cloudfront.net

- `ok`, HTTP 200
  - https://d3m9l0v76dty0.cloudfront.net/system/photos/19765434/large/cd747b826326deff5f6b5e1b65853f4a.jpg
  - `c2c4b657-1366-42d6-89ba-325dac472ed3` חבל דנטלי 2 קשרים קטן | Small Dental Rope 2 Knots (in stock, gallery)

- `ok`, HTTP 200
  - https://d3m9l0v76dty0.cloudfront.net/system/photos/19765434/original/cd747b826326deff5f6b5e1b65853f4a.jpg
  - `c2c4b657-1366-42d6-89ba-325dac472ed3` חבל דנטלי 2 קשרים קטן | Small Dental Rope 2 Knots (in stock, main)

- `ok`, HTTP 200
  - https://d3m9l0v76dty0.cloudfront.net/system/photos/5023631/large/d8a850e54d094ccb5db49d03c2175c5b.jpg
  - `860de1d7-7ec0-46fe-8f18-3785e10cfa67` משחק לחתולים מולקולה קופצנית (in stock, gallery)

- `ok`, HTTP 200
  - https://d3m9l0v76dty0.cloudfront.net/system/photos/5023631/original/d8a850e54d094ccb5db49d03c2175c5b.jpg
  - `860de1d7-7ec0-46fe-8f18-3785e10cfa67` משחק לחתולים מולקולה קופצנית (in stock, main)

- `ok`, HTTP 200
  - https://d3m9l0v76dty0.cloudfront.net/system/photos/5377991/large/042255951ae20051ecd7ecabb03f6515.jpg
  - `f68c718d-5e54-478e-9881-28292e95db0e` צעצוע קונג עצם גודיז פאפי ורוד (in stock, gallery)

- `ok`, HTTP 200
  - https://d3m9l0v76dty0.cloudfront.net/system/photos/5377991/original/042255951ae20051ecd7ecabb03f6515.jpg
  - `f68c718d-5e54-478e-9881-28292e95db0e` צעצוע קונג עצם גודיז פאפי ורוד (in stock, main)

- `ok`, HTTP 200
  - https://d3m9l0v76dty0.cloudfront.net/system/photos/8434669/large/2a248746d0da232a337328b68abf861a.jpg
  - `8f929b29-4120-43d7-8624-e0ca88bb06e7` רצועת ניילון מגוון צבעים (in stock, gallery)

- `ok`, HTTP 200
  - https://d3m9l0v76dty0.cloudfront.net/system/photos/8434669/original/2a248746d0da232a337328b68abf861a.jpg
  - `8f929b29-4120-43d7-8624-e0ca88bb06e7` רצועת ניילון מגוון צבעים (in stock, main)

### foodforafriend.co.il

- `ok`, HTTP 200
  - https://foodforafriend.co.il/wp-content/uploads/2025/11/649870168583-1.png
  - `ce74ab15-ae9b-4663-b06d-f5560d20b19f` עצם דחוסה 10" (in stock, main)

### i0.wp.com

- `ok`, HTTP 200
  - https://i0.wp.com/foodforafriend.co.il/wp-content/uploads/2025/11/649870168583-1.png?fit=202%2C371&ssl=1
  - `ce74ab15-ae9b-4663-b06d-f5560d20b19f` עצם דחוסה 10" (in stock, gallery)

### images.unsplash.com

- `ok`, HTTP 200
  - https://images.unsplash.com/photo-1516734212186-a967f81ad0d7?w=900&auto=format&fit=crop
  - `72a0742f-1cc0-4612-9bfc-12672e429f8f` קולר מתכוונן עם תג QR (in stock, main)

- `ok`, HTTP 200
  - https://images.unsplash.com/photo-1529472119196-cb724127a98e?w=900&auto=format&fit=crop
  - `8436cc52-5d9e-4be3-ad58-e9fea4fad523` כדור משחק עמיד (in stock, main)

- `ok`, HTTP 200
  - https://images.unsplash.com/photo-1574144113084-b6f450cc5e0c?w=900&auto=format&fit=crop
  - `90c77a25-cfa8-43b0-98f8-9c377494aad6` Urinary Balance לחתולים (in stock, main)

- `ok`, HTTP 200
  - https://images.unsplash.com/photo-1583337130417-3346a1be7dee?w=900&auto=format&fit=crop
  - `0746a8d2-262c-4817-a617-871c4086c2e8` MIPO Salmon Indoor לחתולים (in stock, main)

- `ok`, HTTP 200
  - https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=900&auto=format&fit=crop
  - `7a877843-d7cf-47ed-be2f-dd6910dd9251` Digestive Care פרוביוטיקה (in stock, main)

- `ok`, HTTP 200
  - https://images.unsplash.com/photo-1585435557343-3b092031a831?w=900&auto=format&fit=crop
  - `b802d4a1-88da-4581-833f-ac1f0f221be4` Skin & Coat אומגה 3 (in stock, main)

- `ok`, HTTP 200
  - https://images.unsplash.com/photo-1589924691995-400dc9ecc119?w=900&auto=format&fit=crop
  - `286d75af-06fc-415b-92fa-857ee1fcd049` MIPO Daily Chicken לכלבים (in stock, main)

### petparadise.co.il

- `ok`, HTTP 200
  - https://petparadise.co.il/cdn/shop/files/129_c7364123-acd5-4885-be0e-2e8198480403.jpg?v=1745853236&width=120
  - `28fefd70-cdc9-4e00-a8d2-c636744a88ed` חטיף אלפא דוג משקולות עוף וברווז עם עור בקר 80 גרם (in stock, main)

### phibroisrael.com

- `ok`, HTTP 200
  - https://phibroisrael.com/wp-content/uploads/2021/01/%D7%97%D7%9C%D7%91%D7%99%D7%AA-440-%D7%A8%D7%A4%D7%95%D7%90%D7%99-1-600x600.jpg
  - `ab5e3710-312b-4106-9319-6e01642ad401` חלבית 440 לא רפואי לעגלים 25 ק"ג (out of stock, main)

### tiktakpet.co.il

- `ok`, HTTP 200
  - https://tiktakpet.co.il/wp-content/uploads/2025/12/%D7%91%D7%90%D7%A4%D7%A1-%D7%97%D7%98%D7%99%D7%A3-%D7%98%D7%91%D7%A2%D7%99-%D7%91%D7%95%D7%9C%D7%99-%D7%A1%D7%98%D7%99%D7%A7%D7%A1-%D7%91%D7%A7%D7%A8.jpg
  - `a7ddaf46-18e0-498a-a444-bbc46b48a795` באפס חטיף טבעי בולי סטיקס בקר 100 גרם (in stock, main)

- `ok`, HTTP 200
  - https://tiktakpet.co.il/wp-content/uploads/2025/12/%D7%91%D7%90%D7%A4%D7%A1-%D7%97%D7%98%D7%99%D7%A3-%D7%98%D7%91%D7%A2%D7%99-%D7%92%D7%99%D7%93-%D7%91%D7%A7%D7%A8-%D7%9C%D7%9C%D7%A2%D7%99%D7%A1%D7%94-1.jpg
  - `744f4a67-7df5-461d-8b02-8513302dca64` באפס חטיף טבעי גיד בקר ללעיסה 100 גרם (in stock, main)

- `ok`, HTTP 200
  - https://tiktakpet.co.il/wp-content/uploads/2025/12/%D7%91%D7%90%D7%A4%D7%A1-%D7%97%D7%98%D7%99%D7%A3-%D7%98%D7%91%D7%A2%D7%99-%D7%95%D7%95%D7%A9%D7%98-%D7%91%D7%A7%D7%A8-%D7%9C%D7%9C%D7%A2%D7%99%D7%A1%D7%94.jpg
  - `683bf594-15b5-4f4c-bdf2-e4a7c00a76f8` באפס טבעי ושט בקר ללעיסה 70 גרם (in stock, main)

- `ok`, HTTP 200
  - https://tiktakpet.co.il/wp-content/uploads/2025/12/%D7%91%D7%90%D7%A4%D7%A1-%D7%97%D7%98%D7%99%D7%A3-%D7%98%D7%91%D7%A2%D7%99-%D7%9E%D7%99%D7%A0%D7%99-%D7%91%D7%95%D7%A8%D7%92%D7%A8-%D7%91%D7%A7%D7%A8.jpg
  - `58840f5b-cdaa-4498-96ef-7986d69eb74e` באפס חטיף טבעי מיני בורגר בקר 100 גרם (in stock, main)

- `ok`, HTTP 200
  - https://tiktakpet.co.il/wp-content/uploads/2025/12/%D7%91%D7%90%D7%A4%D7%A1-%D7%97%D7%98%D7%99%D7%A3-%D7%98%D7%91%D7%A2%D7%99-%D7%A7%D7%95%D7%91%D7%99%D7%95%D7%AA-%D7%A8%D7%99%D7%90%D7%95%D7%AA-%D7%91%D7%A7%D7%A8.jpg
  - `59f837b8-4182-47d7-8ea3-a5dee13043f7` באפס טבעי קוביות ריאות בקר 100 גרם (in stock, main)

- `ok`, HTTP 200
  - https://tiktakpet.co.il/wp-content/uploads/2025/12/%D7%91%D7%90%D7%A4%D7%A1-%D7%97%D7%98%D7%99%D7%A3-%D7%98%D7%91%D7%A2%D7%99-%D7%A7%D7%95%D7%91%D7%99%D7%95%D7%AA-%D7%A8%D7%99%D7%90%D7%95%D7%AA-%D7%98%D7%9C%D7%94.jpg
  - `361d47c1-b6fe-4d49-a2fc-3eb0bef4c16a` באפס חטיף טבעי קוביות ריאות טלה 100 גרם (in stock, main)

- `ok`, HTTP 200
  - https://tiktakpet.co.il/wp-content/uploads/2025/12/%D7%91%D7%90%D7%A4%D7%A1-%D7%97%D7%98%D7%99%D7%A3-%D7%98%D7%91%D7%A2%D7%99-%D7%A8%D7%99%D7%90%D7%95%D7%AA-%D7%91%D7%A7%D7%A8-%D7%9C%D7%90%D7%99%D7%9E%D7%95%D7%9F-1.jpg
  - `2c63c8cd-8f31-4e06-b451-f75dea5d68f1` באפס טבעי גיד בקר ללעיסה 100 גרם (in stock, main)

- `ok`, HTTP 200
  - https://tiktakpet.co.il/wp-content/uploads/2025/12/%D7%91%D7%90%D7%A4%D7%A1-%D7%97%D7%98%D7%99%D7%A3-%D7%98%D7%91%D7%A2%D7%99-%D7%A8%D7%A6%D7%95%D7%A2%D7%95%D7%AA-%D7%91%D7%A7%D7%A8.jpg
  - `69a02437-a2b4-4d31-b44c-49574dc44e98` באפס חטיף טבעי רצועות בקר 100 גרם (in stock, main)

- `ok`, HTTP 200
  - https://tiktakpet.co.il/wp-content/uploads/2025/12/%D7%91%D7%90%D7%A4%D7%A1-%D7%98%D7%91%D7%A2%D7%99-%D7%95%D7%95%D7%A9%D7%98-%D7%91%D7%A7%D7%A8-%D7%9C%D7%9C%D7%A2%D7%99%D7%A1%D7%94.jpg
  - `40c529cd-5303-43a2-9a2e-a85ab19658b1` באפס טבעי וושט בקר ללעיסה 100 גרם (in stock, main)

- `ok`, HTTP 200
  - https://tiktakpet.co.il/wp-content/uploads/2025/12/%D7%91%D7%90%D7%A4%D7%A1-%D7%98%D7%91%D7%A2%D7%99-%D7%95%D7%95%D7%A9%D7%98-%D7%9B%D7%91%D7%A9-%D7%9C%D7%9C%D7%A2%D7%99%D7%A1%D7%94.jpg
  - `483a7d47-1c95-4410-9b40-306977c77c57` באפס טבעי וושט כבש ללעיסה 100 גרם (in stock, main)

- `ok`, HTTP 200
  - https://tiktakpet.co.il/wp-content/uploads/2025/12/%D7%91%D7%A7%D7%A8-%D7%9E%D7%9C%D7%95%D7%A4%D7%A3-%D7%A1%D7%99%D7%93%D7%9F.jpg
  - `a0e5d557-a854-4144-b984-2dd301be4309` דיימונדס חטיף היפואלרגני בקר מלופף סידן לכלב 80 גרם (in stock, main)

- `ok`, HTTP 200
  - https://tiktakpet.co.il/wp-content/uploads/2025/12/%D7%91%D7%A7%D7%A8-%D7%A2%D7%98%D7%95%D7%A3-%D7%91%D7%A7%D7%A8.jpg
  - `bbc97331-0335-4555-9587-f1b1a035ee47` חטיף צ'רליז רול בקר עטוף בשר בקר 500 גרם (in stock, main)

- `ok`, HTTP 200
  - https://tiktakpet.co.il/wp-content/uploads/2025/12/%D7%97%D7%98%D7%99%D7%A3-%D7%A6%D7%A8%D7%9C%D7%99%D7%96-%D7%93%D7%95%D7%A0%D7%90%D7%98-%D7%91%D7%A7%D7%A8-%D7%A2%D7%98%D7%95%D7%A3-%D7%91%D7%A9%D7%A8-%D7%91%D7%A7%D7%A8-500-%D7%92%D7%A8.jpg
  - `aa71a573-aad1-4b75-b393-2d8b2d4bf4ad` חטיף צ'רליז דונאט בקר עטוף בשר בקר 500 גרם (in stock, main)

- `ok`, HTTP 200
  - https://tiktakpet.co.il/wp-content/uploads/2025/12/%D7%97%D7%98%D7%99%D7%A3-%D7%A6%D7%A8%D7%9C%D7%99%D7%96-%D7%93%D7%95%D7%A0%D7%90%D7%98-%D7%91%D7%A7%D7%A8-%D7%A2%D7%98%D7%95%D7%A3-%D7%91%D7%A9%D7%A8-%D7%91%D7%A8%D7%95%D7%95%D7%96-500-%D7%92%D7%A8.jpg
  - `55d30fbe-0902-4578-b53b-a2971484509f` חטיף צ'רליז דונאט בקר עטוף בשר ברווז 500 גרם (in stock, main)

- `ok`, HTTP 200
  - https://tiktakpet.co.il/wp-content/uploads/2025/12/%D7%97%D7%98%D7%99%D7%A3-%D7%A6%D7%A8%D7%9C%D7%99%D7%96-%D7%93%D7%95%D7%A0%D7%90%D7%98-%D7%91%D7%A7%D7%A8-%D7%A2%D7%98%D7%95%D7%A3-%D7%91%D7%A9%D7%A8-%D7%9B%D7%91%D7%A9-500-%D7%92%D7%A8.jpg
  - `ba107351-4ddd-489e-aa1c-4291ce73fcd8` חטיף צ'רליז דונאט בקר עטוף בשר כבש 500 גרם (in stock, main)

- `ok`, HTTP 200
  - https://tiktakpet.co.il/wp-content/uploads/2025/12/%D7%97%D7%98%D7%99%D7%A3-%D7%A6%D7%A8%D7%9C%D7%99%D7%96-%D7%A8%D7%95%D7%9C-%D7%91%D7%A7%D7%A8-%D7%A2%D7%98%D7%95%D7%A3-%D7%91%D7%A9%D7%A8-%D7%91%D7%A8%D7%95%D7%95%D7%96-500-%D7%92%D7%A8.jpg
  - `fa4abcd0-c17a-4ef5-acdf-4719f95b9096` חטיף צ'רליז רול בקר עטוף בשר כבש 500 גרם (in stock, main)
  - `82024eed-13c0-4b3d-8fb0-525deae211fb` חטיף צ'רליז רול בקר עטוף בשר ברווז 500 גרם (in stock, main)

- `ok`, HTTP 200
  - https://tiktakpet.co.il/wp-content/uploads/2025/12/%D7%9B%D7%95%D7%A8%D7%9B%D7%95%D7%9E%D7%99%D7%9F.jpg
  - `9cbfe176-67e0-4704-962f-49e57bf17689` חטיף עצם יאק כורכומין במגוון גדלים (in stock, main)

- `ok`, HTTP 200
  - https://tiktakpet.co.il/wp-content/uploads/2025/12/%D7%9E%D7%91%D7%A6%D7%A2-%D7%97%D7%98%D7%99%D7%A4%D7%99%D7%9D-%D7%A0%D7%95%D7%91%D7%99%D7%9C%D7%95%D7%A1.jpg
  - `03066301-519e-4c9f-86b7-88e568009e9b` 10 חטיפי נובילוס לכלב ב־99 ₪ בלבד (in stock, main)

- `ok`, HTTP 200
  - https://tiktakpet.co.il/wp-content/uploads/2025/12/%D7%9E%D7%98%D7%91%D7%A2%D7%95%D7%AA-%D7%90%D7%A8%D7%A0%D7%91-%D7%95%D7%93%D7%92%D7%99%D7%9D.jpg
  - `0d1fed5c-af3a-4d4c-88e6-2348a616cdca` דיימונדס חטיף היפואלרגני מטבעות ארנב ודגים 80 גרם (in stock, main)

- `ok`, HTTP 200
  - https://tiktakpet.co.il/wp-content/uploads/2025/12/%D7%9E%D7%99%D7%A0%D7%99-%D7%91%D7%A7%D7%A8.jpg
  - `0b4b0363-0b4a-47a1-9127-227e912ec71e` דיימונדס חטיף היפואלרגני נגיסי בקר לכלב 80 גרם (in stock, main)

- `ok`, HTTP 200
  - https://tiktakpet.co.il/wp-content/uploads/2025/12/%D7%9E%D7%A7%D7%9C%D7%95%D7%A0%D7%99-%D7%90%D7%A8%D7%A0%D7%91%D7%AA.jpg
  - `99f9eed1-a73f-4656-88e6-1f19891412f4` דיימונדס חטיף היפואלרגני מקלוני ארנבת לכלב 80 גרם (in stock, main)

- `ok`, HTTP 200
  - https://tiktakpet.co.il/wp-content/uploads/2025/12/%D7%9E%D7%A7%D7%9C%D7%95%D7%A0%D7%99_%D7%91%D7%A7%D7%A8_3071.png
  - `f41fa480-ffa6-4b63-9929-c307c7e4dc70` בונזו חטיף מקלות בטעם בקר 50 גרם (in stock, main)

- `ok`, HTTP 200
  - https://tiktakpet.co.il/wp-content/uploads/2025/12/%D7%9E%D7%A7%D7%9C%D7%95%D7%A0%D7%99_%D7%9B%D7%91%D7%A9_3071.png
  - `7049ea22-7baf-4415-8860-3851f30df065` בונזו חטיף מקלות בטעם כבש 50 גרם (in stock, main)

- `ok`, HTTP 200
  - https://tiktakpet.co.il/wp-content/uploads/2025/12/%D7%9E%D7%A7%D7%9C%D7%95%D7%A0%D7%99_%D7%A2%D7%95%D7%A3_3071.png
  - `6fcbd7b7-5b67-4a48-8518-ebb2affdefb1` בונזו חטיף מקלות בטעם עוף 50 גרם (in stock, main)

- `ok`, HTTP 200
  - https://tiktakpet.co.il/wp-content/uploads/2025/12/%D7%9E%D7%A7%D7%9C%D7%95%D7%AA-%D7%A1%D7%9C%D7%9E%D7%95%D7%9F-1.jpg
  - `406037a7-5e89-40f7-b526-c43b70ded5f1` דיימונדס חטיף היפואלרגני מקלות סלמון לכלב 80 גרם (in stock, main)

- `ok`, HTTP 200
  - https://tiktakpet.co.il/wp-content/uploads/2025/12/%D7%9E%D7%A7%D7%9C%D7%95%D7%AA-%D7%A2%D7%95%D7%A3.jpg
  - `90b04afc-e6d2-4d97-8962-798d31dd0570` דיימונדס חטיף היפואלרגני מקלות עוף לכלב 80 גרם (in stock, main)

- `ok`, HTTP 200
  - https://tiktakpet.co.il/wp-content/uploads/2025/12/%D7%A0%D7%95%D7%91%D7%99%D7%9C%D7%95%D7%A1%D7%97%D7%98%D7%99%D7%A3-%D7%A4%D7%A8%D7%95%D7%A1%D7%95%D7%AA-%D7%91%D7%A8%D7%95%D7%95%D7%96.jpg
  - `055db8a8-78d4-4c6d-8452-50d67c4c3ccc` נובילוס פרוסות ברווז רכות חטיף לכלב 80 גרם (in stock, main)

- `ok`, HTTP 200
  - https://tiktakpet.co.il/wp-content/uploads/2025/12/%D7%A0%D7%95%D7%91%D7%99%D7%9C%D7%95%D7%A1-%D7%97%D7%98%D7%99%D7%A3-%D7%91%D7%9E%D7%A2%D7%98%D7%A4%D7%AA-%D7%91%D7%A8%D7%95%D7%95%D7%96.jpg
  - `28c77439-75b1-4ec1-a87a-6e18604b5da4` נובילוס חטיף עטוף ברווז ודג לכלב 80 גרם (in stock, main)

- `ok`, HTTP 200
  - https://tiktakpet.co.il/wp-content/uploads/2025/12/%D7%A0%D7%95%D7%91%D7%99%D7%9C%D7%95%D7%A1-%D7%97%D7%98%D7%99%D7%A3-%D7%9E%D7%A7%D7%9C%D7%95%D7%AA-%D7%91%D7%98%D7%A2%D7%9D-%D7%A2%D7%95%D7%A3.jpg
  - `7f31bd42-a04c-4b12-b612-457aca51da94` נובילוס חטיף מקלות עוף לכלב 80 גרם (in stock, main)

- `ok`, HTTP 200
  - https://tiktakpet.co.il/wp-content/uploads/2025/12/%D7%A0%D7%95%D7%91%D7%99%D7%9C%D7%95%D7%A1-%D7%97%D7%98%D7%99%D7%A3-%D7%A0%D7%A7%D7%A0%D7%99%D7%A7%D7%99%D7%95%D7%AA-%D7%9B%D7%91%D7%A9.jpg
  - `98d0a062-824b-4e2a-89c6-d53f11bcc935` נובילוס חטיף נקניקיות כבש לכלב 80 גרם (in stock, main)

- `ok`, HTTP 200
  - https://tiktakpet.co.il/wp-content/uploads/2025/12/%D7%A0%D7%95%D7%91%D7%99%D7%9C%D7%95%D7%A1-%D7%97%D7%98%D7%99%D7%A3-%D7%A1%D7%95%D7%A9%D7%99-%D7%91%D7%98%D7%A2%D7%9D-%D7%90%D7%A8%D7%A0%D7%91%D7%AA.jpg
  - `7c5bfa05-bfc6-4114-bb35-34b263b357a9` נובילוס חטיף סושי ארנבת לכלב 80 גרם (in stock, main)

- `ok`, HTTP 200
  - https://tiktakpet.co.il/wp-content/uploads/2025/12/%D7%A0%D7%95%D7%91%D7%99%D7%9C%D7%95%D7%A1-%D7%97%D7%98%D7%99%D7%A3-%D7%A1%D7%95%D7%A9%D7%99-%D7%91%D7%98%D7%A2%D7%9D-%D7%91%D7%A8%D7%95%D7%95%D7%96.jpg
  - `4ecf0723-7c9c-4887-96b7-ad159b315aea` נובילוס חטיף סושי ברווז לכלב 80 גרם (in stock, main)

- `ok`, HTTP 200
  - https://tiktakpet.co.il/wp-content/uploads/2025/12/%D7%A0%D7%95%D7%91%D7%99%D7%9C%D7%95%D7%A1-%D7%97%D7%98%D7%99%D7%A3-%D7%A2%D7%A6%D7%9E%D7%95%D7%AA-%D7%A2%D7%95%D7%A3.jpg
  - `22ad7726-d857-4a51-8ce4-95f691d6c180` נובילוס חטיף עצמות סידן בציפוי עוף לכלב 80 גרם (in stock, main)

- `ok`, HTTP 200
  - https://tiktakpet.co.il/wp-content/uploads/2025/12/%D7%A0%D7%95%D7%91%D7%99%D7%9C%D7%95%D7%A1-%D7%97%D7%98%D7%99%D7%A3-%D7%A4%D7%99%D7%9C%D7%94-%D7%91%D7%98%D7%A2%D7%9D-%D7%A1%D7%9C%D7%9E%D7%95%D7%9F.jpg
  - `2aa5f7f9-8038-4995-a641-31402546da13` Novilos Salmon Fillet Dog Treat 80g (in stock, main)

- `ok`, HTTP 200
  - https://tiktakpet.co.il/wp-content/uploads/2025/12/%D7%A0%D7%95%D7%91%D7%99%D7%9C%D7%95%D7%A1-%D7%97%D7%98%D7%99%D7%A3-%D7%A4%D7%99%D7%9C%D7%94-%D7%9C%D7%9B%D7%9C%D7%91-%D7%91%D7%98%D7%A2%D7%9D-%D7%91%D7%A8%D7%95%D7%95%D7%96.jpg
  - `c8479b06-208c-4168-ada8-4f7c4edbd43e` נובילוס חטיף פילה ברווז לכלב 80 גרם (in stock, main)

- `ok`, HTTP 200
  - https://tiktakpet.co.il/wp-content/uploads/2025/12/%D7%A0%D7%95%D7%91%D7%99%D7%9C%D7%95%D7%A1-%D7%97%D7%98%D7%99%D7%A3-%D7%A7%D7%95%D7%91%D7%99%D7%95%D7%AA-%D7%93%D7%92%D7%99%D7%9D-%D7%9C%D7%9B%D7%9C%D7%91.jpg
  - `3fc98ff9-329d-4554-bf12-1c3e96c878ec` נובילוס חטיף קוביות דג קוד לכלב 80 גרם (in stock, main)

- `ok`, HTTP 200
  - https://tiktakpet.co.il/wp-content/uploads/2025/12/%D7%A0%D7%95%D7%91%D7%99%D7%9C%D7%95%D7%A1-%D7%A1%D7%95%D7%A9%D7%99-%D7%97%D7%98%D7%99%D7%A3-%D7%91%D7%A7%D7%A8.jpg
  - `703785d8-0385-4c7f-8b58-18634a984e1f` נובילוס חטיף לכלב סושי בקר 80 גרם (in stock, main)

- `ok`, HTTP 200
  - https://tiktakpet.co.il/wp-content/uploads/2025/12/%D7%A0%D7%95%D7%91%D7%99%D7%9C%D7%95%D7%A1-%D7%A2%D7%A6%D7%9E%D7%95%D7%AA-%D7%A1%D7%99%D7%93%D7%9F-%D7%90%D7%A8%D7%A0%D7%91%D7%AA.jpg
  - `88949e3c-d8e3-4b91-ad9d-e58fa34835aa` נובילוס עצמות סידן במעטפת ארנבת לכלב 80 גרם (in stock, main)

- `ok`, HTTP 200
  - https://tiktakpet.co.il/wp-content/uploads/2025/12/%D7%A1%D7%A0%D7%93%D7%95%D7%95%D7%99%D7%A5-%D7%91%D7%A8%D7%95%D7%95.jpg
  - `1ad23aa8-bde6-42cf-ad13-6ca3c2b2e59c` דיימונדס חטיף סנדוויץ היפואלרגני ברווז לכלב 80 גרם (in stock, main)

- `ok`, HTTP 200
  - https://tiktakpet.co.il/wp-content/uploads/2025/12/%D7%A2%D7%A6%D7%9D-%D7%99%D7%90%D7%A7-%D7%A9%D7%9E%D7%99%D7%A8.jpg
  - `ddcf8f5e-2c2c-4cd7-84b4-56c48e13c18d` חטיף עצם יאק שמיר במגוון גדלים (in stock, main)

- `ok`, HTTP 200
  - https://tiktakpet.co.il/wp-content/uploads/2025/12/%D7%A2%D7%A6%D7%9D-%D7%A7%D7%A9%D7%90.jpg
  - `7d2da1a7-c5dc-4956-9876-984b75eb4457` חטיף צ'רליז עצם קשר בקר עם בשר ברווז 500 גרם (in stock, main)

- `ok`, HTTP 200
  - https://tiktakpet.co.il/wp-content/uploads/2025/12/%D7%A8%D7%A6%D7%95%D7%A2%D7%95%D7%AA-%D7%A2%D7%95%D7%A3-%D7%95%D7%91%D7%A7%D7%A8-1.jpg
  - `7d2da1a7-c5dc-4956-9876-984b75eb4457` חטיף צ'רליז עצם קשר בקר עם בשר ברווז 500 גרם (in stock, gallery)
  - `55d30fbe-0902-4578-b53b-a2971484509f` חטיף צ'רליז דונאט בקר עטוף בשר ברווז 500 גרם (in stock, gallery)

- `ok`, HTTP 200
  - https://tiktakpet.co.il/wp-content/uploads/2025/12/42a2a9ae2031f15586d80e25e76c6f35.jpg
  - `7d2da1a7-c5dc-4956-9876-984b75eb4457` חטיף צ'רליז עצם קשר בקר עם בשר ברווז 500 גרם (in stock, gallery)
  - `55d30fbe-0902-4578-b53b-a2971484509f` חטיף צ'רליז דונאט בקר עטוף בשר ברווז 500 גרם (in stock, gallery)

- `ok`, HTTP 200
  - https://tiktakpet.co.il/wp-content/uploads/2025/12/79f1f83791d9d40f4f4cdc840cd05054.jpg
  - `55d30fbe-0902-4578-b53b-a2971484509f` חטיף צ'רליז דונאט בקר עטוף בשר ברווז 500 גרם (in stock, gallery)

- `ok`, HTTP 200
  - https://tiktakpet.co.il/wp-content/uploads/2025/12/7a150de3bc924910aa3a01b4fd31160b.png
  - `7d2da1a7-c5dc-4956-9876-984b75eb4457` חטיף צ'רליז עצם קשר בקר עם בשר ברווז 500 גרם (in stock, gallery)

- `ok`, HTTP 200
  - https://tiktakpet.co.il/wp-content/uploads/2025/12/862e000f21dd3ec85bda636cda7beb73.png
  - `7d2da1a7-c5dc-4956-9876-984b75eb4457` חטיף צ'רליז עצם קשר בקר עם בשר ברווז 500 גרם (in stock, gallery)

- `ok`, HTTP 200
  - https://tiktakpet.co.il/wp-content/uploads/2025/12/PGY1_1_1000x1000.jpg
  - `7d2da1a7-c5dc-4956-9876-984b75eb4457` חטיף צ'רליז עצם קשר בקר עם בשר ברווז 500 גרם (in stock, gallery)

- `ok`, HTTP 200
  - https://tiktakpet.co.il/wp-content/uploads/2025/12/a22b0be3d49eda641e6c0dbe851642d5.jpg
  - `55d30fbe-0902-4578-b53b-a2971484509f` חטיף צ'רליז דונאט בקר עטוף בשר ברווז 500 גרם (in stock, gallery)

- `ok`, HTTP 200
  - https://tiktakpet.co.il/wp-content/uploads/2025/12/a8138957fea6442fb45a58090ada033b.jpg
  - `55d30fbe-0902-4578-b53b-a2971484509f` חטיף צ'רליז דונאט בקר עטוף בשר ברווז 500 גרם (in stock, gallery)

- `ok`, HTTP 200
  - https://tiktakpet.co.il/wp-content/uploads/2025/12/d596147aad84f25389c080bd35fa72e8.jpg
  - `7d2da1a7-c5dc-4956-9876-984b75eb4457` חטיף צ'רליז עצם קשר בקר עם בשר ברווז 500 גרם (in stock, gallery)
  - `55d30fbe-0902-4578-b53b-a2971484509f` חטיף צ'רליז דונאט בקר עטוף בשר ברווז 500 גרם (in stock, gallery)

### www.all4pet.co.il

- `ok`, HTTP 200
  - https://www.all4pet.co.il/images/itempics/35585454030_31102023105204.jpg
  - `4771bca7-6bb2-4cb9-a665-1d783f942269` Kong קונג בובת אייל עם חבל לכלב גדול L (in stock, gallery)

- `ok`, HTTP 200
  - https://www.all4pet.co.il/images/itempics/35585454030_31102023105207.jpg
  - `4771bca7-6bb2-4cb9-a665-1d783f942269` Kong קונג בובת אייל עם חבל לכלב גדול L (in stock, main)

### www.animalshop.co.il

- `ok`, HTTP 200
  - https://www.animalshop.co.il/images/itempics/549.jpg
  - `3184d8bd-8589-4039-be53-fff685299fbe` קונג KONG קלאסיק אדום גדלים שונים - ₪35.00 (in stock, main)
