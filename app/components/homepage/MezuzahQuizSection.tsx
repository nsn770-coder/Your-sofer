'use client';

import MezuzahFunnel from '@/app/components/MezuzahFunnel';

interface Props {
  isMobile: boolean;
}

export default function MezuzahQuizSection({ isMobile }: Props) {
  return (
    <div id="mezuzah-quiz">
      <MezuzahFunnel isMobile={isMobile} />
    </div>
  );
}
