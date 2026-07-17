package pl.asystent.glos.actions

import android.content.Context
import android.content.Intent
import pl.asystent.glos.Action

/**
 * "Sprawdź pocztę", "otwórz maile" — otwiera domyślną aplikację poczty.
 * (Bezpośredni odczyt treści maili wymaga Gmail API / OAuth — to kolejny krok.)
 */
class EmailAction : Action {

    override val name = "poczta"

    private val triggers = listOf("poczt", "mail", "e-mail", "email", "skrzynk", "wiadomości")

    override fun matches(input: String): Boolean = triggers.any { input.contains(it) }

    override fun run(context: Context, input: String, onDone: (String) -> Unit) {
        val intent = Intent(Intent.ACTION_MAIN).apply {
            addCategory(Intent.CATEGORY_APP_EMAIL)
            flags = Intent.FLAG_ACTIVITY_NEW_TASK
        }
        if (intent.resolveActivity(context.packageManager) != null) {
            context.startActivity(intent)
            onDone("Otwieram pocztę.")
        } else {
            onDone("Nie znalazłem aplikacji pocztowej na tym urządzeniu.")
        }
    }
}
