import { RelationshipList } from "@/components/RelationshipList";

export default function RelationshipsPage() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold">All Relationships</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Browse relationships across all clients. Use a client's profile to add or manage their relationships.
      </p>
      <div className="mt-6">
        <RelationshipList />
      </div>
    </div>
  );
}
