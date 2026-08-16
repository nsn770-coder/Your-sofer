// ─────────────────────────────────────────────────────────────────────────────
// i18n — קטלוג מחרוזות הממשק
// שלב 1: ניווט, פעולות נפוצות, עגלה ועמוד הנחיתה הבינלאומי.
// כל מפתח חייב להופיע בכל שש השפות — TypeScript אוכף את זה דרך Dict.
// ─────────────────────────────────────────────────────────────────────────────

export const he = {
  // ניווט
  'nav.home': 'דף הבית',
  'nav.catalog': 'כל המוצרים',
  'nav.kippot': 'כיפות',
  'nav.eventKippot': 'כיפות ומזכרות לאירועים',
  'nav.tefillin': 'תפילין',
  'nav.mezuzah': 'בתי מזוזה',
  'nav.talit': 'טליתות',
  'nav.books': 'ספרי קודש וברכונים',
  'nav.gifts': 'מתנות',
  'nav.about': 'אודות',
  'nav.contact': 'צור קשר',
  'nav.account': 'החשבון שלי',
  'nav.search': 'חיפוש',

  // פעולות
  'action.addToCart': 'הוספה לסל',
  'action.buyNow': 'קנייה מיידית',
  'action.checkout': 'המשך לתשלום',
  'action.continueShopping': 'המשך בקנייה',
  'action.viewProduct': 'לפרטי המוצר',
  'action.close': 'סגירה',
  'action.back': 'חזרה',
  'action.more': 'עוד',

  // עגלה
  'cart.title': 'סל הקניות',
  'cart.empty': 'הסל שלכם ריק',
  'cart.items': 'פריטים',
  'cart.subtotal': 'סכום ביניים',
  'cart.shipping': 'משלוח',
  'cart.total': 'סה"כ לתשלום',
  'cart.freeShipping': 'משלוח חינם',

  // בורר השפה
  'lang.label': 'שפה',
  'lang.choose': 'בחירת שפה',

  // עמוד נחיתה בינלאומי
  'intl.heroTitle': 'יודאיקה מהודרת מישראל',
  'intl.heroSub': 'סת"ם, תשמישי קדושה, כיפות בהדפסה אישית ומתנות — ישירות מסופרים מוסמכים בישראל, במשלוח לכל העולם.',
  'intl.cta': 'לצפייה בקטלוג',
  'intl.browseHebrew': 'הקטלוג המלא (עברית)',
  'intl.trust1Title': 'סופרים מוסמכים',
  'intl.trust1Body': 'כל פריט סת"ם נכתב ונבדק ע"י סופרים מוסמכים עם תעודת כשרות.',
  'intl.trust2Title': 'משלוח עולמי',
  'intl.trust2Body': 'משלוח מעקב לכל יעד בעולם, עם אריזה מוגנת לפריטי קודש.',
  'intl.trust3Title': 'התאמה אישית',
  'intl.trust3Body': 'כיפות, ברכונים ומתנות עם שם, תאריך ולוגו — עם הדמיה לפני ההזמנה.',
  'intl.partialNotice': 'הקטלוג המלא זמין כרגע בעברית. תיאורי המוצרים באנגלית בדרך.',
  'intl.contactUs': 'שאלה לפני הזמנה? דברו איתנו',
} as const;

export type DictKey = keyof typeof he;
export type Dict = Record<DictKey, string>;

