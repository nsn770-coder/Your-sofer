import { PlasmicComponent, PlasmicRootProvider } from '@plasmicapp/loader-nextjs';
import { PLASMIC } from '../lib/plasmic-init';

export default async function PlasmicTestPage() {
  const plasmicData = await PLASMIC.fetchComponentData('HomepageHero');

  return (
    <PlasmicRootProvider loader={PLASMIC} prefetchedData={plasmicData}>
      <PlasmicComponent component="HomepageHero" />
    </PlasmicRootProvider>
  );
}