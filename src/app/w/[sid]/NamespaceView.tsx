// @/components/document/NamespaceView.tsx
import DocumentTitle from "@/components/document/DocumentTitle";
import DocumentNotFound from "@/components/document/DocumentNotFound";
import NamespaceViewList from "./NamespaceViewList";
import type { Namespace } from "@/lib/docs/docs";

type Props = {
  namespace: Namespace | null;
  sid: string;
  currentPage?: number;
  pageSize?: number;
};

const DOC_ORDER = ["namespace", "article", "group", "user", "acl"] as const;
type DocType = (typeof DOC_ORDER)[number];
const docTypeOf = (sid: string) => (sid.split(":")[0] as DocType);
const displayOf = (sid: string) => (sid.startsWith("article:") ? sid.slice(8) : sid);

const sortSids = (sids: string[]) => {
  return [...sids].sort((a, b) => {
    const ia = DOC_ORDER.indexOf(docTypeOf(a));
    const ib = DOC_ORDER.indexOf(docTypeOf(b));
    if (ia !== ib) return ia - ib;
    const da = displayOf(a).toLocaleLowerCase();
    const db = displayOf(b).toLocaleLowerCase();
    if (da < db) return -1; if (da > db) return 1; return 0;
  });
};

export default async function NamespaceView({
  namespace, sid, currentPage = 1, pageSize = 144,
}: Props) {
  if (!namespace) {
    return (
      <article className="article">
        <DocumentTitle sid={sid}/>
        <DocumentNotFound sid={sid}/>
      </article>
    );
  }

  const items = sortSids(namespace.documents ?? []);
  return (
    <article className="article">
      <DocumentTitle sid={sid}/>
      <NamespaceViewList
        sid={sid}
        items={items}
        currentPage={currentPage}
        pageSize={pageSize}
      />
    </article>
  );
}
