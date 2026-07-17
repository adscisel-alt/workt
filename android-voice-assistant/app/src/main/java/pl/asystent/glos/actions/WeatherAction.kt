package pl.asystent.glos.actions

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import android.location.LocationManager
import android.os.Handler
import android.os.Looper
import androidx.core.content.ContextCompat
import org.json.JSONObject
import pl.asystent.glos.Action
import java.net.HttpURLConnection
import java.net.URL
import kotlin.concurrent.thread

/**
 * "Jaka pogoda", "ile stopni" — pobiera bieżącą pogodę z Open-Meteo
 * (darmowe, bez klucza API) dla ostatniej znanej lokalizacji urządzenia.
 * Gdy brak lokalizacji, używa Warszawy jako wartości domyślnej.
 */
class WeatherAction : Action {

    override val name = "pogoda"

    private val triggers = listOf("pogod", "temperatur", "ile stopni", "deszcz", "słońce")
    private val main = Handler(Looper.getMainLooper())

    override fun matches(input: String): Boolean = triggers.any { input.contains(it) }

    override fun run(context: Context, input: String, onDone: (String) -> Unit) {
        val (lat, lon, place) = lastLocation(context)
        thread {
            val result = runCatching { fetch(lat, lon) }.getOrNull()
            val message = if (result == null) {
                "Nie udało się pobrać pogody. Sprawdź połączenie z internetem."
            } else {
                val (temp, code) = result
                "W lokalizacji $place jest ${temp.toInt()} stopni, ${describe(code)}."
            }
            main.post { onDone(message) }
        }
    }

    private fun fetch(lat: Double, lon: Double): Pair<Double, Int> {
        val url = URL(
            "https://api.open-meteo.com/v1/forecast" +
                "?latitude=$lat&longitude=$lon&current=temperature_2m,weather_code"
        )
        val conn = (url.openConnection() as HttpURLConnection).apply {
            connectTimeout = 8000
            readTimeout = 8000
        }
        conn.inputStream.bufferedReader().use { reader ->
            val json = JSONObject(reader.readText())
            val current = json.getJSONObject("current")
            return current.getDouble("temperature_2m") to current.getInt("weather_code")
        }
    }

    private fun lastLocation(context: Context): Triple<Double, Double, String> {
        val fine = ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_FINE_LOCATION)
        val coarse = ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_COARSE_LOCATION)
        if (fine != PackageManager.PERMISSION_GRANTED && coarse != PackageManager.PERMISSION_GRANTED) {
            return WARSAW
        }
        val lm = context.getSystemService(Context.LOCATION_SERVICE) as LocationManager
        val loc = try {
            lm.getProviders(true).asSequence()
                .mapNotNull { lm.getLastKnownLocation(it) }
                .maxByOrNull { it.time }
        } catch (e: SecurityException) {
            null
        }
        return if (loc != null) Triple(loc.latitude, loc.longitude, "Twojej okolicy") else WARSAW
    }

    /** Kody pogodowe WMO na krótki opis po polsku. */
    private fun describe(code: Int): String = when (code) {
        0 -> "bezchmurnie"
        1, 2 -> "częściowe zachmurzenie"
        3 -> "pochmurno"
        45, 48 -> "mgła"
        in 51..57 -> "mżawka"
        in 61..67 -> "deszcz"
        in 71..77 -> "śnieg"
        in 80..82 -> "przelotne opady"
        in 95..99 -> "burza"
        else -> "zmienna pogoda"
    }

    private companion object {
        val WARSAW = Triple(52.2297, 21.0122, "Warszawy")
    }
}
