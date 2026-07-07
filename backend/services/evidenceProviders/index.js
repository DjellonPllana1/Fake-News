import { localTrustedCorpusProvider } from "./localTrustedCorpusProvider.js";

const providerRegistry = {
  [localTrustedCorpusProvider.id]: localTrustedCorpusProvider,
};

export function getEvidenceProviders() {
  const configuredIds = String(process.env.EVIDENCE_PROVIDERS || "local_trusted_corpus")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  return configuredIds.map((id) => providerRegistry[id]).filter(Boolean);
}
