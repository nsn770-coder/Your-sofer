/**
 * Public configuration endpoint
 * Returns Sumit payment configuration for client-side usage
 */

export const dynamic = 'force-dynamic';

export async function GET() {
  return Response.json(
    {
      sumit: {
        companyId: process.env.SUMIT_COMPANY_ID || process.env.NEXT_PUBLIC_SUMIT_COMPANY_ID,
        publicKey: process.env.NEXT_PUBLIC_SUMIT_API_PUBLIC_KEY,
      },
    },
    {
      headers: {
        'Cache-Control': 'no-store, max-age=0',
      },
    }
  );
}
