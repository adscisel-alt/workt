package pl.asystent.glos.actions

import android.content.Context
import android.content.Intent
import android.provider.MediaStore
import pl.asystent.glos.Action

/**
 * "Włącz muzykę", "zagraj Dawida Podsiadło" — przekazuje zapytanie do
 * domyślnego odtwarzacza przez systemowy intent MEDIA_PLAY_FROM_SEARCH
 * (obsługują go Spotify, YouTube Music, odtwarzacz Google itd.).
 */
class MusicAction : Action {

    override val name = "muzyka"

    private val triggers = listOf("muzyk", "graj", "zagraj", "włącz piosenk", "puść", "spotify")

    override fun matches(input: String): Boolean = triggers.any { input.contains(it) }

    override fun run(context: Context, input: String, onDone: (String) -> Unit) {
        val query = extractQuery(input)
        val intent = Intent(MediaStore.INTENT_ACTION_MEDIA_PLAY_FROM_SEARCH).apply {
            putExtra(MediaStore.EXTRA_MEDIA_FOCUS, "vnd.android.cursor.item/*")
            if (query.isNotBlank()) putExtra(SearchManagerQuery.QUERY, query)
            flags = Intent.FLAG_ACTIVITY_NEW_TASK
        }
        if (intent.resolveActivity(context.packageManager) != null) {
            context.startActivity(intent)
            onDone(if (query.isBlank()) "Włączam muzykę." else "Włączam: $query.")
        } else {
            onDone("Nie znalazłem aplikacji do odtwarzania muzyki.")
        }
    }

    /** Wytnij słowa-wyzwalacze, zostaw to, co użytkownik chce usłyszeć. */
    private fun extractQuery(input: String): String {
        var q = input
        for (t in listOf("włącz", "zagraj", "graj", "puść", "muzykę", "muzyka", "piosenkę", "na spotify", "spotify")) {
            q = q.replace(t, " ")
        }
        return q.trim().replace(Regex("\\s+"), " ")
    }

    /** MediaStore.EXTRA_MEDIA_... nie zawiera stałej na sam query — używamy SearchManager. */
    private object SearchManagerQuery {
        const val QUERY = "query"
    }
}
