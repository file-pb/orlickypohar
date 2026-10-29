/**
 * <b>Ve správě se pás partnerů nezobrazuje</b> (Filip, 29. 10. 2026). Správa
 * je pracovní nástroj, ne výkladní skříň, a pevný pruh u spodku okna ubírá
 * místo právě tam, kde se ve formulářích potvrzuje.
 *
 * Vypíná se kotvou a CSS, ne podmínkou v layoutu: pás visí v kořenovém
 * layoutu, ten dědí každá stránka a <b>cestu nezná</b> — Next ji
 * kořenovému layoutu nepředává. Obalit obsah do `div` taky nejde, míra
 * řádku v `globals.css` míří na přímé potomky `main.obal`.
 *
 * Kotva je prázdný `hidden` prvek, aby do stránky nic nepřidala; pás i
 * odsazení stránky na ni sahají přes `body:has(.bez-partneru)`.
 */
export default function LayoutSpravy({ children }: { children: React.ReactNode }) {
  return (
    <>
      <span className="bez-partneru" hidden />
      {children}
    </>
  );
}
