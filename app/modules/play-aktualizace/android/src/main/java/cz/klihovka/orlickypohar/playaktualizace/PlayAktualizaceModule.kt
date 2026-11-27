package cz.klihovka.orlickypohar.playaktualizace

import android.app.Activity
import android.os.Handler
import android.os.Looper
import com.google.android.play.core.appupdate.AppUpdateInfo
import com.google.android.play.core.appupdate.AppUpdateManager
import com.google.android.play.core.appupdate.AppUpdateManagerFactory
import com.google.android.play.core.appupdate.AppUpdateOptions
import com.google.android.play.core.install.InstallException
import com.google.android.play.core.install.model.AppUpdateType
import com.google.android.play.core.install.model.UpdateAvailability
import expo.modules.kotlin.Promise
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.functions.Queues
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.util.concurrent.atomic.AtomicBoolean

/** Jak dlouho se čeká, než Obchod Play řekne, co nabízí. Na samotný tok limit není. */
private const val LIMIT_MS = 10_000L

/**
 * Aktualizace z Google Play přímo v appce — jen Android.
 *
 * Filip, 26. 11. 2026: *„aby se ta apka aktualizovala sama… je to must."*
 * Aktualizace po síti nese jen JavaScript. Nový nativní balíček smí do
 * telefonu přinést jedině Play, a tenhle modul ho o to požádá přímo
 * z appky, místo aby člověk hledal stránku v obchodě.
 *
 * Na čem to stojí:
 *
 *  1. Nic nespouští samo. Typ je vždycky IMMEDIATE a jen na klepnutí:
 *     celá obrazovka od Play, který appku po instalaci sám restartuje.
 *     Appka běží na vodě během startu a blokující obrazovka by tam byla
 *     horší než stará verze.
 *  2. Při startu se Play jen ptá, a to z JavaScriptu (pruh o nové verzi
 *     v kořenovém rozvržení volá `zjisti`). Správce vzniká líně při tom
 *     prvním dotazu, žádné `OnCreate`. Hotová knihovna `expo-in-app-updates`
 *     ho vytvářela při každém startu mimo ošetření chyb.
 *  3. Každá chyba končí odmítnutým slibem, ne pádem — chytá se `Throwable`,
 *     protože posluchače `Task` běží na hlavním vlákně mimo Expo a `Error`
 *     z nekompatibilní knihovny by jinak appku shodil (nález kontroly
 *     27. 11. 2026).
 *  4. Dotaz na Play má limit; tok ne. Služba Obchodu Play umí nechat
 *     požadavek ve frontě, dokud se nepřipojí — bez limitu by tlačítko
 *     viselo a nic neřeklo. Na tok limit není: po úspěchu se slib nevyřeší
 *     vůbec, protože Play appku restartuje.
 */
class PlayAktualizaceModule : Module() {
  private val spravce: AppUpdateManager by lazy {
    AppUpdateManagerFactory.create(
      (appContext.reactContext ?: throw Exceptions.ReactContextLost()).applicationContext,
    )
  }

  /** Běží tok? Druhé klepnutí by otevřelo druhou obrazovku Play nad první. */
  private val tokBezi = AtomicBoolean(false)

  override fun definition() = ModuleDefinition {
    Name("PlayAktualizace")

    // Jen se zeptá, nic nespouští.
    AsyncFunction("zjisti") { promise: Promise ->
      sInfem(promise, {}) { info -> promise.resolve(popis(info)) }
    }.runOnQueue(Queues.MAIN)

    // Jen na klepnutí. Pokaždé čerstvé AppUpdateInfo: Google dovoluje
    // jedno spuštění toku na jedno info.
    AsyncFunction("spust") { promise: Promise ->
      if (!tokBezi.compareAndSet(false, true)) {
        // Už běží: tohle volání nespustilo nic, JS nemá co dělat.
        promise.resolve("zruseno")
        return@AsyncFunction
      }
      sInfem(promise, { tokBezi.set(false) }) { info -> spustTok(info, promise) }
    }.runOnQueue(Queues.MAIN)
  }

