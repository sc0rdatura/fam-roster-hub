import { supabase } from "./lib/supabase";

console.log("Supabase client initialised:", !!supabase);

function App() {
  return <h1 className="text-3xl font-bold p-8">FAM Roster Hub</h1>;
}

export default App;
