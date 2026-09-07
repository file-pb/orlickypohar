// Liveness pro kontrakt platformy. Že Next odpoví, znamená, že běží
// a umí obsloužit požadavek — víc se od liveness nechce.
export const dynamic = "force-dynamic";

export function GET() {
  return new Response("Healthy", { headers: { "content-type": "text/plain" } });
}
