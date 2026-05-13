import type { Metadata } from 'next';
import ReviewsClient from './ReviewsClient';

export const metadata: Metadata = {
  title: 'ביקורות לקוחות | Your Sofer',
  description: 'אלפי לקוחות מרוצים ברחבי הארץ — קראו מה הם אומרים על Your Sofer',
};

export default function ReviewsPage() {
  return <ReviewsClient />;
}
