// @/components/document/NamespaceView.tsx

// Namespace
import NamespaceViewList from "./NamespaceViewList";
import type { Namespace } from "@/lib/docs/docs";
// Document Components
import DocumentTitle from "@/components/document/DocumentTitle";
import DocumentNotFound from "@/components/document/DocumentNotFound";
// Sid Utilities
import { sortSids } from "@/lib/docs/sid";

type Props = { namespace: Namespace | null; sid: string };

export default async function NamespaceView({ namespace, sid }: Props) {
  if (!namespace) {
    return (
      <article className="documentview-container">
        <DocumentTitle sid={sid} />
        <DocumentNotFound sid={sid} />
      </article>
    );
  }

  const items = sortSids(namespace.refs ?? []);
  return (
    <article className="documentview-container">
      <DocumentTitle sid={sid} />
      <NamespaceViewList sid={sid} items={items} />
    </article>
  );
}
