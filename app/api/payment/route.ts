import { NextRequest, NextResponse } from 'next/server';

const SUMIT_API_URL = 'https://api.sumit.co.il/billing/payments/beginredirect/';
const SUMIT_COMPANY_ID = process.env.SUMIT_COMPANY_ID!;
const SUMIT_API_KEY = process.env.SUMIT_API_KEY!;

export async function POST(req: NextRequest) {
  try {
    const { items, total, customer, orderNumber, orderId, baseUrl } = await req.json();

    const body = {
      Customer: {
        Name: customer.name,
        EmailAddress: customer.email,
        Phone: customer.phone,
        SearchMode: 0,
      },
      Items: items.map((item: { name: string; price: number; quantity: number }) => ({
        Item: {
          Name: item.name,
          Price: item.price,
        },
        Quantity: item.quantity,
        UnitPrice: item.price,
      })),
      VATIncluded: true,
      RedirectURL: `${baseUrl}/thank-you?order=${orderNumber}&orderId=${orderId}`,
      CancelRedirectURL: `${baseUrl}/checkout?error=payment_cancelled`,
      ExternalIdentifier: orderNumber,
      Credentials: {
        CompanyID: parseInt(SUMIT_COMPANY_ID),
        APIKey: SUMIT_API_KEY,
      },
    };

    const response = await fetch(SUMIT_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    if (data?.Data?.URL) {
      return NextResponse.json({ url: data.Data.URL });
    } else {
      console.error('Sumit error:', JSON.stringify(data));
      return NextResponse.json({ error: 'שגיאה בקבלת דף תשלום' }, { status: 500 });
    }
  } catch (e) {
    console.error('Payment route error:', e);
    return NextResponse.json({ error: 'שגיאה פנימית' }, { status: 500 });
  }
}
