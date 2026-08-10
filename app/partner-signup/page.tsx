import { PartnerSignupForm } from '@/app/components/partner/PartnerSignupForm';

export const metadata = {
  title: 'פתח חנות Your Sofer | Partner Program',
  description: 'בואו תפתחו חנות אונליין משלכם עם Your Sofer Partner Program',
};

export default function PartnerSignupPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      {/* Hero Section */}
      <section className="max-w-6xl mx-auto px-4 py-16 text-center">
        <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
          🏪 פתח חנות אונליין משלך
        </h1>
        <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
          הצטרף ל-Your Sofer Partner Program וקבל גישה למערכת מלאה לניהול חנות עם מוצרים בטוח ומאושרים
        </p>
      </section>

      {/* Benefits Section */}
      <section className="bg-white py-16">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
            ✨ מה אתה מקבל?
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                icon: '📦',
                title: 'קטלוג מלא',
                desc: 'גישה לחצי הקטלוג שלנו - אלפי מוצרי סת"ם ויודאיקה מאושרים',
              },
              {
                icon: '🛒',
                title: 'חנות אונליין',
                desc: 'חנות עיצובית ומותגת משלך עם שם דומיין ייחודי',
              },
              {
                icon: '💳',
                title: 'מערכת תשלומים',
                desc: 'עיבוד תשלומים בטוח וגביית מזומנים עד הבית שלך',
              },
              {
                icon: '📊',
                title: 'אנליטיקה עמוקה',
                desc: 'דוחות מפורטים על מכירות, מבקרים, וביצועים',
              },
              {
                icon: '🚚',
                title: 'לוגיסטיקה',
                desc: 'יצור משלוחות אוטומטי וניהול הזמנות ממשי',
              },
              {
                icon: '💰',
                title: '20% עמלה',
                desc: 'קבל 20% מכל מכירה + עמלה נוספת לקטגוריות מסוימות',
              },
            ].map((benefit, idx) => (
              <div
                key={idx}
                className="p-6 border border-gray-200 rounded-lg hover:shadow-lg transition-shadow"
              >
                <div className="text-4xl mb-4">{benefit.icon}</div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">
                  {benefit.title}
                </h3>
                <p className="text-gray-600">{benefit.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-16">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
            💰 מחיר פשוט וברור
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="p-8 bg-gray-50 rounded-lg border border-gray-200">
              <div className="text-5xl font-bold text-green-600 mb-2">₪5,000</div>
              <p className="text-gray-600 mb-6">דמי הקמה חד-פעמיים</p>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>✅ יצירת חנות</li>
                <li>✅ עיצוב מותג</li>
                <li>✅ חודש ראשון חינם</li>
              </ul>
            </div>

            <div className="p-8 bg-blue-50 rounded-lg border-2 border-blue-600 md:scale-105">
              <div className="text-5xl font-bold text-blue-600 mb-2">₪400</div>
              <p className="text-gray-600 mb-6">לחודש</p>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>✅ תשתית מלאה</li>
                <li>✅ אנליטיקה</li>
                <li>✅ תמיכה 24/7</li>
              </ul>
            </div>

            <div className="p-8 bg-gray-50 rounded-lg border border-gray-200">
              <div className="text-5xl font-bold text-green-600 mb-2">20%</div>
              <p className="text-gray-600 mb-6">עמלה מהמכירות</p>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>✅ תשלום אוטומטי</li>
                <li>✅ דוחות שקופים</li>
                <li>✅ משיכת כספים קלה</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Signup Form Section */}
      <section className="max-w-2xl mx-auto px-4 py-16">
        <PartnerSignupForm />
      </section>

      {/* FAQ Section */}
      <section className="bg-gray-50 py-16">
        <div className="max-w-4xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
            ❓ שאלות נפוצות
          </h2>

          <div className="space-y-6">
            {[
              {
                q: 'כמה זמן לוקח להפעיל חנות?',
                a: 'בדרך כלל 30 דקות. אחרי התשלום אנחנו מעמידים את החנות שלך בחיים תוך דקות.',
              },
              {
                q: 'אני צריך לדאוג לממלאי?',
                a: 'לא! אנחנו מטפלים בכל הלוגיסטיקה והמלאי. אתה רק משווק ומקבל עמלות.',
              },
              {
                q: 'איך משלמים לי את ההכנסות?',
                a: 'הוצאות משכנתא או העברה בנקאית פעם לחודש לחשבון הבנק שלך.',
              },
              {
                q: 'אפשר לשנות את המחיר של המוצרים?',
                a: 'לא - המחירים קבועים ממערכתנו. אתה מקבל 20% עמלה מהמחיר הנקוב.',
              },
            ].map((faq, idx) => (
              <div key={idx} className="p-6 bg-white rounded-lg border border-gray-200">
                <h3 className="font-bold text-gray-900 mb-2">{faq.q}</h3>
                <p className="text-gray-600">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 text-center">
        <div className="max-w-2xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-gray-900 mb-6">
            בואו נתחיל! 🚀
          </h2>
          <p className="text-lg text-gray-600 mb-8">
            השלם את הטופס למעלה וחדוד כל דבר בתוך דקות
          </p>
        </div>
      </section>
    </div>
  );
}
