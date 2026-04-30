import { useParams } from "react-router-dom";

export default function ClientProfilePage() {
  const { id } = useParams<{ id: string }>();

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold">Client Profile: {id}</h1>
      <p className="mt-2 text-gray-600">Placeholder: under construction</p>
    </div>
  );
}