export const en: Dict = {
  'nav.home': 'Home',
  'nav.catalog': 'All products',
  'nav.kippot': 'Kippot',
  'nav.eventKippot': 'Event kippot & favors',
  'nav.tefillin': 'Tefillin',
  'nav.mezuzah': 'Mezuzah cases',
  'nav.talit': 'Tallitot',
  'nav.books': 'Books & benchers',
  'nav.gifts': 'Gifts',
  'nav.about': 'About',
  'nav.contact': 'Contact',
  'nav.account': 'My account',
  'nav.search': 'Search',

  'action.addToCart': 'Add to cart',
  'action.buyNow': 'Buy now',
  'action.checkout': 'Checkout',
  'action.continueShopping': 'Continue shopping',
  'action.viewProduct': 'View product',
  'action.close': 'Close',
  'action.back': 'Back',
  'action.more': 'More',

  'cart.title': 'Shopping cart',
  'cart.empty': 'Your cart is empty',
  'cart.items': 'items',
  'cart.subtotal': 'Subtotal',
  'cart.shipping': 'Shipping',
  'cart.total': 'Total',
  'cart.freeShipping': 'Free shipping',

  'lang.label': 'Language',
  'lang.choose': 'Choose language',

  'intl.heroTitle': 'Fine Judaica from Israel',
  'intl.heroSub': 'STaM, ritual items, custom-printed kippot and gifts — straight from certified scribes in Israel, shipped worldwide.',
  'intl.cta': 'Browse the catalog',
  'intl.browseHebrew': 'Full catalog (Hebrew)',
  'intl.trust1Title': 'Certified scribes',
  'intl.trust1Body': 'Every STaM item is written and inspected by certified sofrim with a kashrut certificate.',
  'intl.trust2Title': 'Worldwide shipping',
  'intl.trust2Body': 'Tracked shipping to any destination, with protective packaging for sacred items.',
  'intl.trust3Title': 'Personalization',
  'intl.trust3Body': 'Kippot, benchers and gifts with a name, date or logo — with a preview before you order.',
  'intl.partialNotice': 'The full catalog is currently in Hebrew. English product descriptions are on the way.',
  'intl.contactUs': 'Questions before ordering? Talk to us',
};

export const fr: Dict = {
  'nav.home': 'Accueil',
  'nav.catalog': 'Tous les produits',
  'nav.kippot': 'Kippot',
  'nav.eventKippot': 'Kippot et cadeaux d’événement',
  'nav.tefillin': 'Tefillin',
  'nav.mezuzah': 'Étuis de mezouza',
  'nav.talit': 'Talitot',
  'nav.books': 'Livres et birkonim',
  'nav.gifts': 'Cadeaux',
  'nav.about': 'À propos',
  'nav.contact': 'Contact',
  'nav.account': 'Mon compte',
  'nav.search': 'Rechercher',

  'action.addToCart': 'Ajouter au panier',
  'action.buyNow': 'Acheter maintenant',
  'action.checkout': 'Commander',
  'action.continueShopping': 'Continuer mes achats',
  'action.viewProduct': 'Voir le produit',
  'action.close': 'Fermer',
  'action.back': 'Retour',
  'action.more': 'Plus',

  'cart.title': 'Panier',
  'cart.empty': 'Votre panier est vide',
  'cart.items': 'articles',
  'cart.subtotal': 'Sous-total',
  'cart.shipping': 'Livraison',
  'cart.total': 'Total',
  'cart.freeShipping': 'Livraison offerte',

  'lang.label': 'Langue',
  'lang.choose': 'Choisir la langue',

  'intl.heroTitle': 'Judaïca d’exception depuis Israël',
  'intl.heroSub': 'STaM, objets de culte, kippot personnalisées et cadeaux — directement de scribes certifiés en Israël, livrés dans le monde entier.',
  'intl.cta': 'Voir le catalogue',
  'intl.browseHebrew': 'Catalogue complet (hébreu)',
  'intl.trust1Title': 'Scribes certifiés',
  'intl.trust1Body': 'Chaque article STaM est écrit et vérifié par des sofrim certifiés avec certificat de cacherout.',
  'intl.trust2Title': 'Livraison mondiale',
  'intl.trust2Body': 'Livraison suivie vers toute destination, avec emballage protecteur pour les objets sacrés.',
  'intl.trust3Title': 'Personnalisation',
  'intl.trust3Body': 'Kippot, birkonim et cadeaux avec nom, date ou logo — avec aperçu avant commande.',
  'intl.partialNotice': 'Le catalogue complet est actuellement en hébreu. Les descriptions en français arrivent bientôt.',
  'intl.contactUs': 'Une question avant de commander ? Écrivez-nous',
};

