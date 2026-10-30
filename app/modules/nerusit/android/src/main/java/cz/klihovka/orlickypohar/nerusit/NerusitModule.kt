package cz.klihovka.orlickypohar.nerusit

import android.app.NotificationManager
import android.content.Context
import android.content.Intent
import android.provider.Settings
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/**
 * Režim Nerušit na dobu startovní procedury — jen Android.
 *
 * Filip, 29. 10. 2026: "to by bylo dobrý, kdyby se to uprostřed startovní
 * procedury přeplo do nerušit a tím na chvíli krylo Milošovi nervy."
 * Hovor uprostřed procedury "udělá z Miloše blbce před celým soutěžním
 * polem", a je to ten jediný ze čtyř následků hovoru, který appka
 * doopravdy odstraní.
 *
 * iPhone to nedovolí (Focus je systémové nastavení), a proto tenhle modul
 * iOS část vůbec nemá: na iPhonu si automatizaci nastaví uživatel ve
 * Zkratkách. Miloš má Android, takže rozdíl dopadá přesně na toho člověka,
 * o kterého jde.
 *
 * Dvě pojistky, které se snadno zapomenou a bez kterých by to bylo horší
 * než nic:
 *
 *  1. Režim se musí vrátit — i když appka mezitím spadne. Předchozí
 *     nastavení se proto ukládá do pamětí a vrací se při každém vytvoření
 *     modulu, tedy i po pádu nebo po vypnutí appky uprostřed procedury.
 *  2. Bez oprávnění se procedura nesmí zastavit. Všechno tady vrací
 *     false, nic nevyhazuje.
 */
private const val PAMET = "nerusit"
private const val KLIC_PREDCHOZI = "predchoziFiltr"

class NerusitModule : Module() {
  private val kontext: Context
    get() = appContext.reactContext ?: throw Exceptions.ReactContextLost()

  private val spravce: NotificationManager
    get() = kontext.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

  private val pamet
    get() = kontext.getSharedPreferences(PAMET, Context.MODE_PRIVATE)

  override fun definition() = ModuleDefinition {
    Name("Nerusit")

    // Appka se zapíná: zůstal po minulém běhu zapnutý klid? Pak ho vrátit.
    // Tohle je ta pojistka proti pádu uprostřed procedury.
    OnCreate {
      vrat()
    }

    // Smí appka režim telefonu měnit? Uživatel to povoluje jednou,
    // v nastavení systému.
    Function("smime") {
      try {
        spravce.isNotificationPolicyAccessGranted
      } catch (e: Throwable) {
        false
      }
    }

    // Otevře to místo v nastavení, kde se oprávnění dává. Víc appka
    // udělat nemůže — povolit to za uživatele nesmí nikdo.
    AsyncFunction("otevriNastaveni") {
      val zamer = Intent(Settings.ACTION_NOTIFICATION_POLICY_ACCESS_SETTINGS)
      zamer.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      kontext.startActivity(zamer)
    }

    /**
     * Zapne nebo vypne klid. Vrací, jestli se to povedlo.
     *
     * Zapíná se "Nerušit s prioritou", ne úplné ticho: úplné ticho vypne
     * i budík, a o tom, co je pro rozhodčího naléhavé, aplikace rozhodovat
     * nemá.
     */
    AsyncFunction("nastav") { klid: Boolean ->
      try {
        if (!spravce.isNotificationPolicyAccessGranted) {
          false
        } else {
          if (klid) {
            if (!pamet.contains(KLIC_PREDCHOZI)) {
              pamet.edit().putInt(KLIC_PREDCHOZI, spravce.currentInterruptionFilter).apply()
            }
            spravce.setInterruptionFilter(NotificationManager.INTERRUPTION_FILTER_PRIORITY)
          } else {
            vrat()
          }
          true
        }
      } catch (e: Throwable) {
        false
      }
    }
  }

  /** Vrátí režim, jaký byl před procedurou. Bez uloženého nedělá nic. */
  private fun vrat() {
    try {
      if (!spravce.isNotificationPolicyAccessGranted) return
      // INTERRUPTION_FILTER_UNKNOWN je nula, takže se nedá splést
      // s žádným skutečným režimem.
      val predchozi = pamet.getInt(KLIC_PREDCHOZI, NotificationManager.INTERRUPTION_FILTER_UNKNOWN)
      if (predchozi == NotificationManager.INTERRUPTION_FILTER_UNKNOWN) return
      spravce.setInterruptionFilter(predchozi)
      pamet.edit().remove(KLIC_PREDCHOZI).apply()
    } catch (e: Throwable) {
      // Telefon, který zůstal na Nerušit, je potíž — ale pád při startu
      // appky je větší.
    }
  }
}
