package pl.asystent.glos

import android.content.Context

/**
 * Pojedyncza umiejętność asystenta. Router pyta [matches], a jeśli pasuje —
 * wywołuje [run]. Wynik (tekst do wypowiedzenia) wraca przez [onDone],
 * bo część akcji (pogoda, sieć) działa asynchronicznie.
 */
interface Action {
    /** Krótka nazwa do listy "co potrafię". */
    val name: String

    fun matches(input: String): Boolean

    fun run(context: Context, input: String, onDone: (String) -> Unit)
}