export const es: Dict = {
  'nav.home': 'Inicio',
  'nav.catalog': 'Todos los productos',
  'nav.kippot': 'Kipot',
  'nav.eventKippot': 'Kipot y recuerdos para eventos',
  'nav.tefillin': 'Tefilín',
  'nav.mezuzah': 'Estuches de mezuzá',
  'nav.talit': 'Talitot',
  'nav.books': 'Libros y bircones',
  'nav.gifts': 'Regalos',
  'nav.about': 'Acerca de',
  'nav.contact': 'Contacto',
  'nav.account': 'Mi cuenta',
  'nav.search': 'Buscar',

  'action.addToCart': 'Añadir al carrito',
  'action.buyNow': 'Comprar ahora',
  'action.checkout': 'Finalizar compra',
  'action.continueShopping': 'Seguir comprando',
  'action.viewProduct': 'Ver producto',
  'action.close': 'Cerrar',
  'action.back': 'Volver',
  'action.more': 'Más',

  'cart.title': 'Carrito',
  'cart.empty': 'Tu carrito está vacío',
  'cart.items': 'artículos',
  'cart.subtotal': 'Subtotal',
  'cart.shipping': 'Envío',
  'cart.total': 'Total',
  'cart.freeShipping': 'Envío gratis',

  'lang.label': 'Idioma',
  'lang.choose': 'Elegir idioma',

  'intl.heroTitle': 'Judaica selecta desde Israel',
  'intl.heroSub': 'STaM, objetos rituales, kipot personalizadas y regalos — directamente de escribas certificados en Israel, con envío a todo el mundo.',
  'intl.cta': 'Ver el catálogo',
  'intl.browseHebrew': 'Catálogo completo (hebreo)',
  'intl.trust1Title': 'Escribas certificados',
  'intl.trust1Body': 'Cada artículo de STaM está escrito y revisado por sofrim certificados con certificado de cashrut.',
  'intl.trust2Title': 'Envío mundial',
  'intl.trust2Body': 'Envío con seguimiento a cualquier destino, con embalaje protector para objetos sagrados.',
  'intl.trust3Title': 'Personalización',
  'intl.trust3Body': 'Kipot, bircones y regalos con nombre, fecha o logotipo — con vista previa antes de pedir.',
  'intl.partialNotice': 'El catálogo completo está actualmente en hebreo. Las descripciones en español llegarán pronto.',
  'intl.contactUs': '¿Dudas antes de comprar? Escríbenos',
};

export const ar: Dict = {
  'nav.home': 'الصفحة الرئيسية',
  'nav.catalog': 'جميع المنتجات',
  'nav.kippot': 'قلنسوات',
  'nav.eventKippot': 'قلنسوات وهدايا المناسبات',
  'nav.tefillin': 'تفيلين',
  'nav.mezuzah': 'علب مزوزة',
  'nav.talit': 'شيلان صلاة',
  'nav.books': 'كتب وأدعية',
  'nav.gifts': 'هدايا',
  'nav.about': 'من نحن',
  'nav.contact': 'اتصل بنا',
  'nav.account': 'حسابي',
  'nav.search': 'بحث',

  'action.addToCart': 'أضف إلى السلة',
  'action.buyNow': 'اشترِ الآن',
  'action.checkout': 'إتمام الشراء',
  'action.continueShopping': 'متابعة التسوق',
  'action.viewProduct': 'عرض المنتج',
  'action.close': 'إغلاق',
  'action.back': 'رجوع',
  'action.more': 'المزيد',

  'cart.title': 'سلة التسوق',
  'cart.empty': 'سلتك فارغة',
  'cart.items': 'عناصر',
  'cart.subtotal': 'المجموع الفرعي',
  'cart.shipping': 'الشحن',
  'cart.total': 'الإجمالي',
  'cart.freeShipping': 'شحن مجاني',

  'lang.label': 'اللغة',
  'lang.choose': 'اختر اللغة',

  'intl.heroTitle': 'يهودية فاخرة من إسرائيل',
  'intl.heroSub': 'مخطوطات مقدسة وأدوات طقسية وقلنسوات مطبوعة حسب الطلب وهدايا — مباشرة من كتبة معتمدين في إسرائيل، مع شحن عالمي.',
  'intl.cta': 'تصفح الكتالوج',
  'intl.browseHebrew': 'الكتالوج الكامل (بالعبرية)',
  'intl.trust1Title': 'كتبة معتمدون',
  'intl.trust1Body': 'كل قطعة تُكتب وتُفحص على يد كتبة معتمدين مع شهادة كشروت.',
  'intl.trust2Title': 'شحن عالمي',
  'intl.trust2Body': 'شحن مع تتبع إلى أي وجهة، مع تغليف واقٍ للقطع المقدسة.',
  'intl.trust3Title': 'تخصيص شخصي',
  'intl.trust3Body': 'قلنسوات وكتب وهدايا مع اسم أو تاريخ أو شعار — مع معاينة قبل الطلب.',
  'intl.partialNotice': 'الكتالوج الكامل متاح حاليًا بالعبرية. الأوصاف بالعربية قادمة قريبًا.',
  'intl.contactUs': 'لديك سؤال قبل الطلب؟ تواصل معنا',
};

