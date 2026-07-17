package pl.asystent.glos

import android.content.Context
import pl.asystent.glos.actions.EmailAction
import pl.asystent.glos.actions.LearnAction
import pl.asystent.glos.actions.MusicAction
import pl.asystent.glos.actions.NetworkAction
import pl.asystent.glos.actions.WeatherAction

/**
 * Kieruje rozpoznaną komendę do pierwszej pasującej akcji.
 * Dopisanie nowej umiejętności = dodanie jednej pozycji do listy [actions].
 */
class CommandRouter(private val context: Context) {

    private val actions: List<Action> = listOf(
        MusicAction(),
        NetworkAction(),
        WeatherAction(),
        EmailAction(),
        LearnAction(),
    )

    fun handle(rawInput: String, onDone: (String) -> Unit) {
        val input = rawInput.trim().lowercase()
        val action = actions.firstOrNull { it.matches(input) }
        if (action == null) {
            onDone(helpText())
            return
        }
        action.run(context, input, onDone)
    }

    private fun helpText(): String {
        val list = actions.joinToString(", ") { it.name }
        return "Nie rozpoznałem polecenia. Potrafię: $list. " +
            "Powiedz na przykład: jaka jest pogoda, sprawdź sieć albo włącz muzykę."
    }
}
