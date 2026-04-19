import { initPlasmicLoader } from "@plasmicapp/loader-nextjs";
export const PLASMIC = initPlasmicLoader({
  projects: [
    {
      id: "1MY7Lf3sRSeD5yCCjioY9A",  // ID of a project you are using
      token: "fmdLnFvZpXshw2hb6WXTHtmYy8LVPjlEy2bWbBgReRraoVkzoAfzsRCuE06M4CsS2edQ3fAKy2N1ajif4wrA"  // API token for that project
    }
  ],
  // Fetches the latest revisions, whether or not they were unpublished!
  // Disable for production to ensure you render only published changes.
  preview: true,
})