  /**
   * Zeptá se Play na čerstvé info s limitem. `naChybe` se zavolá, když
   * dotaz skončí chybou nebo limitem — ne po úspěchu, ten řeší `telo`.
   */
  private fun sInfem(promise: Promise, naChybe: () -> Unit, telo: (AppUpdateInfo) -> Unit) {
    val vyrizeno = AtomicBoolean(false)
    val hlavni = Handler(Looper.getMainLooper())
    val limit = Runnable {
      if (vyrizeno.compareAndSet(false, true)) {
        naChybe()
        promise.reject("PLAY_LIMIT", "Obchod Play neodpověděl včas.", null)
      }
    }
    hlavni.postDelayed(limit, LIMIT_MS)
    try {
      spravce.appUpdateInfo
        .addOnSuccessListener { info ->
          if (!vyrizeno.compareAndSet(false, true)) return@addOnSuccessListener
          hlavni.removeCallbacks(limit)
          try {
            telo(info)
          } catch (e: Throwable) {
            naChybe()
            odmitni(promise, e)
          }
        }
        .addOnFailureListener { e ->
          if (!vyrizeno.compareAndSet(false, true)) return@addOnFailureListener
          hlavni.removeCallbacks(limit)
          naChybe()
          odmitni(promise, e)
        }
    } catch (e: Throwable) {
      // Synchronní chyba (líný správce bez kontextu): limit uklidit a odmítnout.
      if (vyrizeno.compareAndSet(false, true)) {
        hlavni.removeCallbacks(limit)
        naChybe()
        odmitni(promise, e)
      }
    }
  }

  private fun popis(info: AppUpdateInfo): Map<String, Any?> {
    val druh = when (info.updateAvailability()) {
      UpdateAvailability.UPDATE_AVAILABLE -> "nabizi"
      UpdateAvailability.DEVELOPER_TRIGGERED_UPDATE_IN_PROGRESS -> "probiha"
      UpdateAvailability.UPDATE_NOT_AVAILABLE -> "nic"
      // UNKNOWN: Play neví. Není to „nic nového" — o tom pak rozhoduje
      // seznam vydání z našeho API.
      else -> "nejde"
    }
    // Bez nabídky vrací availableVersionCode() libovolnou hodnotu.
    val cislo: Int? = if (druh == "nabizi" || druh == "probiha") info.availableVersionCode() else null
    return mapOf(
      "druh" to druh,
      "cisloBalicku" to cislo,
      "okamzita" to info.isUpdateTypeAllowed(AppUpdateType.IMMEDIATE),
    )
  }

  private fun spustTok(info: AppUpdateInfo, promise: Promise) {
    val volby = AppUpdateOptions.newBuilder(AppUpdateType.IMMEDIATE).build()
    val dostupnost = info.updateAvailability()
    val probiha = dostupnost == UpdateAvailability.DEVELOPER_TRIGGERED_UPDATE_IN_PROGRESS
    val nabizi = dostupnost == UpdateAvailability.UPDATE_AVAILABLE && info.isUpdateTypeAllowed(volby)
    if (!probiha && !nabizi) {
      tokBezi.set(false)
      promise.resolve("nepovoleno")
      return
    }
    // Aktivita až teď, těsně před tokem: mezi klepnutím a odpovědí Play
    // mohla appka odejít do pozadí a start aktivity by Android zahodil.
    val aktivita: Activity? = appContext.currentActivity
    if (aktivita == null) {
      tokBezi.set(false)
      promise.reject("PLAY_BEZ_AKTIVITY", "Appka není v popředí.", null)
      return
    }
    // Po úspěšné instalaci se slib nevyřeší vůbec: Play appku restartuje.
    spravce.startUpdateFlow(info, aktivita, volby)
      .addOnSuccessListener { kod ->
        tokBezi.set(false)
        try {
          promise.resolve(vysledek(kod))
        } catch (e: Throwable) {
          odmitni(promise, e)
        }
      }
      .addOnFailureListener { e ->
        tokBezi.set(false)
        odmitni(promise, e)
      }
  }

  private fun vysledek(kod: Int?): String =
    when (kod) {
      Activity.RESULT_OK -> "prijato"
      Activity.RESULT_CANCELED -> "zruseno"
      else -> "selhalo"
    }

  private fun odmitni(promise: Promise, e: Throwable) {
    try {
      val kod = (e as? InstallException)?.errorCode
      promise.reject(if (kod != null) "PLAY_$kod" else "PLAY_CHYBA", e.message, e)
    } catch (ignorovano: Throwable) {
      // Slib už je vyřízený nebo appka zaniká — tady už se nic dělat nedá.
    }
  }
}
