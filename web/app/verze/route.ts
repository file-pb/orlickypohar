// Z jakého commitu tenhle web běží. Nasazení si tím po sobě ověří, že na
// serveru opravdu visí to, co posílalo — `Healthy` a HTTP 200 vrací i verze,
// která tam zůstala z minula, takže samy o sobě nic nedokazují.
export const dynamic = "force-dynamic";

export function GET() {
  return Response.json({ verze: process.env.VERZE ?? "neznama" });
}