export const ru: Dict = {
  'nav.home': 'Главная',
  'nav.catalog': 'Все товары',
  'nav.kippot': 'Кипы',
  'nav.eventKippot': 'Кипы и подарки для торжеств',
  'nav.tefillin': 'Тфилин',
  'nav.mezuzah': 'Футляры для мезузы',
  'nav.talit': 'Талиты',
  'nav.books': 'Книги и бирконы',
  'nav.gifts': 'Подарки',
  'nav.about': 'О нас',
  'nav.contact': 'Контакты',
  'nav.account': 'Мой аккаунт',
  'nav.search': 'Поиск',

  'action.addToCart': 'В корзину',
  'action.buyNow': 'Купить сейчас',
  'action.checkout': 'Оформить заказ',
  'action.continueShopping': 'Продолжить покупки',
  'action.viewProduct': 'Подробнее',
  'action.close': 'Закрыть',
  'action.back': 'Назад',
  'action.more': 'Ещё',

  'cart.title': 'Корзина',
  'cart.empty': 'Ваша корзина пуста',
  'cart.items': 'товаров',
  'cart.subtotal': 'Промежуточный итог',
  'cart.shipping': 'Доставка',
  'cart.total': 'Итого',
  'cart.freeShipping': 'Бесплатная доставка',

  'lang.label': 'Язык',
  'lang.choose': 'Выбрать язык',

  'intl.heroTitle': 'Изысканная иудаика из Израиля',
  'intl.heroSub': 'СТаМ, ритуальные предметы, кипы с персональной печатью и подарки — напрямую от сертифицированных соферов в Израиле, с доставкой по всему миру.',
  'intl.cta': 'Смотреть каталог',
  'intl.browseHebrew': 'Полный каталог (иврит)',
  'intl.trust1Title': 'Сертифицированные соферы',
  'intl.trust1Body': 'Каждое изделие СТаМ написано и проверено сертифицированными соферами с сертификатом кашрута.',
  'intl.trust2Title': 'Доставка по всему миру',
  'intl.trust2Body': 'Отслеживаемая доставка в любую точку мира, с защитной упаковкой для священных предметов.',
  'intl.trust3Title': 'Персонализация',
  'intl.trust3Body': 'Кипы, бирконы и подарки с именем, датой или логотипом — с предпросмотром до заказа.',
  'intl.partialNotice': 'Полный каталог сейчас доступен на иврите. Описания на русском языке скоро появятся.',
  'intl.contactUs': 'Есть вопрос перед заказом? Напишите нам',
};

export const DICTIONARIES: Record<string, Dict> = { he, en, fr, es, ar, ru };

export function getDictionary(locale: string): Dict {
  return DICTIONARIES[locale] ?? he;
}

/** תרגום מפתח בודד — נופל לעברית כשהשפה או המפתח חסרים */
export function translate(locale: string, key: DictKey): string {
  return getDictionary(locale)[key] ?? he[key] ?? key;
}
